/**
 * Academy & Workshop Type Definitions
 */

export type WorkshopTopic = 'go-to-market' | 'product' | 'fundraising' | 'team' | 'operations' | 'sales';
export type WorkshopStatus = 'upcoming' | 'past' | 'live';

export interface Workshop {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  instructor: string;
  instructorTitle: string;
  topic: WorkshopTopic;
  status: WorkshopStatus;
  capacity: number;
  registered: number;
  spotsLeft: number;
  isPast: boolean;
  recordingUrl?: string;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  availability: string;
  sessionsCompleted: number;
  rating: number;
  bio: string;
  avatar: string;
  linkedin?: string;
}

export interface AcademyProgram {
  id: string;
  name: string;
  description: string;
  duration: string;
  startDate: string;
  cohortSize: number;
  spotsLeft: number;
  requirements: {
    minQScore: number;
    stage: string[];
  };
  curriculum: string[];
  status: 'open' | 'closed' | 'in-progress';
}
