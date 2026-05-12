import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function probeExternal(name: string, url: string, headers: Record<string, string> = {}): Promise<'ok' | 'error'> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 2_000)
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal })
    clearTimeout(t)
    // 401/403 means the service is up; 5xx means it's degraded
    return res.status < 500 ? 'ok' : 'error'
  } catch {
    clearTimeout(t)
    return 'error'
  }
}

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      supabaseConfig: false,
      supabaseConnection: false,
      databaseTables: false,
      groq: false,
      anthropic: false,
    },
    details: {} as Record<string, unknown>,
  };

  try {
    // 1. Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-supabase-url-here') {
      checks.checks.supabaseConfig = true;
      checks.details.supabaseUrl = supabaseUrl;
    } else {
      checks.details.supabaseConfig = 'Environment variables not set';
      return NextResponse.json(checks, { status: 503 });
    }

    // 2. Check Supabase connection
    try {
      const supabase = await createClient();

      // Try to query auth status (doesn't require tables)
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (!authError) {
        checks.checks.supabaseConnection = true;
        checks.details.auth = session ? 'Authenticated session found' : 'No active session';
      } else {
        checks.details.connectionError = authError.message;
      }
    } catch (error) {
      checks.details.connectionError = (error as Error).message;
    }

    // 3. Check database tables
    if (checks.checks.supabaseConnection) {
      try {
        const supabase = await createClient();
        const tablesToCheck = [
          'founder_profiles',
          'qscore_assessments',
          'qscore_history',
          'agent_conversations',
          'subscription_usage',
        ];

        const tableStatus: Record<string, string> = {};

        for (const table of tablesToCheck) {
          try {
            const { error } = await supabase.from(table).select('id').limit(1);
            tableStatus[table] = error ? `❌ ${error.message}` : '✅ Accessible';
          } catch (e) {
            tableStatus[table] = `❌ ${(e as Error).message}`;
          }
        }

        checks.details.tables = tableStatus;

        // Check if all tables are accessible
        const allTablesOk = Object.values(tableStatus).every((status) => status.includes('✅'));
        checks.checks.databaseTables = allTablesOk;

      } catch (error) {
        checks.details.databaseError = (error as Error).message;
      }
    }

    // 4. Probe external LLM providers (non-blocking, 2s timeout each)
    const [groqStatus, anthropicStatus] = await Promise.all([
      process.env.GROQ_API_KEY
        ? probeExternal('groq', 'https://api.groq.com/openai/v1/models', { Authorization: `Bearer ${process.env.GROQ_API_KEY}` })
        : Promise.resolve('ok' as const),
      process.env.ANTHROPIC_API_KEY
        ? probeExternal('anthropic', 'https://api.anthropic.com/v1/models', { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' })
        : Promise.resolve('ok' as const),
    ])
    checks.checks.groq      = groqStatus      === 'ok'
    checks.checks.anthropic = anthropicStatus === 'ok'
    checks.details.externalServices = { groq: groqStatus, anthropic: anthropicStatus }

    // 5. Overall status
    const coreChecksPass = checks.checks.supabaseConfig && checks.checks.supabaseConnection && checks.checks.databaseTables;
    const allChecksPass  = coreChecksPass && checks.checks.groq && checks.checks.anthropic;
    const status = coreChecksPass ? (allChecksPass ? 200 : 200) : 503;

    return NextResponse.json(
      {
        ...checks,
        status: allChecksPass ? 'healthy' : coreChecksPass ? 'degraded' : 'unhealthy',
        message: allChecksPass
          ? 'All systems operational'
          : coreChecksPass
          ? 'Core systems ok; some external services degraded'
          : 'Core system checks failed — see details',
      },
      { status }
    );

  } catch (error) {
    return NextResponse.json(
      {
        ...checks,
        status: 'error',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
