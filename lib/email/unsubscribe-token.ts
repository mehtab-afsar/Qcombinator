/**
 * Unsubscribe token encoding/decoding.
 * Token = base64url(userId + ":" + type) — simple opt-out token with no JWT dependency.
 * Shared between the email send helpers and the /api/unsubscribe handler.
 */

export const VALID_UNSUB_TYPES = ['weekly', 'runway', 'alerts', 'all'] as const
export type UnsubType = typeof VALID_UNSUB_TYPES[number]

export const TYPE_KEY_MAP: Record<UnsubType, string[]> = {
  weekly:  ['weeklyDigest'],
  runway:  ['runwayAlerts'],
  alerts:  ['emailNotifications'],
  all:     ['emailNotifications', 'weeklyDigest', 'runwayAlerts', 'qScoreUpdates', 'investorMessages'],
}

export function encodeToken(userId: string, type: UnsubType): string {
  return Buffer.from(`${userId}:${type}`).toString('base64url')
}

export function decodeToken(token: string): { userId: string; type: UnsubType } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [userId, type] = decoded.split(':')
    if (!userId || !type) return null
    if (!VALID_UNSUB_TYPES.includes(type as UnsubType)) return null
    return { userId, type: type as UnsubType }
  } catch {
    return null
  }
}
