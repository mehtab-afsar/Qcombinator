import { z } from 'zod'

export const qScoreLiteSubmitSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(120),
  // Accepts a bare domain ("acme.com") as well as a full URL — a founder is far more likely to
  // type the former. https:// is prepended before validating if no protocol is present; matches
  // signupSchema's own looseness on the `website` field (lib/api/validate.ts).
  url: z.string().trim().min(1, 'Website URL is required').max(2083)
    .refine(v => {
      try {
        new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
        return true
      } catch {
        return false
      }
    }, 'Enter a valid website URL'),
})

export type QScoreLiteSubmitInput = z.infer<typeof qScoreLiteSubmitSchema>
