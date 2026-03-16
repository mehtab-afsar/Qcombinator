/**
 * Deals data access layer.
 * Wraps deals table.
 */

import { createClient } from '@/lib/supabase/server';

export interface Deal {
  id: string;
  user_id: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_title: string | null;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiating' | 'won' | 'lost';
  value: number | null;
  notes: string | null;
  source: string | null;
  next_action_date: string | null;
  created_at: string;
}

const SELECT_FIELDS = 'id, user_id, company, contact_name, contact_email, contact_title, stage, value, notes, source, next_action_date, created_at';
const VALID_STAGES = ['lead', 'qualified', 'proposal', 'negotiating', 'won', 'lost'] as const;

export async function getDeals(userId: string): Promise<Deal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deals')
    .select(SELECT_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[data/deals] getDeals error:', error.message);
    return [];
  }
  return (data ?? []) as Deal[];
}

export async function createDeal(
  deal: Omit<Deal, 'id' | 'created_at'>,
): Promise<Deal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('deals')
    .insert({
      ...deal,
      stage: VALID_STAGES.includes(deal.stage) ? deal.stage : 'lead',
    })
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    console.error('[data/deals] createDeal error:', error.message);
    return null;
  }
  return data as Deal | null;
}

export async function updateDealStage(
  userId: string,
  dealId: string,
  stage: Deal['stage'],
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('deals')
    .update({ stage })
    .eq('id', dealId)
    .eq('user_id', userId);

  return !error;
}
