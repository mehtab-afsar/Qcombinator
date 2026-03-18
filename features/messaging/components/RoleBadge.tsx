'use client'

import { ParticipantType } from '../types/messaging.types'

export function RoleBadge({ type }: { type: ParticipantType }) {
  const isInvestor = type === 'investor'
  return (
    <span style={{
      padding: '1px 7px', fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      background: isInvestor ? '#EEF2FF' : '#F0FDF4',
      color:      isInvestor ? '#3730A3' : '#166534',
      border:     `1px solid ${isInvestor ? '#C7D2FE' : '#BBF7D0'}`,
      borderRadius: 999,
    }}>
      {type}
    </span>
  )
}
