import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { encodeToken } from '@/app/api/unsubscribe/route';
import { log } from '@/lib/logger'

// Stale deal threshold: deals not updated in 7+ days (non-terminal stages)
const STALE_DEAL_DAYS = 7;
const CHURN_ALERT_THRESHOLD = 8;       // % monthly churn → alert
const RETENTION_ALERT_THRESHOLD = 30;  // % Day-30 retention → alert if below this

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

  const results = { usersProcessed: 0, standupsSent: 0, runwayAlerts: 0, churnAlerts: 0, staleDealAlerts: 0, errors: 0 };

  // Query founders who have completed onboarding directly from the DB —
  // avoids the O(n) admin.listUsers() call (paginates all auth users).
  // notification_preferences->weeklyDigest defaults to true unless explicitly false
  const { data: founders, error: listError } = await supabase
    .from('founder_profiles')
    .select('user_id, full_name, notification_preferences')
    .eq('onboarding_completed', true)
    .eq('role', 'founder')
    .limit(500);

  if (listError || !founders) {
    log.error('Cron: failed to list founders:', listError);
    return NextResponse.json({ error: 'Failed to list founders' }, { status: 500 });
  }

  const founderIds = founders.map(f => f.user_id);

  const staleThreshold = new Date(Date.now() - STALE_DEAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Fetch emails + artifact types + startup_state + stale deals in parallel
  const [{ data: authUsers }, { data: planRows }, { data: finRows }, { data: stateRows }, { data: staleDeals }] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase
      .from('agent_artifacts')
      .select('user_id, content, created_at')
      .in('user_id', founderIds)
      .eq('artifact_type', 'strategic_plan')
      .order('created_at', { ascending: false }),
    supabase
      .from('agent_artifacts')
      .select('user_id, content, created_at')
      .in('user_id', founderIds)
      .eq('artifact_type', 'financial_summary')
      .order('created_at', { ascending: false }),
    supabase
      .from('startup_state')
      .select('user_id, runway_months, churn_rate, day30_retention, mrr')
      .in('user_id', founderIds),
    supabase
      .from('deals')
      .select('user_id, company, stage, updated_at')
      .in('user_id', founderIds)
      .not('stage', 'in', '("won","lost")')
      .lt('updated_at', staleThreshold),
  ]);

  const emailByUid = new Map<string, string>();
  for (const u of authUsers?.users ?? []) {
    if (u.email) emailByUid.set(u.id, u.email);
  }

  // Pick the latest artifact per user (rows already ordered desc)
  const planByUid = new Map<string, Record<string, unknown>>();
  for (const row of planRows ?? []) {
    if (!planByUid.has(row.user_id) && row.content) planByUid.set(row.user_id, row.content as Record<string, unknown>);
  }
  const finByUid = new Map<string, Record<string, unknown>>();
  for (const row of finRows ?? []) {
    if (!finByUid.has(row.user_id) && row.content) finByUid.set(row.user_id, row.content as Record<string, unknown>);
  }

  // startup_state: one row per user
  const stateByUid = new Map<string, { runway_months: number | null; churn_rate: number | null; day30_retention: number | null; mrr: number | null }>();
  for (const row of stateRows ?? []) {
    stateByUid.set(row.user_id, row);
  }

  // stale deals grouped by user_id
  const staleByUid = new Map<string, { company: string; stage: string; updated_at: string }[]>();
  for (const deal of staleDeals ?? []) {
    const arr = staleByUid.get(deal.user_id) ?? [];
    arr.push(deal);
    staleByUid.set(deal.user_id, arr);
  }

  for (const founder of founders) {
    const email = emailByUid.get(founder.user_id);
    if (!email) continue;
    // Respect opt-out: weeklyDigest defaults to true unless explicitly set false
    const prefs = (founder.notification_preferences ?? {}) as Record<string, boolean>;
    if (prefs.weeklyDigest === false) continue;
    const user = { id: founder.user_id, email, user_metadata: { full_name: founder.full_name } };
    results.usersProcessed++;

    // ── Weekly OKR Standup (Sage) ──────────────────────────────────────
    try {
      const plan = planByUid.get(user.id);

      if (plan) {
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
                <p style="font-size:11px;color:#8A867C;margin:0">You're receiving this because you have an active strategic plan in Edge Alpha. <a href="${APP_URL}/founder/settings?tab=notifications" style="color:#8A867C">Manage preferences</a> · <a href="${APP_URL}/api/unsubscribe?token=${encodeToken(user.id, 'weekly')}" style="color:#8A867C">Unsubscribe</a></p>
              </div>
            </div>
          `,
        });

        results.standupsSent++;
      }
    } catch (err) {
      log.error(`Cron standup error for user ${user.id}:`, err);
      results.errors++;
    }

    // ── Runway Alert (Felix) ──────────────────────────────────────────
    try {
      const fin = finByUid.get(user.id);
      const state = stateByUid.get(user.id);

      if (prefs.runwayAlerts !== false) {
        // Prefer startup_state.runway_months (live, agent-updated) over artifact string parse
        let runwayMonths: number = NaN;
        let runwayStr = '';
        if (state?.runway_months != null && state.runway_months > 0) {
          runwayMonths = state.runway_months;
          runwayStr = `${runwayMonths} months`;
        } else if (fin) {
          const snapshot = fin.snapshot as Record<string, string> | undefined;
          runwayStr = snapshot?.runway ?? '';
          runwayMonths = parseFloat(runwayStr.replace(/[^0-9.]/g, ''));
        }

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
                  <p style="margin-top:16px;font-size:11px;color:#8A867C;text-align:center">
                    <a href="${APP_URL}/api/unsubscribe?token=${encodeToken(user.id, 'runway')}" style="color:#8A867C">Unsubscribe from runway alerts</a>
                  </p>
                </div>
              </div>
            `,
          });

          results.runwayAlerts++;
        }
      }
    } catch (err) {
      log.error(`Cron runway alert error for user ${user.id}:`, err);
      results.errors++;
    }

    // ── Churn Risk Alert (Carter) ─────────────────────────────────────
    try {
      const state = stateByUid.get(user.id);
      if (state && prefs.churnAlerts !== false) {
        const churnHigh = state.churn_rate != null && state.churn_rate >= CHURN_ALERT_THRESHOLD;
        const retentionLow = state.day30_retention != null && state.day30_retention < RETENTION_ALERT_THRESHOLD;

        if (churnHigh || retentionLow) {
          const founderName = user.user_metadata?.full_name ?? user.email.split('@')[0];
          const signals: string[] = [];
          if (churnHigh) signals.push(`Monthly churn: <b>${state.churn_rate}%</b> (threshold: ${CHURN_ALERT_THRESHOLD}%)`);
          if (retentionLow) signals.push(`Day-30 retention: <b>${state.day30_retention}%</b> (threshold: ${RETENTION_ALERT_THRESHOLD}%)`);

          await resend.emails.send({
            from: 'Carter — Edge Alpha <noreply@edgealpha.ai>',
            to: user.email,
            subject: `⚠️ Churn risk detected — action needed`,
            html: `
              <div style="font-family:system-ui,-apple-system,sans-serif;max-width:580px;margin:0 auto;color:#18160F">
                <div style="background:#FFF7ED;border-bottom:1px solid #FED7AA;padding:20px 28px">
                  <span style="font-size:18px;font-weight:800">Edge Alpha</span>
                  <span style="color:#EA580C;font-size:13px;margin-left:10px">· Churn risk alert</span>
                </div>
                <div style="padding:28px">
                  <p style="font-size:15px;font-weight:600;margin-bottom:6px">Hi ${founderName},</p>
                  <p style="font-size:14px;color:#555;margin-bottom:16px">Carter has detected retention signals that need your attention:</p>
                  <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:16px 20px;margin-bottom:20px">
                    ${signals.map(s => `<p style="font-size:14px;color:#9A3412;margin:6px 0">${s}</p>`).join('')}
                  </div>
                  <p style="font-size:14px;color:#555;margin-bottom:12px">Recommended actions:</p>
                  <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:20px">
                    <li>Identify your highest-risk accounts (low usage, no login in 7+ days)</li>
                    <li>Run a win-back check-in call with any accounts silent for 14+ days</li>
                    <li>Review your Day 7 onboarding flow — most churn is decided in the first week</li>
                    <li>Survey recent churned users — one conversation can unblock the pattern</li>
                  </ul>
                  <div style="margin-top:20px;text-align:center">
                    <a href="${APP_URL}/founder/agents/carter" style="display:inline-block;padding:11px 24px;background:#EA580C;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Talk to Carter about this →</a>
                  </div>
                  <p style="margin-top:16px;font-size:11px;color:#8A867C;text-align:center">
                    <a href="${APP_URL}/api/unsubscribe?token=${encodeToken(user.id, 'alerts')}" style="color:#8A867C">Unsubscribe from churn alerts</a>
                  </p>
                </div>
              </div>
            `,
          });

          results.churnAlerts++;
        }
      }
    } catch (err) {
      log.error(`Cron churn alert error for user ${user.id}:`, err);
      results.errors++;
    }

    // ── Stale Deal Alert (Susi) ───────────────────────────────────────
    try {
      const staleDealsForUser = staleByUid.get(user.id);
      if (staleDealsForUser && staleDealsForUser.length > 0 && prefs.dealAlerts !== false) {
        const founderName = user.user_metadata?.full_name ?? user.email.split('@')[0];
        const dealRows = staleDealsForUser
          .slice(0, 8)
          .map(d => {
            const daysStale = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            return `<tr>
              <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #E2DDD5">${d.company}</td>
              <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #E2DDD5;color:#8A867C;text-transform:capitalize">${d.stage}</td>
              <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #E2DDD5;color:#DC2626;font-weight:600">${daysStale}d stale</td>
            </tr>`;
          })
          .join('');

        await resend.emails.send({
          from: 'Susi — Edge Alpha <noreply@edgealpha.ai>',
          to: user.email,
          subject: `${staleDealsForUser.length} deal${staleDealsForUser.length > 1 ? 's' : ''} need follow-up`,
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:580px;margin:0 auto;color:#18160F">
              <div style="background:#F0FDF4;border-bottom:1px solid #BBF7D0;padding:20px 28px">
                <span style="font-size:18px;font-weight:800">Edge Alpha</span>
                <span style="color:#15803D;font-size:13px;margin-left:10px">· Pipeline alert from Susi</span>
              </div>
              <div style="padding:28px">
                <p style="font-size:15px;font-weight:600;margin-bottom:6px">Hi ${founderName},</p>
                <p style="font-size:14px;color:#555;margin-bottom:16px">
                  You have <b>${staleDealsForUser.length} deal${staleDealsForUser.length > 1 ? 's' : ''}</b> with no activity in over ${STALE_DEAL_DAYS} days. Deals die in silence — here's what needs a follow-up:
                </p>
                <table style="width:100%;border-collapse:collapse;border:1px solid #E2DDD5;border-radius:8px;overflow:hidden">
                  <thead>
                    <tr style="background:#F0EDE6">
                      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;border-bottom:1px solid #E2DDD5">Company</th>
                      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;border-bottom:1px solid #E2DDD5">Stage</th>
                      <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;border-bottom:1px solid #E2DDD5">Stale</th>
                    </tr>
                  </thead>
                  <tbody>${dealRows}</tbody>
                </table>
                <div style="margin-top:20px;padding:14px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px">
                  <p style="font-size:13px;font-weight:600;color:#15803D;margin-bottom:4px">Susi's follow-up tip</p>
                  <p style="font-size:12px;color:#166534">A simple "just checking in — any updates on your end?" has a 23% reply rate. Send it today.</p>
                </div>
                <div style="margin-top:20px;text-align:center">
                  <a href="${APP_URL}/founder/agents/susi" style="display:inline-block;padding:11px 24px;background:#15803D;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Work these deals with Susi →</a>
                </div>
                <p style="margin-top:16px;font-size:11px;color:#8A867C;text-align:center">
                  <a href="${APP_URL}/api/unsubscribe?token=${encodeToken(user.id, 'alerts')}" style="color:#8A867C">Unsubscribe from deal alerts</a>
                </p>
              </div>
            </div>
          `,
        });

        results.staleDealAlerts++;
      }
    } catch (err) {
      log.error(`Cron stale deal alert error for user ${user.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
