import type { SupabaseClient } from '@supabase/supabase-js';

/** Stub — extract logic from the relevant API route in a follow-up task. */
export async function handler(
  _userId: string,
  _args: unknown,
  _supabase: SupabaseClient,
): Promise<unknown> {
  throw new Error(`Handler "${__filename}" not yet implemented. Extract from the corresponding API route.`);
}
