import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      supabaseConfig: false,
      supabaseConnection: false,
      databaseTables: false,
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

    // 4. Overall status
    const allChecksPass = Object.values(checks.checks).every(check => check === true);
    const status = allChecksPass ? 200 : 503;

    return NextResponse.json(
      {
        ...checks,
        status: allChecksPass ? 'healthy' : 'degraded',
        message: allChecksPass
          ? 'All systems operational'
          : 'Some checks failed - see details',
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
