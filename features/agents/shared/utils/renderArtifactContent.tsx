import React from 'react'
import { ICPRenderer }              from '../../patel/components/ICPRenderer'
import { PainsGainsRenderer }       from '../../patel/components/PainsGainsRenderer'
import { BuyerJourneyRenderer }     from '../../patel/components/BuyerJourneyRenderer'
import { PositioningRenderer }      from '../../patel/components/PositioningRenderer'
import { OutreachRenderer }         from '../../patel/components/OutreachRenderer'
import { BattleCardRenderer }       from '../../patel/components/BattleCardRenderer'
import { PlaybookRenderer }         from '../../patel/components/PlaybookRenderer'
import { SalesScriptRenderer }      from '../../susi/components/SalesScriptRenderer'
import { BrandMessagingRenderer }   from '../../maya/components/BrandMessagingRenderer'
import { FinancialSummaryRenderer } from '../../felix/components/FinancialSummaryRenderer'
import { LegalChecklistRenderer }   from '../../leo/components/LegalChecklistRenderer'
import { HiringPlanRenderer }       from '../../harper/components/HiringPlanRenderer'
import { PMFSurveyRenderer }        from '../../nova/components/PMFSurveyRenderer'
import { CompetitiveMatrixRenderer }from '../../atlas/components/CompetitiveMatrixRenderer'
import { StrategicPlanRenderer }    from '../../sage/components/StrategicPlanRenderer'
import { muted } from '../constants/colors'
import type { ArtifactRecord } from '../hooks/useAgentWorkspace'

export function renderArtifactContent(
  artifact: ArtifactRecord,
  userId?: string | null,
): React.ReactNode {
  const { type, content, id } = artifact
  switch (type) {
    case 'icp_document':          return <ICPRenderer              data={content} />
    case 'pains_gains_triggers':  return <PainsGainsRenderer       data={content} />
    case 'buyer_journey':         return <BuyerJourneyRenderer     data={content} />
    case 'positioning_messaging': return <PositioningRenderer      data={content} />
    case 'outreach_sequence':     return <OutreachRenderer         data={content} artifactId={id} sequenceName={artifact.title} />
    case 'battle_card':           return <BattleCardRenderer       data={content} />
    case 'gtm_playbook':          return <PlaybookRenderer         data={content} artifactId={id} />
    case 'sales_script':          return <SalesScriptRenderer      data={content} artifactId={id} />
    case 'brand_messaging':       return <BrandMessagingRenderer   data={content} artifactId={id} />
    case 'financial_summary':     return <FinancialSummaryRenderer data={content} artifactId={id} />
    case 'legal_checklist':       return <LegalChecklistRenderer   data={content} artifactId={id} />
    case 'hiring_plan':           return <HiringPlanRenderer       data={content} artifactId={id} userId={userId ?? undefined} />
    case 'pmf_survey':            return <PMFSurveyRenderer        data={content} artifactId={id} userId={userId ?? undefined} />
    case 'competitive_matrix':    return <CompetitiveMatrixRenderer data={content} artifactId={id} />
    case 'strategic_plan':        return <StrategicPlanRenderer    data={content} artifactId={id} />
    default:
      return <pre style={{ fontSize: 11, color: muted, whiteSpace: 'pre-wrap' }}>{JSON.stringify(content, null, 2)}</pre>
  }
}
