import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    const [workshopsRes, mentorsRes, programsRes] = await Promise.all([
      supabase.from('academy_workshops').select('*').order('sort_order').order('date'),
      supabase.from('academy_mentors').select('*').order('sort_order').order('name'),
      supabase.from('academy_programs').select('*').order('sort_order').order('start_date'),
    ])

    const workshops: Workshop[] = (workshopsRes.data ?? []).map(rowToWorkshop)
    const mentors: Mentor[]     = (mentorsRes.data ?? []).map(rowToMentor)
    const programs: AcademyProgram[] = (programsRes.data ?? []).map(rowToProgram)

    return NextResponse.json({ workshops, mentors, programs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg, workshops: [], mentors: [], programs: [] }, { status: 500 })
  }
}
