import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// GET /api/cron/weekly-automation
// Triggered every Monday at 9am UTC via Vercel Cron.
// Sends weekly OKR standups + runway alerts to all active founders.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai';

export async function GET(request: Request) {
  // Verify cron secret — Vercel sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  const results = { usersProcessed: 0, standupsSent: 0, runwayAlerts: 0, errors: 0 };

  // List all users via admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError || !users) {
    console.error('Cron: failed to list users:', listError);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }

  for (const user of users) {
    if (!user.email) continue;
    results.usersProcessed++;

    // ── Weekly OKR Standup (Sage) ──────────────────────────────────────
    try {
      const { data: planArtifact } = await supabase
        .from('agent_artifacts')
        .select('content')
        .eq('user_id', user.id)
        .eq('artifact_type', 'strategic_plan')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planArtifact?.content) {
        const plan = planArtifact.content as Record<string, unknown>;
        const okrs = (plan.okrs as Array<{
          objective: string;
          keyResults: { kr: string; target: string; metric: string }[];
        }>) ?? [];

        const okrRows = okrs.map((o, i) => `
          <tr style="background:${i % 2 === 0 ? '#F9F7F2' : '#fff'}">
            <td colspan="3" style="padding:10px 14px;font-weight:600;color:#18160F;font-size:13px;border-bottom:1px solid #E2DDD5">${o.objective}</td>
          </tr>
          ${(o.keyResults ?? []).map(kr => `
            <tr style="background:${i % 2 === 0 ? '#F9F7F2' : '#fff'}">
              <td style="padding:6px 14px 6px 28px;font-size:12px;color:#555;border-bottom:1px solid #E2DDD5">• ${kr.kr}</td>
              <td style="padding:6px 14px;font-size:12px;color:#2563EB;border-bottom:1px solid #E2DDD5;white-space:nowrap">${kr.target}</td>
              <td style="padding:6px 14px;font-size:12px;color:#8A867C;border-bottom:1px solid #E2DDD5">${kr.metric}</td>
            </tr>
          `).join('')}
        `).join('');

        const founderName = user.user_metadata?.full_name ?? user.email.split('@')[0];
        const companyName = (plan.companyName as string) ?? 'your startup';

        await resend.emails.send({
          from: 'Sage — Edge Alpha <noreply@edgealpha.ai>',
          to: user.email,
          subject: `Weekly check-in: how are ${companyName}'s OKRs tracking?`,
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:580px;margin:0 auto;color:#18160F">
              <div style="background:#F9F7F2;border-bottom:1px solid #E2DDD5;padding:20px 28px;display:flex;align-items:center;gap:10px">
                <span style="font-size:18px;font-weight:800;letter-spacing:-0.5px">Edge Alpha</span>
                <span style="color:#8A867C;font-size:13px">· Weekly OKR check-in</span>
              </div>
              <div style="padding:28px">
                <p style="font-size:15px;font-weight:600;margin-bottom:6px">Hi ${founderName},</p>
                <p style="font-size:14px;color:#555;margin-bottom:20px">Here's your weekly OKR snapshot for <b>${companyName}</b>. How are you tracking against your goals?</p>
                <table style="width:100%;border-collapse:collapse;border:1px solid #E2DDD5;border-radius:8px;overflow:hidden">
                  <thead>
                    <tr style="background:#F0EDE6">
                      <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;border-bottom:1px solid #E2DDD5">Key Result</th>
                      <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;border-bottom:1px solid #E2DDD5">Target</th>
                      <th style="padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;border-bottom:1px solid #E2DDD5">Metric</th>
                    </tr>
                  </thead>
                  <tbody>${okrRows || '<tr><td colspan="3" style="padding:14px;color:#8A867C;text-align:center">No OKRs set yet</td></tr>'}</tbody>
                </table>
                <div style="margin-top:20px;padding:16px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px">
                  <p style="font-size:13px;font-weight:600;color:#1D4ED8;margin-bottom:4px">Reply to this email with your weekly progress</p>
                  <p style="font-size:12px;color:#3B82F6">Tell Sage how you're tracking — wins, blockers, and what to focus on next week.</p>
                </div>
                <div style="margin-top:20px;text-align:center">
                  <a href="${APP_URL}/founder/agents/sage" style="display:inline-block;padding:11px 24px;background:#18160F;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Update OKRs in Sage →</a>
                </div>
              </div>
              <div style="padding:16px 28px;background:#F0EDE6;border-top:1px solid #E2DDD5">
                <p style="font-size:11px;color:#8A867C;margin:0">You're receiving this because you have an active strategic plan in Edge Alpha. <a href="${APP_URL}/founder/settings" style="color:#8A867C">Manage preferences</a></p>
              </div>
            </div>
          `,
        });

        results.standupsSent++;
      }
    } catch (err) {
      console.error(`Cron standup error for user ${user.id}:`, err);
      results.errors++;
    }

    // ── Runway Alert (Felix) ──────────────────────────────────────────
    try {
      const { data: finArtifact } = await supabase
        .from('agent_artifacts')
        .select('content')
        .eq('user_id', user.id)
        .eq('artifact_type', 'financial_summary')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (finArtifact?.content) {
        const fin = finArtifact.content as Record<string, unknown>;
        const snapshot = fin.snapshot as Record<string, string> | undefined;
        const runwayStr = snapshot?.runway ?? '';
        // Parse "4.2 months", "4 months", "Pre-revenue", etc.
        const runwayMonths = parseFloat(runwayStr.replace(/[^0-9.]/g, ''));

        if (!isNaN(runwayMonths) && runwayMonths > 0 && runwayMonths < 6) {
          const urgency = runwayMonths < 3 ? 'critical' : 'warning';
          const founderName = user.user_metadata?.full_name ?? user.email.split('@')[0];

          await resend.emails.send({
            from: 'Felix — Edge Alpha <noreply@edgealpha.ai>',
            to: user.email,
            subject: `${urgency === 'critical' ? '🚨' : '⚠️'} Runway alert: ${runwayStr} remaining`,
            html: `
              <div style="font-family:system-ui,-apple-system,sans-serif;max-width:580px;margin:0 auto;color:#18160F">
                <div style="background:#FEF2F2;border-bottom:1px solid #FECACA;padding:20px 28px">
                  <span style="font-size:18px;font-weight:800">Edge Alpha</span>
                  <span style="color:#DC2626;font-size:13px;margin-left:10px">· Runway alert</span>
                </div>
                <div style="padding:28px">
                  <p style="font-size:15px;font-weight:600;margin-bottom:6px">Hi ${founderName},</p>
                  <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                    <p style="font-size:20px;font-weight:800;color:#DC2626;margin-bottom:4px">${runwayStr} of runway remaining</p>
                    <p style="font-size:13px;color:#B91C1C">Based on your latest financial summary in Felix — you should be actively fundraising or cutting costs now.</p>
                  </div>
                  <p style="font-size:14px;color:#555;margin-bottom:16px">Felix's recommendations:</p>
                  <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:20px">
                    <li>Identify the 3 biggest monthly expenses and evaluate each for cuts</li>
                    <li>Start fundraising conversations now — not in 2 months</li>
                    <li>Consider revenue-based milestones to bridge to next round</li>
                    <li>Review burn rate weekly — small changes compound fast</li>
                  </ul>
                  <div style="margin-top:20px;text-align:center">
                    <a href="${APP_URL}/founder/agents/felix" style="display:inline-block;padding:11px 24px;background:#DC2626;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Talk to Felix about this →</a>
                  </div>
                </div>
              </div>
            `,
          });

          results.runwayAlerts++;
        }
      }
    } catch (err) {
      console.error(`Cron runway alert error for user ${user.id}:`, err);
      results.errors++;
    }
  }

  console.log('Weekly automation complete:', results);
  return NextResponse.json(results);
}
