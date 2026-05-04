'use client'

import { AgentWorkspace } from '@/features/agents/shared/components/AgentWorkspace'
import { ClosingRecommendationCard } from '@/features/agents/patel/components/ClosingRecommendationCard'
import { FileText, Target, Compass, Megaphone, Mail, Swords, BookOpen, Users, BarChart3 } from 'lucide-react'
import { blue } from '@/features/agents/shared/constants/colors'

const DELIVERABLES = [
  { type: 'icp_document',          icon: FileText,  label: 'D1 · ICP Definition', description: 'Define your ideal customer profile' },
  { type: 'pains_gains_triggers',  icon: Target,    label: 'D2 · Pains & Gains',  description: 'Map buyer pain, triggers & objections', prerequisiteTypes: ['icp_document'] },
  { type: 'buyer_journey',         icon: Compass,   label: 'D3 · Buyer Journey',  description: 'Stage-by-stage GTM motion map',           prerequisiteTypes: ['icp_document', 'pains_gains_triggers'] },
  { type: 'positioning_messaging', icon: Megaphone, label: 'D4 · Positioning',    description: 'Value prop, pillars & channel copy',        prerequisiteTypes: ['icp_document', 'pains_gains_triggers', 'buyer_journey'] },
  { type: 'outreach_sequence',     icon: Mail,      label: 'Outreach Sequence',   description: '5-step personalised email sequence' },
  { type: 'battle_card',           icon: Swords,    label: 'Battle Card',         description: 'Win vs your top competitor' },
  { type: 'gtm_playbook',          icon: BookOpen,  label: 'GTM Playbook',        description: 'Full go-to-market execution plan' },
  { type: 'lead_list',             icon: Users,     label: 'Lead List',           description: 'Apollo-sourced target contacts' },
  { type: 'campaign_report',       icon: BarChart3, label: 'Campaign Report',     description: 'Email + channel performance analysis' },
]

const SUGGESTED = [
  'Build D1 ICP Definition for my startup',
  'Build D2 Pains & Gains map for my startup',
  'Build D3 Buyer Journey map for my startup',
  'Build D4 Positioning & Messaging for my startup',
  'Find 20 B2B SaaS CTOs and send them our outreach',
  'Build a battle card against our top competitor',
]

export default function PatelWorkspace() {
  return (
    <AgentWorkspace
      agentId="patel"
      name="Patel"
      role="CMO · Go-to-Market"
      emoji="📈"
      accent={blue}
      badge="AGENTIC GTM"
      deliverables={DELIVERABLES}
      suggestedPrompts={SUGGESTED}
      extras={({ workspace }) =>
        workspace.userId ? (
          <ClosingRecommendationCard
            userId={workspace.userId}
            onAction={deliverable => {
              const labels: Record<string, string> = {
                icp_document:          'Build D1 ICP Definition for my startup',
                pains_gains_triggers:  'Build D2 Pains & Gains map for my startup',
                buyer_journey:         'Build D3 Buyer Journey map for my startup',
                positioning_messaging: 'Build D4 Positioning & Messaging for my startup',
              }
              workspace.send(labels[deliverable] ?? `Build ${deliverable}`)
            }}
          />
        ) : null
      }
    />
  )
}
