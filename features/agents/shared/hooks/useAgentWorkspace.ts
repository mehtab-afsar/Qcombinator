'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface UiMessage {
  role: 'agent' | 'user' | 'tool'
  text: string
  toolActivity?: { toolName: string; label: string; status: 'running' | 'done'; summary?: string }
}
export interface ApiMessage { role: 'user' | 'assistant'; content: string }
export interface ActionItem {
  id: string; action_text: string; priority: string; status: string
  action_type?: string; cta_label?: string
}
export interface ArtifactRecord {
  id: string; type: string; title: string
  content: Record<string, unknown>; created_at?: string
}

export interface AgentWorkspaceState {
  userId:          string | null
  conversationId:  string | null
  uiMessages:      UiMessage[]
  apiMessages:     ApiMessage[]
  input:           string
  setInput:        (v: string) => void
  typing:          boolean
  showPrompts:     boolean
  loading:         boolean
  artifacts:       ArtifactRecord[]
  actions:         ActionItem[]
  extracting:      boolean
  scoreBoost:      { points: number; dimension: string } | null
  latestArtifact:  ArtifactRecord | null
  send:            (text?: string) => void
  handleKeyDown:   (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  toggleAction:    (id: string, status: string) => Promise<void>
  extractActions:  () => Promise<void>
  bottomRef:       React.RefObject<HTMLDivElement | null>
}

interface RawArtifact {
  id: string; artifact_type: string; title: string
  content: Record<string, unknown>; created_at: string
}

export function useAgentWorkspace(agentId: string): AgentWorkspaceState {
  const [userId,         setUserId]        = useState<string | null>(null)
  const [conversationId, setConvId]        = useState<string | null>(null)
  const [uiMessages,     setUiMessages]    = useState<UiMessage[]>([])
  const [apiMessages,    setApiMessages]   = useState<ApiMessage[]>([])
  const [input,          setInput]         = useState('')
  const [typing,         setTyping]        = useState(false)
  const [showPrompts,    setShowPrompts]   = useState(true)
  const [loading,        setLoading]       = useState(true)
  const [artifacts,      setArtifacts]     = useState<ArtifactRecord[]>([])
  const [actions,        setActions]       = useState<ActionItem[]>([])
  const [extracting,     setExtracting]    = useState(false)
  const [scoreBoost,     setScoreBoost]    = useState<{ points: number; dimension: string } | null>(null)
  const [latestArtifact, setLatestArtifact]= useState<ArtifactRecord | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef  = useRef<AbortController | null>(null)

  // Auth
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.id) setUserId(d.user.id)
    })
  }, [])

  // Load history + artifacts + actions once userId is known
  useEffect(() => {
    if (!userId) return
    async function load() {
      // Messages
      const hr = await fetch(`/api/agents/chat?agentId=${agentId}&limit=40`)
      if (hr.ok) {
        const hd = await hr.json()
        const msgs = (hd.messages ?? []).map((m: ApiMessage) => ({
          role: m.role === 'assistant' ? 'agent' : 'user', text: m.content,
        }))
        const api = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }))
        setUiMessages(msgs); setApiMessages(api)
        if (msgs.length > 0) setShowPrompts(false)
        if (hd.conversationId) setConvId(hd.conversationId)
      }
      setLoading(false)

      // Artifacts
      const ar = await fetch(`/api/agents/artifacts?agentId=${agentId}&limit=30`)
      if (ar.ok) {
        const ad = await ar.json()
        setArtifacts((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type, title: a.title,
          content: a.content, created_at: a.created_at,
        })))
      }

      // Actions
      const acr = await fetch(`/api/agents/actions?agentId=${agentId}`)
      if (acr.ok) {
        const acd = await acr.json()
        setActions(acd.actions ?? [])
      }
    }
    load()
  }, [userId, agentId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [uiMessages, typing])

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || typing) return
    setShowPrompts(false); setTyping(true)
    const userMsg: UiMessage  = { role: 'user', text: msg }
    const userApi: ApiMessage = { role: 'user', content: msg }
    setUiMessages(p => [...p, userMsg])
    const nextApi = [...apiMessages, userApi]
    setApiMessages(nextApi); setInput('')

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    let toolIdx = -1; let agentText = ''

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, messages: nextApi, stream: true, conversationId }),
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader(); const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload || payload === '[DONE]') continue
          let evt: Record<string, unknown>
          try { evt = JSON.parse(payload) } catch { continue }

          if (evt.type === 'delta') {
            agentText += evt.text as string
            setUiMessages(p => {
              const idx = p.findLastIndex(m => m.role === 'agent')
              return idx === -1
                ? [...p, { role: 'agent', text: agentText }]
                : p.map((m, i) => i === idx ? { ...m, text: agentText } : m)
            })
          } else if (evt.type === 'tool_start') {
            const tm: UiMessage = { role: 'tool', text: '', toolActivity: { toolName: evt.toolName as string, label: evt.label as string, status: 'running' } }
            setUiMessages(p => { toolIdx = p.length; return [...p, tm] })
          } else if (evt.type === 'tool_done') {
            setUiMessages(p => p.map((m, i) => i === toolIdx ? { ...m, toolActivity: { ...m.toolActivity!, status: 'done', summary: evt.summary as string } } : m))
            toolIdx = -1
          } else if (evt.type === 'artifact') {
            const a = evt.artifact as ArtifactRecord & { type: string }
            const rec: ArtifactRecord = { id: a.id, type: a.type, title: a.title, content: a.content }
            setArtifacts(p => {
              const idx = p.findIndex(x => x.id === a.id)
              if (idx >= 0) return p.map((x, i) => i === idx ? { ...x, ...rec } : x)
              return [...p, rec]
            })
            setLatestArtifact(rec)
          } else if (evt.type === 'score_signal' && evt.boosted) {
            setScoreBoost({ points: evt.points as number, dimension: evt.dimension as string })
            setTimeout(() => setScoreBoost(null), 4000)
          } else if (evt.type === 'conversation_id' && evt.id) {
            setConvId(evt.id as string)
          }
        }
      }
      setApiMessages(p => [...p, { role: 'assistant', content: agentText }])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setUiMessages(p => [...p, { role: 'agent', text: 'Something went wrong. Please try again.' }])
      }
    } finally { setTyping(false) }
  }, [typing, apiMessages, conversationId, agentId, input])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }, [send])

  const toggleAction = useCallback(async (id: string, status: string) => {
    const next = status === 'done' ? 'pending' : 'done'
    setActions(p => p.map(a => a.id === id ? { ...a, status: next } : a))
    await fetch(`/api/agents/actions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }, [])

  const extractActions = useCallback(async () => {
    if (extracting || apiMessages.length < 4) return
    setExtracting(true)
    try {
      const res = await fetch('/api/agents/actions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, messages: apiMessages.slice(-20) }),
      })
      if (res.ok) setActions((await res.json()).actions ?? [])
    } finally { setExtracting(false) }
  }, [extracting, apiMessages, agentId])

  return {
    userId, conversationId,
    uiMessages, apiMessages,
    input, setInput, typing, showPrompts, loading,
    artifacts, actions, extracting, scoreBoost, latestArtifact,
    send, handleKeyDown, toggleAction, extractActions,
    bottomRef,
  }
}
