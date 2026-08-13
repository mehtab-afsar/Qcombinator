/**
 * The founder-facing display name for a startup.
 *
 * `founder_profiles.startup_name` carries a random 6-char suffix
 * (`${name}-${userId.slice(0, 6)}`, added in app/api/auth/signup/route.ts purely to satisfy a
 * DB uniqueness constraint when two founders pick the same company name) — it was never meant
 * to be shown to anyone. `company_name` is the clean name the founder actually typed. Every
 * investor-facing route was reading `startup_name` first, so investors saw names like
 * "edge-c52c48" instead of "Edge Alpha".
 */
export function getStartupDisplayName(profile: {
  company_name?: string | null
  startup_name?: string | null
  startup_profile_data?: { companyName?: string } | null
  full_name?: string | null
}): string {
  const clean = profile.company_name?.trim()
  if (clean) return clean

  const fromProfileData = profile.startup_profile_data?.companyName?.trim()
  if (fromProfileData) return fromProfileData

  // Older rows without company_name — strip the uniqueness suffix if it's there.
  const raw = profile.startup_name?.trim()
  if (raw) return raw.replace(/-[a-f0-9]{6}$/, '')

  return profile.full_name ? `${profile.full_name}'s Startup` : 'Unnamed'
}
