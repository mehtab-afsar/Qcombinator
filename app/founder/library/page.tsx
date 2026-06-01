import { redirect } from 'next/navigation'

// HTTP requests are already redirected by next.config.ts redirects().
// This handles client-side Link navigation to /founder/library.
export default function FounderLibrary() {
  redirect('/founder/academy')
}
