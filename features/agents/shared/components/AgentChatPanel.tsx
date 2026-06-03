'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, TrendingUp, CheckCircle2, FileText, Download, Paperclip, X } from 'lucide-react'
import { useAgentWorkspace } from '../hooks/useAgentWorkspace'
import type { PendingFile } from '../hooks/useAgentWorkspace'
import { bg, bdr, ink, muted } from '../constants/colors'
import type { SourceItem } from '../hooks/useAgentWorkspace'
import { renderArtifactContent } from '../utils/renderArtifactContent'
import type { ArtifactRecord } from '../hooks/useAgentWorkspace'
import { getSkillsForAgent, expandSkillPrompt, type Skill } from '@/lib/agents/skills/registry'

// ─── markdown renderer ────────────────────────────────────────────────────────

function inlineMd(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*\n]+\*\*|\*(?!\*)[^*\n]+\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.88em', background: '#F0EDE6', padding: '1px 5px', borderRadius: 4, color: '#18160F' }}>{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ fontWeight: 700, color: '#18160F' }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i}>{p.slice(1, -1)}</em>
    return p
  })
}

function renderMd(raw: string): React.ReactNode {
  const lines = raw.split('\n')
  const nodes: React.ReactNode[] = []
  let listBuffer: React.ReactNode[] = []
  let orderedBuffer: React.ReactNode[] = []
  let orderedCounter = 0

  function flushLists() {
    if (listBuffer.length > 0) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} style={{ margin: '6px 0 8px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {listBuffer}
        </ul>
      )
      listBuffer = []
    }
    if (orderedBuffer.length > 0) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} style={{ margin: '6px 0 8px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3, counterReset: 'none' }}>
          {orderedBuffer}
        </ol>
      )
      orderedBuffer = []
      orderedCounter = 0
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim() === '') {
      flushLists()
      nodes.push(<div key={`sp-${i}`} style={{ height: 10 }} />)
      continue
    }

    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushLists()
      nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #E2DDD5', margin: '12px 0' }} />)
      continue
    }

    if (/^# /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ fontSize: 15, fontWeight: 700, color: '#18160F', marginTop: 18, marginBottom: 6, lineHeight: 1.4 }}>
          {inlineMd(line.replace(/^# /, ''))}
        </div>
      )
      continue
    }

    if (/^## /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ fontSize: 14, fontWeight: 700, color: '#18160F', marginTop: 14, marginBottom: 5, lineHeight: 1.4 }}>
          {inlineMd(line.replace(/^## /, ''))}
        </div>
      )
      continue
    }

    if (/^### /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ fontSize: 13, fontWeight: 700, color: '#3D3A35', marginTop: 12, marginBottom: 4, lineHeight: 1.4 }}>
          {inlineMd(line.replace(/^### /, ''))}
        </div>
      )
      continue
    }

    if (/^> /.test(line)) {
      flushLists()
      nodes.push(
        <div key={i} style={{ borderLeft: '3px solid #E2DDD5', paddingLeft: 12, marginLeft: 0, margin: '6px 0', color: '#8A867C', fontStyle: 'italic', fontSize: 13, lineHeight: 1.65 }}>
          {inlineMd(line.replace(/^> /, ''))}
        </div>
      )
      continue
    }

    if (/^\s*[-•*] /.test(line)) {
      if (orderedBuffer.length > 0) { flushLists() }
      const text = line.replace(/^\s*[-•*] /, '')
      listBuffer.push(
        <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 4, lineHeight: 1.65, fontSize: 13 }}>
          <span style={{ flexShrink: 0, marginTop: '0.35em', width: 5, height: 5, borderRadius: '50%', background: '#8A867C', display: 'inline-block' }} />
          <span>{inlineMd(text)}</span>
        </li>
      )
      continue
    }

    const ordMatch = line.match(/^\s*(\d+)\. (.+)/)
    if (ordMatch) {
      if (listBuffer.length > 0) { flushLists() }
      orderedCounter++
      orderedBuffer.push(
        <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingLeft: 4, lineHeight: 1.65, fontSize: 13 }}>
          <span style={{ flexShrink: 0, minWidth: 18, fontWeight: 600, color: '#8A867C', fontSize: 12, marginTop: '0.1em', textAlign: 'right' }}>{orderedCounter}.</span>
          <span>{inlineMd(ordMatch[2])}</span>
        </li>
      )
      continue
    }

    flushLists()
    nodes.push(
      <div key={i} style={{ fontSize: 13, lineHeight: 1.75, color: '#18160F', marginBottom: 2 }}>
        {inlineMd(line)}
      </div>
    )
  }

  flushLists()
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{nodes}</div>
}

// ─── typing indicator ─────────────────────────────────────────────────────────

function TypingPhrase({ accent }: { accent: string }) {
  return (
    <div style={{ paddingTop: 9, display: 'flex', alignItems: 'center', gap: 5 }}>
      {[0, 1, 2].map(i => (
        <motion.span key={i}
          style={{ width: 5, height: 5, borderRadius: '50%', background: accent, display: 'inline-block' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

// ─── print / download helpers ────────────────────────────────────────────────

const _arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const _str = (v: unknown): string => (typeof v === 'string' ? v : '')
const _num = (v: unknown): number => (typeof v === 'number' ? v : 0)
const _obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})

function _execBrief(d: Record<string, unknown>, whatEnablesLabels: [string, string][]): string {
  let h = ''
  if (_str(d.executive_summary)) h += `<h2>Executive Summary</h2><p>${_str(d.executive_summary)}</p>`
  if (_str(d.strategic_decision)) h += `<h2>Strategic Decision</h2><blockquote>${_str(d.strategic_decision)}</blockquote>`
  const we = _obj(d.what_enables)
  if (Object.keys(we).length) {
    h += `<h2>What This Deliverable Enables</h2>`
    whatEnablesLabels.filter(([k]) => _str(we[k])).forEach(([k, lbl]) => { h += `<div class="label-row"><span class="label-chip">${lbl}</span><span>${_str(we[k])}</span></div>` })
  }
  const ap = _arr(d.action_plan)
  if (ap.length) {
    h += `<h2>Founder Action Plan</h2><ol>`
    ap.forEach((item: unknown) => { const it = _obj(item); h += `<li><span class="badge">${_str(it.timeframe)}</span> ${_str(it.action)}</li>` })
    h += `</ol>`
  }
  return h
}

function _learningAgenda(d: Record<string, unknown>, categories: [string, string][]): string {
  const la = _obj(d.learning_agenda)
  if (!Object.keys(la).length) return ''
  let h = `<h2>Learning Agenda</h2>`
  categories.filter(([k]) => _arr(la[k]).length).forEach(([k, lbl]) => {
    h += `<p><strong>${lbl}</strong></p><ul>`
    _arr(la[k]).forEach(q => { h += `<li>${_str(q)}</li>` })
    h += `</ul>`
  })
  return h
}

function renderD1ToHtml(d: Record<string, unknown>): string {
  let html = ''
  if (_str(d.icp_id)) html += `<p class="meta">${_str(d.icp_id)} · ${_str(d.evidence_type)} · ${_num(d.confidence) ? Math.round(_num(d.confidence) * 100) + '% confidence' : ''}</p>`
  html += _execBrief(d, [['outbound_precision','Outbound Precision'],['messaging_quality','Messaging Quality'],['trigger_timing','Trigger Timing'],['qualification','Qualification'],['learning_velocity','Learning Velocity']])
  const ct = _obj(d.campaign_translation)
  if (Object.keys(ct).length) {
    html += `<h2>Campaign Translation</h2>`
    if (_arr(ct.target_persona).length) html += `<div class="label-row"><span class="label-chip">Target Persona</span><span>${_arr(ct.target_persona).map(_str).join(', ')}</span></div>`
    if (_str(ct.target_accounts)) html += `<div class="label-row"><span class="label-chip">Target Accounts</span><span>${_str(ct.target_accounts)}</span></div>`
    if (_arr(ct.trigger_moments).length) html += `<div class="label-row"><span class="label-chip">Trigger Moments</span><span>${_arr(ct.trigger_moments).map(_str).join('; ')}</span></div>`
    if (_str(ct.lead_message_angle)) html += `<div class="label-row"><span class="label-chip">Lead Angle</span><span>${_str(ct.lead_message_angle)}</span></div>`
    if (_str(ct.primary_cta)) html += `<div class="label-row"><span class="label-chip">Primary CTA</span><span>${_str(ct.primary_cta)}</span></div>`
  }
  html += _learningAgenda(d, [['messaging','Messaging'],['persona','Persona'],['trigger','Trigger'],['market','Market'],['sales','Sales']])
  const segs = _arr(d.segments)
  if (segs.length) {
    html += `<h2>Target Segments</h2>`
    segs.forEach((s: unknown) => {
      const seg = _obj(s); html += `<p><strong>${_str(seg.code)}</strong>${seg.is_primary ? ' <span class="badge">PRIMARY</span>' : ''} — ${_str(seg.industry)}, ${_str(seg.company_type)}, ${_str(seg.geography)}</p>`
      if (_str(seg.structural_context)) html += `<p style="padding-left:16px;color:#555;font-size:12px">${_str(seg.structural_context)}</p>`
      if (_str(seg.why_primary)) html += `<p style="padding-left:16px;font-size:12px"><em>Why primary:</em> ${_str(seg.why_primary)}</p>`
    })
  }
  _arr(d.personas).forEach((p: unknown, pi: number) => {
    const per = _obj(p)
    if (pi === 0) html += `<h2>Buyer Personas</h2>`
    html += `<p><strong>${_str(per.code)}: ${_arr(per.title_cluster).map(_str).join(', ')}</strong></p>`
    if (_str(per.core_pain)) html += `<p style="padding-left:16px;font-size:12px">Pain: ${_str(per.core_pain)}</p>`
    if (_str(per.internal_pressure)) html += `<p style="padding-left:16px;font-size:12px">Internal pressure: ${_str(per.internal_pressure)}</p>`
    if (_str(per.failure_consequence)) html += `<p style="padding-left:16px;font-size:12px">Failure consequence: ${_str(per.failure_consequence)}</p>`
  })
  const triggers = _arr(d.trigger_taxonomy)
  if (triggers.length) {
    html += `<h2>Trigger Taxonomy</h2><ul>`
    triggers.forEach((t: unknown) => { const tr = _obj(t); html += `<li>${_str(tr.trigger)} — <em>Signal:</em> ${_str(tr.signal)}</li>` })
    html += `</ul>`
  }
  const objections = _arr(d.objections)
  if (objections.length) {
    html += `<h2>Objection Map</h2>`
    objections.forEach((o: unknown) => {
      const ob = _obj(o)
      html += `<div class="callout"><p><strong>${_str(ob.type)}:</strong> ${_str(ob.objection)}</p>`
      if (_str(ob.root_cause)) html += `<p style="font-size:12px;color:#666">Root cause: ${_str(ob.root_cause)}</p>`
      html += `<p style="font-size:12px;color:#16a34a">Counter: ${_str(ob.counter)}</p></div>`
    })
  }
  const sm = _obj(d.success_metrics)
  if (Object.keys(sm).length) {
    html += `<h2>Success Metrics</h2>`
    if (_str(sm.primary)) html += `<p><strong>Primary:</strong> ${_str(sm.primary)}</p>`
    if (_str(sm.secondary)) html += `<p><strong>Secondary:</strong> ${_str(sm.secondary)}</p>`
    if (_str(sm.tertiary)) html += `<p><strong>Tertiary:</strong> ${_str(sm.tertiary)}</p>`
  }
  const sd = _obj(d.signal_design)
  if (Object.keys(sd).length) {
    html += `<h2>Signal Design</h2><div class="callout"><p><strong>Run:</strong> ${_str(sd.run_id)} &nbsp;|&nbsp; <strong>Segment:</strong> ${_str(sd.segment)} &nbsp;|&nbsp; <strong>Variable:</strong> ${_str(sd.experiment_variable)}</p>`
    if (_arr(sd.tracking_events).length) { html += `<p><strong>Track per contact:</strong></p><ul>`; _arr(sd.tracking_events).forEach(e => { html += `<li>${_str(e)}</li>` }); html += `</ul>` }
    if (_arr(sd.signal_layer).length) { html += `<p><strong>Signal layer (200–500 contacts):</strong></p><ul>`; _arr(sd.signal_layer).forEach(s => { html += `<li>${_str(s)}</li>` }); html += `</ul>` }
    html += `</div>`
  }
  const fm = _obj(d.failure_mode)
  if (Object.keys(fm).length) {
    html += `<h2>Failure Mode</h2><div class="callout"><p>${_str(fm.why_might_not_convert)}</p><p style="margin-top:6px"><strong>Assumption to validate:</strong> ${_str(fm.assumption_to_validate)}</p></div>`
  }
  return html
}

function renderD2ToHtml(d: Record<string, unknown>): string {
  let html = ''
  if (_str(d.target_context)) html += `<p class="meta">${_str(d.target_context)}</p>`
  html += _execBrief(d, [['pain_precision','Pain Precision'],['trigger_detection','Trigger Detection'],['message_grounding','Message Grounding'],['objection_intelligence','Objection Intel'],['learning_velocity','Learning Velocity']])
  const pains = _arr(d.core_pains)
  if (pains.length) {
    html += `<h2>Core Pains</h2>`
    pains.forEach((p: unknown) => {
      const pain = _obj(p)
      html += `<div class="callout"><p><strong>[${_num(pain.severity)}/5]</strong> ${_str(pain.pain)}</p>`
      if (_str(pain.current_workaround)) html += `<p style="font-size:12px;color:#666">Workaround: ${_str(pain.current_workaround)}</p>`
      if (_str(pain.cost_of_pain)) html += `<p style="font-size:12px;color:#d97706">Cost: ${_str(pain.cost_of_pain)}</p>`
      html += `</div>`
    })
  }
  const gains = _arr(d.desired_gains)
  if (gains.length) { html += `<h2>Desired Gains</h2><ul>`; gains.forEach(g => { html += `<li>${_str(g)}</li>` }); html += `</ul>` }
  const triggers = _arr(d.trigger_events)
  if (triggers.length) {
    html += `<h2>Trigger Events</h2>`
    triggers.forEach((t: unknown) => {
      const tr = _obj(t)
      html += `<div class="callout"><p><span class="badge">${_str(tr.urgency)}</span> <strong>${_str(tr.trigger)}</strong></p>`
      if (_str(tr.example)) html += `<p style="font-size:12px;color:#666">e.g. ${_str(tr.example)}</p>`
      if (_str(tr.detection_signal)) html += `<p style="font-size:12px;color:#2563eb">Signal: ${_str(tr.detection_signal)}</p>`
      html += `</div>`
    })
  }
  const proof = _arr(d.proof_expectations)
  if (proof.length) { html += `<h2>Proof Expectations</h2><ul>`; proof.forEach(p => { html += `<li>${_str(p)}</li>` }); html += `</ul>` }
  const objections = _arr(d.common_objections)
  if (objections.length) {
    html += `<h2>Common Objections</h2>`
    objections.forEach((o: unknown) => {
      const ob = _obj(o)
      html += `<div class="callout"><p><strong>${_str(ob.objection)}</strong></p>`
      if (_str(ob.root_cause)) html += `<p style="font-size:12px;color:#666">Why: ${_str(ob.root_cause)}</p>`
      html += `<p style="font-size:12px;color:#16a34a">Handle: ${_str(ob.handle)}</p></div>`
    })
  }
  html += _learningAgenda(d, [['pain_validation','Pain Validation'],['trigger_detection','Trigger Detection'],['persona','Persona'],['market','Market'],['sales','Sales']])
  return html
}

function renderD3ToHtml(d: Record<string, unknown>): string {
  let html = ''
  if (_str(d.entry_condition)) html += `<p class="meta">Entry: ${_str(d.entry_condition)}</p>`
  html += _execBrief(d, [['stage_visibility','Stage Visibility'],['friction_reduction','Friction Reduction'],['content_strategy','Content Strategy'],['timing_precision','Timing Precision'],['learning_velocity','Learning Velocity']])
  const stages = _arr(d.stages)
  if (stages.length) {
    html += `<h2>Buyer Journey Stages</h2>`
    stages.forEach((s: unknown, i: number) => {
      const st = _obj(s)
      html += `<div class="callout" style="margin-bottom:10px"><p><strong>${i + 1}. ${_str(st.name)}</strong></p>`
      if (_str(st.buyer_state)) html += `<p style="font-size:12px;color:#666">State: ${_str(st.buyer_state)}</p>`
      if (_str(st.buyer_action)) html += `<p style="font-size:12px">Action: ${_str(st.buyer_action)}</p>`
      if (_str(st.gtm_touchpoint)) html += `<p style="font-size:12px;color:#2563eb">GTM: ${_str(st.gtm_touchpoint)}</p>`
      if (_str(st.friction)) html += `<p style="font-size:12px;color:#dc2626">Friction: ${_str(st.friction)}</p>`
      if (_str(st.trust_signal)) html += `<p style="font-size:12px;color:#16a34a">Trust signal: ${_str(st.trust_signal)}</p>`
      html += `</div>`
    })
  }
  const roles = _arr(d.buyer_roles)
  if (roles.length) {
    html += `<h2>Buyer Roles</h2>`
    roles.forEach((r: unknown) => { const ro = _obj(r); html += `<div class="label-row"><span class="label-chip">${_str(ro.role)}</span><span>${_str(ro.description)}</span></div>` })
  }
  const criteria = _arr(d.decision_criteria)
  if (criteria.length) { html += `<h2>Decision Criteria</h2><ol>`; criteria.forEach(c => { html += `<li>${_str(c)}</li>` }); html += `</ol>` }
  if (_str(d.pilot_path)) html += `<h2>Pilot Path</h2><p>${_str(d.pilot_path)}</p>`
  const risks = _arr(d.drop_off_risks)
  if (risks.length) {
    html += `<h2>Drop-Off Risks</h2>`
    risks.forEach((r: unknown) => {
      const ri = _obj(r)
      html += `<div class="callout"><p><strong>Stage: ${_str(ri.stage)}</strong></p><p style="font-size:12px;color:#dc2626">Risk: ${_str(ri.risk)}</p><p style="font-size:12px;color:#16a34a">Mitigation: ${_str(ri.mitigation)}</p></div>`
    })
  }
  html += _learningAgenda(d, [['stage_progression','Stage Progression'],['friction_points','Friction Points'],['trust_signals','Trust Signals'],['market','Market'],['sales','Sales']])
  return html
}

function renderD4ToHtml(d: Record<string, unknown>): string {
  let html = ''
  html += _execBrief(d, [['message_precision','Message Precision'],['response_rate','Response Rate'],['stage_coverage','Stage Coverage'],['differentiation','Differentiation'],['learning_velocity','Learning Velocity']])
  const f = _obj(d.foundation)
  if (Object.keys(f).length) {
    html += `<h2>Positioning Foundation</h2>`
    if (_str(f.positioning_statement)) html += `<p style="font-style:italic">${_str(f.positioning_statement)}</p>`
    if (_str(f.value_proposition)) html += `<div class="callout"><p><strong>Value Prop:</strong> ${_str(f.value_proposition)}</p></div>`
    if (_str(f.elevator_pitch)) html += `<p>${_str(f.elevator_pitch)}</p>`
  }
  const pillars = _arr(d.message_pillars)
  if (pillars.length) {
    html += `<h2>Message Pillars</h2>`
    pillars.forEach((p: unknown) => {
      const pi = _obj(p)
      html += `<div class="callout"><p><strong>${_str(pi.pillar)}</strong></p><p style="font-size:12px">"${_str(pi.claim)}"</p>`
      if (_str(pi.proof)) html += `<p style="font-size:12px;color:#16a34a">Proof: ${_str(pi.proof)}</p>`
      if (_str(pi.objection_handle)) html += `<p style="font-size:12px;color:#d97706">Handles: ${_str(pi.objection_handle)}</p>`
      html += `</div>`
    })
  }
  const v = _obj(d.icp_variants)
  if (Object.keys(v).length) {
    html += `<h2>Channel Copy</h2>`
    ;[['hero_headline','Hero Headline'],['sub_headline','Sub-Headline'],['outbound_hook','Outbound Hook'],['voicemail_script','Voicemail'],['cta','Primary CTA']]
      .filter(([k]) => _str(v[k])).forEach(([k, lbl]) => { html += `<div class="label-row"><span class="label-chip">${lbl}</span><span>${_str(v[k])}</span></div>` })
  }
  const cms = _arr(d.channel_messages)
  if (cms.length) {
    html += `<h2>Channel Messages</h2>`
    cms.forEach((cm: unknown) => {
      const c = _obj(cm)
      html += `<div class="callout"><p><strong>${_str(c.channel)}</strong>${_str(c.tone) ? ` — ${_str(c.tone)}` : ''}</p>`
      if (_str(c.opening)) html += `<p style="font-size:12px"><em>Opening:</em> ${_str(c.opening)}</p>`
      if (_str(c.example)) html += `<pre style="font-size:11px;white-space:pre-wrap;background:#f9f9f9;padding:8px;border-radius:4px;margin-top:6px">${_str(c.example)}</pre>`
      html += `</div>`
    })
  }
  if (_str(d.competitive_differentiation)) html += `<h2>Competitive Defensibility</h2><p>${_str(d.competitive_differentiation)}</p>`
  const forbidden = _arr(d.forbidden_claims)
  if (forbidden.length) { html += `<h2>Never Say These</h2><ul>`; forbidden.forEach(f2 => { html += `<li style="text-decoration:line-through;color:#dc2626">${_str(f2)}</li>` }); html += `</ul>` }
  html += _learningAgenda(d, [['messaging','Messaging'],['channel','Channel'],['persona','Persona'],['market','Market'],['sales','Sales']])
  return html
}

function renderD5ToHtml(d: Record<string, unknown>): string {
  let html = ''
  if (_str(d.targetICP)) html += `<p class="meta">Target: ${_str(d.targetICP)}</p>`
  if (_str(d.executive_summary)) html += `<h2>Executive Summary</h2><p>${_str(d.executive_summary)}</p>`
  const seq = _arr(d.sequence)
  if (seq.length) {
    html += `<h2>Outreach Sequence</h2>`
    seq.forEach((s: unknown) => {
      const step = _obj(s)
      html += `<div class="callout"><p><span class="badge">${_str(step.timing)}</span> <strong>Step ${_num(step.step)}: ${_str(step.channel).toUpperCase()}</strong></p>`
      if (_str(step.subject)) html += `<p style="font-size:12px"><em>Subject:</em> ${_str(step.subject)}</p>`
      if (_str(step.body)) html += `<pre style="font-size:11px;white-space:pre-wrap;background:#f9f9f9;padding:8px;border-radius:4px;margin-top:6px">${_str(step.body)}</pre>`
      if (_str(step.goal)) html += `<p style="font-size:12px;color:#16a34a;margin-top:4px">Goal: ${_str(step.goal)}</p>`
      html += `</div>`
    })
  }
  return html
}

function renderD6ToHtml(d: Record<string, unknown>): string {
  let html = ''
  if (_str(d.companyContext)) html += `<p class="meta">${_str(d.companyContext)}</p>`
  if (_str(d.executive_summary)) html += `<h2>Executive Summary</h2><p>${_str(d.executive_summary)}</p>`
  const pos = _obj(d.positioning)
  if (Object.keys(pos).length) {
    html += `<h2>Positioning</h2>`
    if (_str(pos.statement)) html += `<p style="font-style:italic">${_str(pos.statement)}</p>`
    const diffs = _arr(pos.differentiators)
    if (diffs.length) { html += `<ul>`; diffs.forEach(d2 => { html += `<li>${_str(d2)}</li>` }); html += `</ul>` }
  }
  const channels = _arr(d.channels)
  if (channels.length) {
    html += `<h2>Channels</h2>`
    channels.forEach((c: unknown) => {
      const ch = _obj(c)
      html += `<div class="label-row"><span class="label-chip">${_str(ch.channel)}</span><span><span class="badge">${_str(ch.priority)}</span> Budget: ${_str(ch.budget)} · CAC: ${_str(ch.expectedCAC)}</span></div>`
    })
  }
  const plan = _arr(d.ninetyDayPlan)
  if (plan.length) {
    html += `<h2>90-Day Plan</h2>`
    plan.forEach((ph: unknown) => {
      const p = _obj(ph)
      html += `<div class="callout"><p><strong>${_str(p.phase)}</strong> <span class="badge">${_str(p.weeks)}</span></p>`
      const actions = _arr(p.keyActions)
      if (actions.length) { html += `<ul>`; actions.forEach(a => { html += `<li>${_str(a)}</li>` }); html += `</ul>` }
      if (_str(p.successCriteria)) html += `<p style="font-size:12px;color:#16a34a">Success: ${_str(p.successCriteria)}</p>`
      html += `</div>`
    })
  }
  return html
}

const DOC_TYPE_LABELS: Record<string, string> = {
  icp_document:          'D1 · Ideal Customer Profile',
  pains_gains_triggers:  'D2 · Pains, Gains & Triggers',
  buyer_journey:         'D3 · Buyer Journey',
  positioning_messaging: 'D4 · Positioning & Messaging',
  outreach_sequence:     'D5 · Outreach Sequence',
  gtm_playbook:          'D6 · GTM Playbook',
}

function renderToHtml(content: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'icp_document':          return renderD1ToHtml(content)
    case 'pains_gains_triggers':  return renderD2ToHtml(content)
    case 'buyer_journey':         return renderD3ToHtml(content)
    case 'positioning_messaging': return renderD4ToHtml(content)
    case 'outreach_sequence':     return renderD5ToHtml(content)
    case 'gtm_playbook':          return renderD6ToHtml(content)
    default:                      return renderD1ToHtml(content)
  }
}

function buildPrintHtml(contentHtml: string, title: string, docType: string): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>${title}</title>
<style>
@page{size:A4;margin:20mm 18mm 22mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.65;color:#111;background:#fff;max-width:720px}
.doc-header{border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
.doc-header .left .brand{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#7C3AED;margin-bottom:6px}
.doc-header .left h1{font-size:20px;font-weight:700;line-height:1.25;color:#111}
.doc-header .left .doc-type{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#888;margin-top:5px}
.doc-header .right{text-align:right;font-size:10px;color:#999;flex-shrink:0;padding-left:16px}
h2{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#888;border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin:26px 0 12px}
p{font-size:13px;line-height:1.65;margin:0 0 6px}
p.meta{font-size:11px;color:#888;margin-bottom:20px}
blockquote{border-left:4px solid #7C3AED;margin:0 0 12px;padding:12px 16px;background:#faf7ff;font-size:14px;font-weight:600;color:#111;line-height:1.6;border-radius:0 8px 8px 0}
ul,ol{font-size:13px;padding-left:22px;margin:0 0 12px}
li{margin-bottom:5px;line-height:1.55}
.callout{background:#f9f9f9;border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px;margin:0 0 10px}
.label-row{display:flex;gap:12px;align-items:flex-start;margin:4px 0}
.label-chip{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#888;min-width:130px;flex-shrink:0;padding-top:2px}
.badge{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7C3AED;background:#f5f0ff;padding:2px 7px;border-radius:99px;margin-right:4px}
pre{font-size:11px;white-space:pre-wrap;word-break:break-word;background:#f4f4f4;border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;line-height:1.55;margin:6px 0 10px;font-family:inherit}
.doc-footer{margin-top:36px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#bbb}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}blockquote{background:#faf7ff!important}.callout{background:#f9f9f9!important}.badge{background:#f5f0ff!important}}
</style></head>
<body>
<div class="doc-header">
  <div class="left">
    <div class="brand">Patel · Q CXO</div>
    <h1>${title}</h1>
    <div class="doc-type">${docType}</div>
  </div>
  <div class="right"><div>${date}</div><div style="margin-top:4px">Confidential</div></div>
</div>
${contentHtml}
<div class="doc-footer">
  <span>Generated by Patel, Q CXO Agent</span>
  <span>${docType} · ${date}</span>
</div>
</body></html>`
}

function downloadArtifact(content: Record<string, unknown>, type: string, title?: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  const docType = DOC_TYPE_LABELS[type] ?? 'Document'
  const html = buildPrintHtml(renderToHtml(content, type), title ?? 'Document', docType)
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ─── source citation chips ────────────────────────────────────────────────────

const SOURCE_ICONS: Record<SourceItem['type'], string> = {
  profile:     '📋',
  memory:      '💬',
  artifact:    '📄',
  cross_agent: '🔗',
}

function SourceChips({ sources }: { sources: SourceItem[] }) {
  if (!sources.length) return null
  return (
    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
      <span style={{ fontSize: 9, color: muted, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, flexShrink: 0 }}>
        Referenced from
      </span>
      {sources.map((src, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: muted,
          background: `${ink}07`, border: `1px solid ${bdr}`,
          borderRadius: 99, padding: '2px 8px', fontWeight: 500,
        }}>
          <span style={{ fontSize: 9 }}>{SOURCE_ICONS[src.type]}</span>
          {src.label}
        </span>
      ))}
    </div>
  )
}

// ─── input bar ────────────────────────────────────────────────────────────────

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.pptx,.csv,.txt,.rtf,.doc,.ppt,.odt,.png,.jpg,.jpeg,.webp'

function InputBar({
  value, onChange, onKeyDown, onSend, disabled, placeholder, accent,
  pendingFiles, uploadingFile, fileUploadError, onAttachFile, onRemoveFile, agentId,
}: {
  value:            string
  onChange:         (v: string) => void
  onKeyDown:        (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend:           () => void
  disabled:         boolean
  placeholder:      string
  accent:           string
  pendingFiles:     PendingFile[]
  uploadingFile:    boolean
  fileUploadError:  string | null
  onAttachFile:     (file: File) => void
  onRemoveFile:     (id: string) => void
  agentId:          string
}) {
  const [focused, setFocused] = React.useState(false)
  const [slashSkills, setSlashSkills] = React.useState<Skill[]>([])
  const [slashIdx, setSlashIdx] = React.useState(0)
  const hasText = value.trim().length > 0
  const canSend = (hasText || pendingFiles.length > 0) && !uploadingFile
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Slash command autocomplete — fires when input starts with '/'
  React.useEffect(() => {
    if (!value.startsWith('/')) { setSlashSkills([]); return }
    const query = value.slice(1).toLowerCase()
    const allSkills = getSkillsForAgent(agentId)
    setSlashSkills(allSkills.filter(s =>
      s.command.includes(query) || s.label.toLowerCase().includes(query)
    ))
    setSlashIdx(0)
  }, [value, agentId])

  function selectSkill(skill: Skill) {
    const trigger = `/${skill.command} `
    onChange(trigger)
    setSlashSkills([])
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function handleKeyDownWithSlash(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (slashSkills.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, slashSkills.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Tab' || e.key === 'Enter') {
        const skill = slashSkills[slashIdx]
        if (skill) { e.preventDefault(); selectSkill(skill); return }
      }
      if (e.key === 'Escape') { setSlashSkills([]); return }
    }
    // Expand skill if user sends with a recognized slash command
    if (e.key === 'Enter' && !e.shiftKey && value.startsWith('/')) {
      const parts = value.slice(1).split(' ')
      const cmd   = parts[0]
      const arg   = parts.slice(1).join(' ')
      const skill = getSkillsForAgent(agentId).find(s => s.command === cmd)
      if (skill && arg.trim()) {
        e.preventDefault()
        onChange(expandSkillPrompt(skill, arg))
        setSlashSkills([])
        setTimeout(() => onSend(), 0)
        return
      }
    }
    onKeyDown(e)
  }

  React.useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onAttachFile(file)
    e.target.value = ''
  }

  return (
    <div style={{ flexShrink: 0, padding: '10px 40px 20px', background: bg }}>
      <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>

        {/* slash command autocomplete dropdown */}
        {slashSkills.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 50,
            background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden',
            marginBottom: 6,
          }}>
            <div style={{ padding: '6px 12px 4px', borderBottom: `1px solid ${bdr}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Skills</span>
            </div>
            {slashSkills.map((skill, i) => (
              <button
                key={skill.command}
                onClick={() => selectSkill(skill)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 14px', background: i === slashIdx ? `${bdr}` : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  borderBottom: i < slashSkills.length - 1 ? `1px solid ${bdr}` : 'none',
                }}
                onMouseEnter={() => setSlashIdx(i)}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{skill.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>/{skill.command}</span>
                    {skill.argPlaceholder && (
                      <span style={{ fontSize: 11, color: muted }}>{skill.argPlaceholder}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: muted, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.description}</p>
                </div>
                <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>↵</span>
              </button>
            ))}
          </div>
        )}

        {/* file chips */}
        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, paddingLeft: 4 }}>
            {pendingFiles.map(f => (
              <div key={f.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#EEF2FF', border: '1px solid #C7D2FE',
                borderRadius: 8, padding: '4px 8px 4px 7px',
                fontSize: 11.5, color: '#4338CA', fontWeight: 500,
              }}>
                <FileText size={11} style={{ flexShrink: 0, color: '#6366F1' }} />
                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.filename}
                </span>
                {f.truncated && (
                  <span style={{ fontSize: 10, color: '#818CF8', fontWeight: 400 }}>(truncated)</span>
                )}
                <button
                  onClick={() => onRemoveFile(f.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: '#818CF8' }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* error */}
        {fileUploadError && (
          <div style={{ fontSize: 11.5, color: '#DC2626', marginBottom: 6, paddingLeft: 4 }}>
            {fileUploadError}
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 10,
          padding: '10px 10px 10px 12px',
          background: '#fff',
          borderRadius: 18,
          boxShadow: focused
            ? `0 0 0 2px ${accent}35, 0 2px 12px rgba(0,0,0,0.08)`
            : `0 0 0 1.5px ${bdr}, 0 2px 8px rgba(0,0,0,0.05)`,
          transition: 'box-shadow 0.18s',
        }}>
          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* paperclip button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile || pendingFiles.length >= 3}
            title={pendingFiles.length >= 3 ? 'Max 3 files per message' : 'Attach document'}
            style={{
              height: 32, width: 32, borderRadius: 8, flexShrink: 0,
              background: 'none', border: 'none',
              cursor: (uploadingFile || pendingFiles.length >= 3) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: pendingFiles.length >= 3 ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {uploadingFile ? (
              <motion.div
                style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${accent}40`, borderTopColor: accent }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              />
            ) : (
              <Paperclip size={15} style={{ color: muted }} />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDownWithSlash}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setTimeout(() => setSlashSkills([]), 150) }}
            placeholder={placeholder}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 14, color: ink, fontFamily: 'inherit',
              resize: 'none', lineHeight: 1.6, overflowY: 'auto',
              paddingTop: 2, paddingBottom: 2,
            }}
          />
          <button
            onClick={onSend}
            disabled={disabled || !canSend}
            style={{
              height: 36, width: 36, borderRadius: '50%', flexShrink: 0,
              background: canSend ? accent : bdr,
              border: 'none',
              cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, transform 0.1s',
              transform: canSend ? 'scale(1)' : 'scale(0.92)',
            }}
            onMouseEnter={e => { if (canSend) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = canSend ? 'scale(1)' : 'scale(0.92)' }}
          >
            <Send size={14} style={{ color: canSend ? '#fff' : muted }} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── props ────────────────────────────────────────────────────────────────────

export interface AgentChatPanelProps {
  agentId:                 string
  name:                    string
  accent:                  string
  badge?:                  string
  description?:            string
  suggestedPrompts?:       string[]
  convId?:                 string
  onConversationCreated?:  (id: string) => void
  onOpenArtifact?:         (artifactId: string) => void
}

// ─── component ────────────────────────────────────────────────────────────────

export function AgentChatPanel({
  agentId,
  name,
  accent,
  badge,
  description,
  suggestedPrompts = [],
  convId,
  onConversationCreated,
  onOpenArtifact,
}: AgentChatPanelProps) {
  const workspace = useAgentWorkspace(agentId)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  function toggleCard(id: string) {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  // Switch to specific conversation when convId prop is provided.
  // Skip if this convId was just assigned by the active stream — messages are
  // already in state and re-fetching would race with the ongoing stream.
  useEffect(() => {
    if (!convId || workspace.loading) return
    if (convId === workspace.conversationId) return
    workspace.switchConversation(convId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, workspace.loading, workspace.conversationId])

  // Notify parent when a new conversation is created
  const prevConvIdRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (!workspace.conversationId) return
    if (workspace.conversationId === prevConvIdRef.current) return
    if (prevConvIdRef.current === null) {
      // Initial load — just record, don't fire
      prevConvIdRef.current = workspace.conversationId
      return
    }
    prevConvIdRef.current = workspace.conversationId
    onConversationCreated?.(workspace.conversationId)
  }, [workspace.conversationId, onConversationCreated])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bg, color: ink }}>

      {/* score boost toast */}
      <AnimatePresence>
        {workspace.scoreBoost && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: '#052e16', color: '#bbf7d0', borderRadius: 12,
              padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }}
          >
            <TrendingUp size={15} style={{ color: '#4ade80' }} />
            Q-Score +{workspace.scoreBoost.points} pts · {workspace.scoreBoost.dimension} boosted
          </motion.div>
        )}
      </AnimatePresence>

      {/* top bar */}
      <div style={{
        flexShrink: 0, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: `1px solid ${bdr}`, background: bg,
      }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: muted }}>
          {workspace.conversations.find(c => c.id === workspace.conversationId)?.title ?? 'Chat'}
        </p>
        {badge && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#F5F3EE', border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 10, color: muted, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />
            {badge}
          </div>
        )}
      </div>

      {/* message list + input */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* suggested prompts (empty state) */}
            <AnimatePresence>
              {workspace.showPrompts && suggestedPrompts.length > 0 && (
                <motion.div key="prompts" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                    <div style={{ height: 40, width: 40, borderRadius: 12, flexShrink: 0, background: `${accent}15`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: accent }}>
                      {name[0]}
                    </div>
                    <div style={{ paddingTop: 2 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>
                        {name}{badge ? `, ${badge}` : ''}
                      </div>
                      {description && (
                        <div style={{ fontSize: 13, lineHeight: 1.65, color: muted, maxWidth: 520 }}>
                          {description}
                        </div>
                      )}
                      {!description && (
                        <div style={{ fontSize: 13, color: muted }}>Ready when you are.</div>
                      )}
                    </div>
                  </div>
                  {suggestedPrompts.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, opacity: 0.6, marginBottom: 8, paddingLeft: 1 }}>
                      Start here
                    </div>
                  )}
                  <div style={{ paddingLeft: 44, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {suggestedPrompts.map((p, i) => (
                      <button key={i} onClick={() => workspace.send(p)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          padding: '9px 12px', borderRadius: 8, fontSize: 12,
                          background: 'transparent', border: `1px solid ${bdr}`,
                          color: muted, cursor: 'pointer', fontFamily: 'inherit',
                          textAlign: 'left', transition: 'all .15s',
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${accent}60`; el.style.color = ink; el.style.background = `${accent}05` }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = bdr; el.style.color = muted; el.style.background = 'transparent' }}
                      >
                        <span style={{ flex: 1 }}>{p}</span>
                        <span style={{ fontSize: 11, opacity: 0.4, flexShrink: 0 }}>↗</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* messages */}
            {workspace.uiMessages.map((msg, idx) => {
              if (msg.role === 'agent' && !msg.text && !msg.sources) return null
              if (msg.role === 'artifact_card') {
                // Use artifactId as expand key; fall back to message index so null-ID artifacts still toggle correctly
                const cardKey = msg.artifactId ?? `artifact-${idx}`
                const isExpanded = expandedCards.has(cardKey)
                const fullArtifact: ArtifactRecord | undefined = workspace.artifacts.find(a => a.id === msg.artifactId)
                const canInline = !!fullArtifact
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    {/* header row */}
                    <div style={{
                      border: `1px solid ${bdr}`,
                      borderRadius: isExpanded ? '12px 12px 0 0' : 12,
                      padding: '14px 18px',
                      background: '#F9F8F6', display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: '#F5F0FF', border: '1.5px solid #C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={15} style={{ color: '#7C3AED' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7C3AED', marginBottom: 2 }}>
                          Document ready
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {msg.artifactTitle ?? 'Untitled document'}
                        </div>
                      </div>
                      {/* view/collapse toggle — available for all document types */}
                      {canInline && (
                        <button
                          onClick={() => toggleCard(cardKey)}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            border: `1px solid #C4B5FD`,
                            background: isExpanded ? '#7C3AED' : 'transparent',
                            color: isExpanded ? '#fff' : '#7C3AED',
                            fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                          }}
                        >
                          {isExpanded ? 'Collapse ↑' : 'View document ↓'}
                        </button>
                      )}
                      {/* download PDF — shown when expanded */}
                      {isExpanded && fullArtifact && (
                        <button
                          onClick={() => downloadArtifact(fullArtifact.content, fullArtifact.type, msg.artifactTitle)}
                          title="Download PDF"
                          style={{
                            padding: '7px 10px', borderRadius: 8,
                            border: `1px solid ${bdr}`, background: 'transparent',
                            color: muted, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: 5, fontSize: 12,
                            fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
                          }}
                        >
                          <Download size={13} /> PDF
                        </button>
                      )}
                      {/* fallback "open in dashboard" when content not loaded */}
                      {!canInline && onOpenArtifact && (
                        <button
                          onClick={() => onOpenArtifact(msg.artifactId!)}
                          style={{
                            padding: '7px 14px', borderRadius: 8, border: 'none',
                            background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                          }}
                        >
                          View document →
                        </button>
                      )}
                    </div>
                    {/* inline document viewer — uses shared renderer dispatch for all artifact types */}
                    {isExpanded && fullArtifact && (
                      <div style={{
                        border: `1px solid ${bdr}`, borderTop: 'none',
                        borderRadius: '0 0 12px 12px',
                        padding: '20px 18px', background: '#fff',
                        maxHeight: 620, overflowY: 'auto',
                      }}>
                        {renderArtifactContent(fullArtifact, workspace.userId)}
                      </div>
                    )}
                  </motion.div>
                )
              }
              return (
              <motion.div key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
              >
                {msg.role !== 'user' && (
                  <div style={{ height: 34, width: 34, borderRadius: 10, flexShrink: 0, marginTop: 1, background: `${accent}15`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                    {msg.role === 'tool' ? '⚡' : name[0]}
                  </div>
                )}
                {msg.role === 'tool' && msg.toolActivity ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#F5F3EE', border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 12, color: muted, maxWidth: '72%' }}>
                    {msg.toolActivity.status === 'running'
                      ? <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
                      : <CheckCircle2 size={11} style={{ color: '#16a34a', flexShrink: 0 }} />
                    }
                    <span style={{ color: msg.toolActivity.status === 'running' ? ink : muted }}>
                      {msg.toolActivity.status === 'running' ? msg.toolActivity.label : (msg.toolActivity.summary ?? msg.toolActivity.label)}
                    </span>
                  </div>
                ) : msg.role === 'user' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, maxWidth: '68%' }}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                        {msg.attachments.map((a, ai) => (
                          <div key={ai} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#EEF2FF', border: '1px solid #C7D2FE',
                            borderRadius: 6, padding: '2px 7px',
                            fontSize: 11, color: '#4338CA', fontWeight: 500,
                          }}>
                            <Paperclip size={9} />
                            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.filename}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.text && (
                      <div style={{
                        background: `${accent}0D`,
                        border: `1px solid ${accent}25`,
                        borderRadius: 14,
                        padding: '11px 16px', fontSize: 13, lineHeight: 1.65,
                        wordBreak: 'break-word', color: ink,
                        whiteSpace: 'pre-wrap', width: '100%',
                      }}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ maxWidth: '86%', wordBreak: 'break-word', paddingTop: 4 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.78, color: ink }}>
                      {renderMd(msg.text)}
                    </div>
                    {msg.sources && <SourceChips sources={msg.sources} />}
                  </div>
                )}
              </motion.div>
              )
            })}

            {/* typing indicator */}
            {workspace.typing && workspace.uiMessages[workspace.uiMessages.length - 1]?.role !== 'agent' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: 12 }}>
                <div style={{ height: 34, width: 34, borderRadius: 10, flexShrink: 0, background: `${accent}15`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: accent }}>
                  {name[0]}
                </div>
                <TypingPhrase accent={accent} />
              </motion.div>
            )}

            <div ref={workspace.bottomRef} />
          </div>
        </div>

        {/* upgrade gate — shown when monthly limit is reached */}
        <AnimatePresence>
          {workspace.limitReached && (
            <motion.div
              key="upgrade-gate"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                flexShrink: 0, margin: '0 40px 12px',
                padding: '18px 20px',
                background: '#1e1b4b',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e7ff', marginBottom: 4 }}>
                  You&apos;ve used your 50 free sessions this month
                </div>
                <div style={{ fontSize: 12, color: '#a5b4fc', lineHeight: 1.5 }}>
                  Upgrade to Premium for $29/mo — 500 sessions, unlimited investor connections, and priority model access.
                </div>
              </div>
              <a
                href="/founder/billing"
                style={{
                  flexShrink: 0, padding: '9px 18px',
                  background: '#6366f1', color: '#fff',
                  borderRadius: 10, fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                Upgrade →
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* approval required banner */}
        <AnimatePresence>
          {workspace.pendingApproval && (
            <motion.div
              key="approval-required"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              style={{
                flexShrink: 0, margin: '0 40px 6px',
                padding: '12px 16px',
                background: '#FFF7ED', border: '1px solid #FED7AA',
                borderRadius: 10, fontSize: 13, color: '#7C2D12',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 16 }}>⚡</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, margin: '0 0 2px' }}>Action pending approval: {workspace.pendingApproval.label}</p>
                <p style={{ fontSize: 11.5, color: '#9A3412', margin: 0 }}>Review and confirm in your Actions panel before this sends.</p>
              </div>
              <button
                onClick={workspace.dismissApproval}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A3412', fontSize: 16, padding: 4, lineHeight: 1 }}
              >×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* context compression notice */}
        <AnimatePresence>
          {workspace.contextCompressed && (
            <motion.div
              key="ctx-compressed"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              style={{
                flexShrink: 0, margin: '0 40px 6px',
                padding: '7px 12px',
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 8, fontSize: 11.5, color: '#92400E',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>⚠</span>
              {workspace.contextCompressed.droppedCount} older artifact{workspace.contextCompressed.droppedCount > 1 ? 's were' : ' was'} summarized to fit context — open your workspace to view all deliverables.
            </motion.div>
          )}
        </AnimatePresence>

        {/* input bar */}
        <InputBar
          value={workspace.input}
          onChange={workspace.setInput}
          onKeyDown={workspace.handleKeyDown}
          onSend={() => workspace.send()}
          disabled={workspace.typing || workspace.limitReached}
          placeholder={workspace.limitReached ? 'Upgrade to continue chatting…' : `Message ${name}…`}
          accent={accent}
          pendingFiles={workspace.pendingFiles}
          uploadingFile={workspace.uploadingFile}
          fileUploadError={workspace.fileUploadError}
          onAttachFile={workspace.attachFile}
          onRemoveFile={workspace.removeFile}
          agentId={agentId}
        />
      </div>
    </div>
  )
}
