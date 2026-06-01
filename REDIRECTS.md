# Redirect Map

All HTTP-level redirects configured in `next.config.ts` `redirects()`. These fire before any page component renders and apply to full-page loads only (not client-side `<Link>` navigation — page components handle that case separately).

All redirects use `permanent: false` (HTTP 307) so they can be changed without browser cache lock-in.

---

## Founder routes

| From | To | Reason |
|---|---|---|
| `/founder/workspace` | `/founder/cxo` | Route renamed — "workspace" became "cxo" hub |
| `/founder/pitch-deck` | `/founder/cxo/sage` | Pitch deck moved under Sage (CEO) agent |
| `/founder/metrics` | `/founder/dashboard` | Metrics tab absorbed into dashboard |
| `/founder/portfolio` | `/founder/dashboard` | Portfolio view absorbed into dashboard |
| `/founder/activity` | `/founder/messages` | Activity feed renamed to messages |
| `/founder/library` | `/founder/academy` | Library renamed to Academy |
| `/founder/startup-profile` | `/founder/settings?tab=company` | Profile moved into settings under "Company" tab |

## Public routes

| From | To | Reason |
|---|---|---|
| `/library` | `/founder/academy` | Old public library URL — canonical path is now `/founder/academy` |

---

## Page-level redirects (client-side navigation)

These live in page components and handle `<Link href="...">` client-side navigation to the same old paths:

| Page component | Redirects to |
|---|---|
| `app/founder/library/page.tsx` | `/founder/academy` |
| `app/investor/page.tsx` | `/investor/dashboard` |
| `app/founder/page.tsx` | `/founder/dashboard` |
