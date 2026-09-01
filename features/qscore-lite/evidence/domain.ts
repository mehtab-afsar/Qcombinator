/**
 * Normalizes a submitted URL/domain into a stable cache key: lowercased host, no protocol, no
 * "www.", no path/query. "acme.com", "https://www.Acme.com/pricing?x=1", and "http://ACME.COM"
 * all normalize to "acme.com".
 */
export function normalizeDomain(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`
  const url = new URL(withProtocol)
  let host = url.hostname.toLowerCase()
  if (host.startsWith('www.')) host = host.slice(4)
  return host
}
