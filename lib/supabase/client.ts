import { createBrowserClient } from '@supabase/ssr'
import { log } from '@/lib/logger'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey ||
      supabaseUrl === 'your-supabase-url-here' ||
      supabaseUrl === 'https://your-project.supabase.co') {
    log.error('⚠️  Supabase not configured! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    log.error('   See SUPABASE_SETUP.md for instructions')

    // Return a mock client that throws helpful errors
    throw new Error('Supabase not configured. Please check .env.local and SUPABASE_SETUP.md')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
