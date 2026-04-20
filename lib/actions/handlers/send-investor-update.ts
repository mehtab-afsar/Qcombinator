import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface InvestorUpdateArgs {
  subject?: string;
  body?: string;
  /** Comma-separated or array of investor emails to send to */
  investorEmails?: string | string[];
}

export async function handler(
  userId: string,
  args: unknown,
  supabase: SupabaseClient,
): Promise<{ sent: number; skipped: number }> {
  const { subject, body, investorEmails } = (args ?? {}) as InvestorUpdateArgs;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  // Resolve recipient list: arg → founder_profiles → error
  let recipients: string[] = [];
  if (investorEmails) {
    recipients = Array.isArray(investorEmails)
      ? investorEmails
      : investorEmails.split(',').map(e => e.trim()).filter(Boolean);
  } else {
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('investor_emails')
      .eq('user_id', userId)
      .maybeSingle();
    const raw = (profile as { investor_emails?: string | string[] } | null)?.investor_emails;
    if (raw) {
      recipients = Array.isArray(raw) ? raw : raw.split(',').map(e => e.trim()).filter(Boolean);
    }
  }

  if (recipients.length === 0) throw new Error('No investor emails configured. Add them to your founder profile.');

  const resend = new Resend(apiKey);
  let sent = 0;
  let skipped = 0;

  await Promise.allSettled(
    recipients.map(async (email) => {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'updates@edgealpha.ai',
          to: email,
          subject: subject ?? 'Investor Update',
          text: body ?? '',
        });
        sent++;
      } catch {
        skipped++;
      }
    })
  );

  void supabase.from('agent_activity').insert({
    user_id: userId,
    agent_id: 'felix',
    action_type: 'investor_update_sent',
    description: `Investor update sent to ${sent} recipient(s)`,
    metadata: { sent, skipped, subject },
  });

  return { sent, skipped };
}
