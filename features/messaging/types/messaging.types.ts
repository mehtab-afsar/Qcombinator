/**
 * Messaging Feature — Type Definitions
 */

export type ParticipantType = 'founder' | 'investor'
export type RequestStatus   = 'pending' | 'accepted' | 'declined'
export type MsgType         = 'text' | 'document' | 'meeting-request'
export type MeetingStatus   = 'pending' | 'confirmed' | 'declined'
export type InboxTab        = 'connections' | 'requests' | 'network'

export interface Participant {
  id: string
  name: string
  title: string
  company: string
  type: ParticipantType
  qScore?: number
  stage?: string
  sector?: string
  seeking?: string
}

export interface ConnectionRequest {
  id: string
  from: Participant
  note: string
  timestamp: string
  status: RequestStatus
}

export interface Message {
  id: string
  content: string
  timestamp: string
  sender: 'user' | 'other'
  type: MsgType
  attachments?: Array<{ name: string; type: string; size: string }>
  meetingSlots?: string[]
  meetingStatus?: MeetingStatus
  confirmedSlot?: string
}

export interface Conversation {
  id: string
  participant: Participant
  requestId: string
  connectionId?: string
  lastMessage: string
  timestamp: string
  unread: number
  starred: boolean
  messages: Message[]
}

export interface RealMessage {
  id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export interface NetworkPost {
  id: string
  author: Participant
  content: string
  timestamp: string
  likes: number
  replies: number
  tags: string[]
}
