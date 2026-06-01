'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface SourceItem {
  label: string
  type: 'profile' | 'memory' | 'artifact' | 'cross_agent'
}

export interface UiMessage {
  role: 'agent' | 'user' | 'tool' | 'artifact_card'
  text: string
  toolActivity?: { toolName: string; label: string; status: 'running' | 'done'; summary?: string }
  sources?: SourceItem[]
  artifactId?: string
  artifactType?: string
  artifactTitle?: string
  attachments?: Array<{ filename: string; mimeType: string }>
}

export interface PendingFile {
  id: string
  filename: string
  mimeType: string
  parsedText: string
  confidence: number
  truncated: boolean
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
export interface ConversationSummary {
  id: string
  title: string | null
  last_message_at: string | null
  message_count: number
}

export interface AgentWorkspaceState {
  userId:               string | null
  conversationId:       string | null
  uiMessages:           UiMessage[]
  apiMessages:          ApiMessage[]
  input:                string
  setInput:             (v: string) => void
  typing:               boolean
  showPrompts:          boolean
  loading:              boolean
  artifacts:            ArtifactRecord[]
  actions:              ActionItem[]
  extracting:           boolean
  scoreBoost:           { points: number; dimension: string } | null
  latestArtifact:       ArtifactRecord | null
  conversations:        ConversationSummary[]
  pendingFiles:         PendingFile[]
  uploadingFile:        boolean
  fileUploadError:      string | null
  attachFile:           (file: File) => Promise<void>
  removeFile:           (id: string) => void
  send:                 (text?: string) => void
  handleKeyDown:        (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  toggleAction:         (id: string, status: string) => Promise<void>
  extractActions:       () => Promise<void>
  switchConversation:   (id: string) => Promise<void>
  newConversation:      () => void
  bottomRef:            React.RefObject<HTMLDivElement | null>
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
  const [conversations,  setConversations] = useState<ConversationSummary[]>([])
  const [pendingFiles,   setPendingFiles]  = useState<PendingFile[]>([])
  const [uploadingFile,  setUploadingFile] = useState(false)
  const [fileUploadError, setFileUploadError] = useState<string | null>(null)

  const bottomRef        = useRef<HTMLDivElement>(null)
  const abortRef         = useRef<AbortController | null>(null)
  const pendingSourcesRef = useRef<SourceItem[] | null>(null)

  // Auth
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d?.user?.id) setUserId(d.user.id)
    })
  }, [])

  const refreshConversations = useCallback(() => {
    fetch(`/api/agents/conversations?agentId=${agentId}`)
      .then(r => r.json())
      .then(d => setConversations(d.conversations ?? []))
      .catch(() => {})
  }, [agentId])

  // Load history + artifacts + actions + conversations once userId is known
  useEffect(() => {
    if (!userId) return
    async function load() {
      // Fire all 4 requests simultaneously — no waterfall
      const [hr, ar, acr, cr] = await Promise.all([
        fetch(`/api/agents/chat?agentId=${agentId}&limit=40`),
        fetch(`/api/agents/artifacts?agentId=${agentId}&limit=30`),
        fetch(`/api/agents/actions?agentId=${agentId}`),
        fetch(`/api/agents/conversations?agentId=${agentId}`),
      ])
      let textMsgs: UiMessage[] = []
      let convId: string | null = null
      if (hr.ok) {
        const hd = await hr.json()
        textMsgs = (hd.messages ?? []).map((m: ApiMessage) => ({
          role: m.role === 'assistant' ? 'agent' : 'user', text: m.content,
        }))
        const api = (hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content }))
        if (textMsgs.length > 0) setShowPrompts(false)
        if (hd.conversationId) { convId = hd.conversationId; setConvId(hd.conversationId) }
        setApiMessages(api)
      }
      setLoading(false)
      if (ar.ok) {
        const ad = await ar.json()
        setArtifacts((ad.artifacts ?? []).map((a: RawArtifact) => ({
          id: a.id, type: a.artifact_type, title: a.title,
          content: a.content, created_at: a.created_at,
        })))
      }
      if (acr.ok) setActions((await acr.json()).actions ?? [])
      if (cr.ok)  setConversations((await cr.json()).conversations ?? [])

      // Reconstruct artifact_card messages for this conversation
      if (convId) {
        const convAr = await fetch(`/api/agents/artifacts?agentId=${agentId}&conversationId=${convId}&limit=30`)
        if (convAr.ok) {
          const convAd = await convAr.json()
          const convArtifacts: ArtifactRecord[] = (convAd.artifacts ?? []).map((a: RawArtifact) => ({
            id: a.id, type: a.artifact_type, title: a.title,
            content: a.content, created_at: a.created_at,
          }))
          if (convArtifacts.length > 0) {
            setArtifacts(prev => {
              const ids = new Set(convArtifacts.map(a => a.id))
              return [...prev.filter(a => !ids.has(a.id)), ...convArtifacts]
            })
            const cards: UiMessage[] = convArtifacts.map(a => ({
              role: 'artifact_card' as const, text: '',
              artifactId: a.id, artifactType: a.type, artifactTitle: a.title,
            }))
            setUiMessages([...textMsgs, ...cards])
            return
          }
        }
      }
      setUiMessages(textMsgs)
    }
    load()
  }, [userId, agentId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [uiMessages, typing])

  const switchConversation = useCallback(async (id: string) => {
    setUiMessages([]); setApiMessages([]); setShowPrompts(false)
    const [hr, convAr] = await Promise.all([
      fetch(`/api/agents/chat?agentId=${agentId}&conversationId=${id}&limit=40`),
      fetch(`/api/agents/artifacts?agentId=${agentId}&conversationId=${id}&limit=30`),
    ])
    let textMsgs: UiMessage[] = []
    if (hr.ok) {
      const hd = await hr.json()
      textMsgs = (hd.messages ?? []).map((m: ApiMessage) => ({
        role: m.role === 'assistant' ? 'agent' : 'user', text: m.content,
      }))
      setApiMessages((hd.messages ?? []).map((m: ApiMessage) => ({ role: m.role, content: m.content })))
      setConvId(id)
    }
    if (convAr.ok) {
      const convAd = await convAr.json()
      const convArtifacts: ArtifactRecord[] = (convAd.artifacts ?? []).map((a: RawArtifact) => ({
        id: a.id, type: a.artifact_type, title: a.title,
        content: a.content, created_at: a.created_at,
      }))
      if (convArtifacts.length > 0) {
        setArtifacts(prev => {
          const ids = new Set(convArtifacts.map(a => a.id))
          return [...prev.filter(a => !ids.has(a.id)), ...convArtifacts]
        })
        const cards: UiMessage[] = convArtifacts.map(a => ({
          role: 'artifact_card' as const, text: '',
          artifactId: a.id, artifactType: a.type, artifactTitle: a.title,
        }))
        setUiMessages([...textMsgs, ...cards])
        return
      }
    }
    setUiMessages(textMsgs)
  }, [agentId])

  const newConversation = useCallback(() => {
    setUiMessages([]); setApiMessages([])
    setConvId(null); setShowPrompts(true)
  }, [])

  const attachFile = useCallback(async (file: File) => {
    if (pendingFiles.length >= 3) {
      setFileUploadError('Maximum 3 files per message')
      return
    }
    setUploadingFile(true)
    setFileUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/agents/chat/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setFileUploadError(json.error ?? 'Upload failed')
        return
      }
      setPendingFiles(p => [...p, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: json.filename,
        mimeType: json.mimeType,
        parsedText: json.parsedText,
        confidence: json.confidence,
        truncated: json.truncated,
      }])
    } catch {
      setFileUploadError('Upload failed — please try again')
    } finally {
      setUploadingFile(false)
    }
  }, [pendingFiles])

  const removeFile = useCallback((id: string) => {
    setPendingFiles(p => p.filter(f => f.id !== id))
    setFileUploadError(null)
  }, [])

  const send = useCallback(async (text?: string) => {
    const userText = (text ?? input).trim()
    const hasFiles = pendingFiles.length > 0
    if (!userText && !hasFiles) return
    if (typing) return

    // Build file prefix — each attached document's parsed text is prepended as context
    let filePrefix = ''
    if (hasFiles) {
      filePrefix = pendingFiles.map(f =>
        `[Attached: ${f.filename}]${f.truncated ? ' (truncated to 6,000 chars)' : ''}\n` +
        `--- Document Content ---\n${f.parsedText}\n--- End Document ---`
      ).join('\n\n') + '\n\n'
    }

    const msg = filePrefix + userText

    setShowPrompts(false); setTyping(true)
    const attachments = hasFiles
      ? pendingFiles.map(f => ({ filename: f.filename, mimeType: f.mimeType }))
      : undefined
    const userMsg: UiMessage  = {
      role: 'user',
      text: userText || `Sent ${pendingFiles.length} document${pendingFiles.length > 1 ? 's' : ''}`,
      attachments,
    }
    const userApi: ApiMessage = { role: 'user', content: msg }
    setUiMessages(p => [...p, userMsg])
    const nextApi = [...apiMessages, userApi]
    setApiMessages(nextApi); setInput('')
    setPendingFiles([]); setFileUploadError(null)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    let agentText = ''; let isFirstDelta = true

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message: msg, conversationHistory: apiMessages, stream: true, conversationId,
          // Derived from artifact cards already rendered — persists across HMR and works
          // even when the DB save was blocked by CHECK constraint (artifactId = null).
          clientBuiltTypes: [...new Set(uiMessages.filter(m => m.role === 'artifact_card' && m.artifactType).map(m => m.artifactType as string))],
        }),
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

          if (evt.type === 'sources_used') {
            pendingSourcesRef.current = evt.sources as SourceItem[]
          } else if (evt.type === 'delta') {
            agentText += evt.text as string
            if (isFirstDelta) {
              isFirstDelta = false
              setUiMessages(p => [...p, { role: 'agent', text: agentText }])
            } else {
              setUiMessages(p => p.map((m, i) => i === p.length - 1 ? { ...m, text: agentText } : m))
            }
          } else if (evt.type === 'tool_start') {
            const tm: UiMessage = { role: 'tool', text: '', toolActivity: { toolName: evt.toolName as string, label: evt.label as string, status: 'running' } }
            setUiMessages(p => [...p, tm])
          } else if (evt.type === 'tool_done') {
            setUiMessages(p => {
              const lastRunning = [...p].map((m, i) => ({ m, i })).reverse().find(({ m }) => m.role === 'tool' && m.toolActivity?.status === 'running')
              if (!lastRunning) return p
              return p.map((m, i) => i === lastRunning.i ? { ...m, toolActivity: { ...m.toolActivity!, status: 'done', summary: evt.summary as string } } : m)
            })

          } else if (evt.type === 'artifact') {
            const a = evt.artifact as ArtifactRecord & { type: string }
            const rec: ArtifactRecord = { id: a.id, type: a.type, title: a.title, content: a.content }
            setArtifacts(p => {
              const idx = p.findIndex(x => x.id === a.id)
              if (idx >= 0) return p.map((x, i) => i === idx ? { ...x, ...rec } : x)
              return [...p, rec]
            })
            setLatestArtifact(rec)
            setUiMessages(p => [...p, {
              role: 'artifact_card',
              text: '',
              artifactId: rec.id,
              artifactType: rec.type,
              artifactTitle: rec.title,
            }])
          } else if (evt.type === 'score_signal' && evt.boosted) {
            setScoreBoost({ points: evt.points as number, dimension: evt.dimension as string })
            setTimeout(() => setScoreBoost(null), 4000)
          } else if (evt.type === 'conversation_id' && evt.id) {
            setConvId(evt.id as string)
            refreshConversations()
          } else if (evt.type === 'done' && evt.conversationId) {
            setConvId(evt.conversationId as string)
            refreshConversations()
          } else if (evt.type === 'debug_db_error') {
            console.error('[DB save error]', evt.toolName, 'code:', evt.code, 'message:', evt.message)
          }
        }
      }
      setApiMessages(p => [...p, { role: 'assistant', content: agentText }])
      // Attach collected sources to the last agent message
      if (pendingSourcesRef.current) {
        const sources = pendingSourcesRef.current
        pendingSourcesRef.current = null
        setUiMessages(p => p.map((m, i) =>
          i === p.length - 1 && m.role === 'agent' ? { ...m, sources } : m
        ))
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setUiMessages(p => [...p, { role: 'agent', text: 'Something went wrong. Please try again.' }])
      }
    } finally { setTyping(false) }
  }, [typing, apiMessages, conversationId, agentId, input, pendingFiles, refreshConversations, uiMessages])

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
    conversations,
    pendingFiles, uploadingFile, fileUploadError, attachFile, removeFile,
    send, handleKeyDown, toggleAction, extractActions,
    switchConversation, newConversation,
    bottomRef,
  }
}
