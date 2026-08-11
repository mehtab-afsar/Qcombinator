/**
 * Ensures a founder has a working /startup/[slug] public link — generates public_slug on
 * first use and flips is_public true. Both were columns that existed but nothing ever wrote to.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

/**
 * Idempotent — safe to call every time a founder opens the share flow, not just once.
 * Returns the slug to build `/startup/${slug}` from.
 */
export async function ensurePublicPortfolio(userId: string, admin: SupabaseClient): Promise<string> {
  const { data: profile } = await admin
    .from('founder_profiles')
    .select('public_slug, is_public, startup_name, company_name')
    .eq('user_id', userId)
    .single()

  if (profile?.public_slug) {
    if (!profile.is_public) {
      await admin.from('founder_profiles').update({ is_public: true }).eq('user_id', userId)
    }
    return profile.public_slug as string
  }

  const base = slugify((profile?.company_name || profile?.startup_name || 'founder') as string) || 'founder'

  // public_slug has a UNIQUE constraint — retry with a fresh random suffix on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${randomSuffix()}`
    const { error } = await admin
      .from('founder_profiles')
      .update({ public_slug: slug, is_public: true })
      .eq('user_id', userId)
    if (!error) return slug
    if (error.code !== '23505') {
      log.error('ensurePublicPortfolio: unexpected error writing public_slug', { userId, err: error })
      throw error
    }
  }
  throw new Error('Could not generate a unique public_slug after 5 attempts')
}
