import { Workshop, Mentor, AcademyProgram } from "@/features/academy/types/academy.types";

export const workshops: Workshop[] = [];

export function getUpcomingWorkshops(): Workshop[] {
  return workshops.filter(w => w.status === 'upcoming');
}

export function getPastWorkshops(): Workshop[] {
  return workshops.filter(w => w.status === 'past');
}

export function getWorkshopById(id: string): Workshop | undefined {
  return workshops.find(w => w.id === id);
}

export function getWorkshopsByTopic(topic: string): Workshop[] {
  return workshops.filter(w => w.topic === topic);
}

export const mentors: Mentor[] = [];

export const academyPrograms: AcademyProgram[] = [];

export function getOpenPrograms(): AcademyProgram[] {
  return academyPrograms.filter(p => p.status === 'open');
}
