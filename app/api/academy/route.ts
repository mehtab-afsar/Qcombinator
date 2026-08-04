import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '@/lib/auth/verify'
import { createAdminClient } from '@/lib/supabase/server'
import type { Workshop, Mentor, AcademyProgram } from '@/features/academy/types/academy.types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Map DB snake_case rows → camelCase TypeScript types

function rowToWorkshop(r: Record<string, unknown>): Workshop {
  return {
    id:              String(r.id),
    title:           String(r.title),
    description:     String(r.description),
    date:            String(r.date),
    time:            String(r.time),
    duration:        String(r.duration),
    instructor:      String(r.instructor),
    instructorTitle: String(r.instructor_title),
    topic:           r.topic as Workshop['topic'],
    status:          r.status as Workshop['status'],
    capacity:        Number(r.capacity),
    registered:      Number(r.registered),
    spotsLeft:       Number(r.spots_left),
    isPast:          Boolean(r.is_past),
    recordingUrl:    r.recording_url ? String(r.recording_url) : undefined,
    startsAt:        r.starts_at ? String(r.starts_at) : undefined,
    endsAt:          r.ends_at ? String(r.ends_at) : undefined,
  }
}

function rowToMentor(r: Record<string, unknown>): Mentor {
  return {
    id:                String(r.id),
    name:              String(r.name),
    title:             String(r.title),
    company:           String(r.company),
    expertise:         (r.expertise as string[]) ?? [],
    availability:      String(r.availability),
    sessionsCompleted: Number(r.sessions_completed),
    rating:            Number(r.rating),
    bio:               String(r.bio),
    avatar:            String(r.avatar ?? ''),
    linkedin:          r.linkedin ? String(r.linkedin) : undefined,
  }
}

function rowToProgram(r: Record<string, unknown>): AcademyProgram {
  return {
    id:          String(r.id),
    name:        String(r.name),
    description: String(r.description),
    duration:    String(r.duration),
    startDate:   String(r.start_date),
    cohortSize:  Number(r.cohort_size),
    spotsLeft:   Number(r.spots_left),
    requirements: {
      minQScore: Number(r.min_q_score),
      stage:     (r.stage as string[]) ?? [],
    },
    curriculum: (r.curriculum as string[]) ?? [],
    status:     r.status as AcademyProgram['status'],
  }
}

export async function GET() {
  try {
    const supabase = getSupabase()

    // Content stays fully public — anon or authenticated callers get the same three lists.
    // Auth is checked separately, additively, only to attach registration state below; a
    // failed/missing session never blocks the public read.
    const [workshopsRes, mentorsRes, programsRes, auth] = await Promise.all([
      supabase.from('academy_workshops').select('*').order('sort_order').order('date'),
      supabase.from('academy_mentors').select('*').order('sort_order').order('name'),
      supabase.from('academy_programs').select('*').order('sort_order').order('start_date'),
      verifyAuth().catch(() => ({ ok: false as const, error: 'unauthenticated', status: 401 as const })),
    ])

    const workshops: Workshop[] = (workshopsRes.data ?? []).map(rowToWorkshop)
    const mentors: Mentor[]     = (mentorsRes.data ?? []).map(rowToMentor)
    const programs: AcademyProgram[] = (programsRes.data ?? []).map(rowToProgram)

    let registeredWorkshopIds: string[] = []
    if (auth.ok) {
      // Service-role client with an explicit founder_id filter — this route's existing
      // client has no session/cookies attached (persistSession: false, anon key only), so
      // RLS's auth.uid() would never resolve here even for a logged-in caller.
      const admin = createAdminClient()
      const { data } = await admin
        .from('academy_event_registrations')
        .select('workshop_id')
        .eq('founder_id', auth.user.id)
        .eq('status', 'registered')
      registeredWorkshopIds = (data ?? []).map(r => String(r.workshop_id))
    }

    return NextResponse.json({ workshops, mentors, programs, registeredWorkshopIds })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg, workshops: [], mentors: [], programs: [], registeredWorkshopIds: [] }, { status: 500 })
  }
}
