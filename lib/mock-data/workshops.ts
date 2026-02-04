import { Workshop, Mentor, AcademyProgram } from "@/app/types/edge-alpha";

/**
 * Edge Alpha Workshops & Academy
 * Live training sessions, mentors, and programs for founders
 */

export const workshops: Workshop[] = [
  {
    id: 'workshop-1',
    title: 'GTM Strategy Bootcamp',
    description: 'Learn how to define your ICP, test acquisition channels, and build a repeatable go-to-market playbook.',
    date: '2026-02-15',
    time: '10:00 AM PST',
    duration: '2 hours',
    instructor: 'Sarah Chen',
    instructorTitle: 'Former VP Growth at Stripe',
    topic: 'go-to-market',
    status: 'upcoming',
    capacity: 50,
    registered: 32,
    spotsLeft: 18,
    isPast: false,
  },
  {
    id: 'workshop-2',
    title: 'Product-Market Fit Workshop',
    description: 'Identify PMF signals, prioritize features, and build products customers love.',
    date: '2026-02-22',
    time: '2:00 PM PST',
    duration: '90 minutes',
    instructor: 'Michael Torres',
    instructorTitle: 'Ex-Head of Product at Airbnb',
    topic: 'product',
    status: 'upcoming',
    capacity: 40,
    registered: 28,
    spotsLeft: 12,
    isPast: false,
  },
  {
    id: 'workshop-3',
    title: 'Fundraising Fundamentals',
    description: 'Master pitch decks, investor targeting, and term sheet negotiations for seed rounds.',
    date: '2026-03-01',
    time: '11:00 AM PST',
    duration: '2.5 hours',
    instructor: 'David Kim',
    instructorTitle: 'Partner at Sequoia Capital',
    topic: 'fundraising',
    status: 'upcoming',
    capacity: 60,
    registered: 45,
    spotsLeft: 15,
    isPast: false,
  },
  {
    id: 'workshop-4',
    title: 'Building High-Performing Teams',
    description: 'Hiring, culture, and equity compensation strategies for early-stage startups.',
    date: '2026-03-08',
    time: '1:00 PM PST',
    duration: '2 hours',
    instructor: 'Lisa Anderson',
    instructorTitle: 'VP People at Notion',
    topic: 'team',
    status: 'upcoming',
    capacity: 45,
    registered: 19,
    spotsLeft: 26,
    isPast: false,
  },
  {
    id: 'workshop-5',
    title: 'Financial Modeling for Founders',
    description: 'Build unit economics models, forecast revenue, and understand investor metrics.',
    date: '2026-01-25',
    time: '3:00 PM PST',
    duration: '2 hours',
    instructor: 'Robert Chen',
    instructorTitle: 'Former CFO at Uber',
    topic: 'operations',
    status: 'past',
    capacity: 50,
    registered: 50,
    spotsLeft: 0,
    isPast: true,
    recordingUrl: '/workshops/financial-modeling-recording',
  },
  {
    id: 'workshop-6',
    title: 'Sales Playbook Workshop',
    description: 'Design outbound sequences, qualify leads, and build repeatable sales processes.',
    date: '2026-01-18',
    time: '10:00 AM PST',
    duration: '90 minutes',
    instructor: 'Amanda Rodriguez',
    instructorTitle: 'VP Sales at HubSpot',
    topic: 'sales',
    status: 'past',
    capacity: 40,
    registered: 38,
    spotsLeft: 0,
    isPast: true,
    recordingUrl: '/workshops/sales-playbook-recording',
  },
];

/**
 * Get upcoming workshops
 */
export function getUpcomingWorkshops(): Workshop[] {
  return workshops.filter(w => w.status === 'upcoming');
}

/**
 * Get past workshops
 */
export function getPastWorkshops(): Workshop[] {
  return workshops.filter(w => w.status === 'past');
}

/**
 * Get workshop by ID
 */
export function getWorkshopById(id: string): Workshop | undefined {
  return workshops.find(w => w.id === id);
}

/**
 * Get workshops by topic
 */
export function getWorkshopsByTopic(topic: string): Workshop[] {
  return workshops.filter(w => w.topic === topic);
}

/**
 * Mentors
 */
export const mentors: Mentor[] = [
  {
    id: 'mentor-1',
    name: 'Sarah Chen',
    title: 'Former VP Growth',
    company: 'Stripe',
    expertise: ['GTM Strategy', 'Growth Marketing', 'B2B SaaS'],
    availability: 'Available',
    sessionsCompleted: 127,
    rating: 4.9,
    bio: '10+ years scaling B2B SaaS companies. Led growth at Stripe from $10M to $500M ARR.',
    avatar: 'SC',
    linkedin: 'https://linkedin.com/in/sarachen'
  },
  {
    id: 'mentor-2',
    name: 'Michael Torres',
    title: 'Ex-Head of Product',
    company: 'Airbnb',
    expertise: ['Product-Market Fit', 'Product Strategy', 'User Research'],
    availability: 'Limited',
    sessionsCompleted: 89,
    rating: 4.8,
    bio: 'Built and scaled products at Airbnb, Google, and 3 successful startups.',
    avatar: 'MT'
  },
  {
    id: 'mentor-3',
    name: 'David Kim',
    title: 'Partner',
    company: 'Sequoia Capital',
    expertise: ['Fundraising', 'Pitch Decks', 'Term Sheets'],
    availability: 'Booked',
    sessionsCompleted: 156,
    rating: 5.0,
    bio: 'Invested in 50+ startups including Zoom, DoorDash, and Stripe.',
    avatar: 'DK'
  }
];

/**
 * Academy Programs
 */
export const academyPrograms: AcademyProgram[] = [
  {
    id: 'program-1',
    name: 'GTM Accelerator',
    description: '8-week intensive program to build and execute your go-to-market strategy',
    duration: '8 weeks',
    startDate: '2026-03-15',
    cohortSize: 20,
    spotsLeft: 7,
    requirements: {
      minQScore: 60,
      stage: ['mvp', 'launched', 'scaling']
    },
    curriculum: [
      'ICP Definition & Validation',
      'Channel Strategy & Testing',
      'Sales Process Design',
      'Marketing Automation',
      'CAC Optimization',
      'Growth Experiments',
      'Team Building',
      'Investor Updates'
    ],
    status: 'open'
  },
  {
    id: 'program-2',
    name: 'Fundraising Bootcamp',
    description: '4-week program to prepare for and execute your seed/Series A raise',
    duration: '4 weeks',
    startDate: '2026-04-01',
    cohortSize: 15,
    spotsLeft: 3,
    requirements: {
      minQScore: 65,
      stage: ['mvp', 'launched']
    },
    curriculum: [
      'Pitch Deck Mastery',
      'Financial Modeling',
      'Investor Targeting',
      'Warm Introductions',
      'Term Sheet Negotiation',
      'Due Diligence Prep'
    ],
    status: 'open'
  },
  {
    id: 'program-3',
    name: 'Product-Market Fit Sprint',
    description: '6-week program to find and validate product-market fit',
    duration: '6 weeks',
    startDate: '2026-05-01',
    cohortSize: 25,
    spotsLeft: 25,
    requirements: {
      minQScore: 50,
      stage: ['idea', 'mvp']
    },
    curriculum: [
      'Problem Validation',
      'Customer Discovery',
      'MVP Design',
      'Feature Prioritization',
      'User Testing',
      'Iteration Framework'
    ],
    status: 'closed'
  }
];

/**
 * Get open programs
 */
export function getOpenPrograms(): AcademyProgram[] {
  return academyPrograms.filter(p => p.status === 'open');
}
