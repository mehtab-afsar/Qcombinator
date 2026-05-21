'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Send, X, Loader2,
  Lightbulb, HelpCircle, Star, Zap, Trash2, Image as ImageIcon,
  Briefcase, Users, TrendingUp,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber } from '@/lib/constants/colors'

// ─── types ────────────────────────────────────────────────────────────────────
interface FeedPost {
  id: string
  userId: string
  role: 'founder' | 'investor'
  postType: 'milestone' | 'update' | 'ask' | 'insight' | 'auto_event'
  body: string
  mediaUrl: string | null
  metadata: Record<string, unknown>
  likesCount: number
  commentsCount: number
  likedByMe: boolean
  createdAt: string
  author: { name: string; subtitle: string; avatarUrl: string | null; qScoreGrade?: string | null; qScore?: number | null }
  isOwn: boolean
}

interface FeedComment {
  id: string
  body: string
  createdAt: string
  isOwn: boolean
  author: { name: string; avatarUrl: string | null; role: 'founder' | 'investor' }
}

interface SidebarData {
  currentUser: {
    name: string | null; startup_name: string | null; firm_name?: string | null
    avatar_url: string | null; score: number | null; grade: string | null
    role: 'founder' | 'investor'
  }
  topFounders: { name: string; startup_name: string; avatar_url: string | null; score: number; grade: string }[]
  stats: { founderCount: number; investorCount: number }
}

type RoleFilter = 'all' | 'founder' | 'investor'

// ─── helpers ──────────────────────────────────────────────────────────────────
function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 7)  return `${d}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function scoreColor(score: number | null) {
  if (score === null) return muted
  if (score >= 70) return green
  if (score >= 50) return amber
  return muted
}

// ─── post type config ─────────────────────────────────────────────────────────
const POST_TYPES = [
  { key: 'update',    label: 'Update',    icon: Zap,        color: blue,      desc: 'Share what you\'re working on' },
  { key: 'milestone', label: 'Milestone', icon: Star,       color: green,     desc: 'Celebrate a win'               },
  { key: 'ask',       label: 'Ask',       icon: HelpCircle, color: amber,     desc: 'Ask the community for advice'  },
  { key: 'insight',   label: 'Insight',   icon: Lightbulb,  color: '#7C3AED', desc: 'Share a learning or thesis'   },
] as const

type PostTypeKey = typeof POST_TYPES[number]['key']

const postTypeBadge: Record<string, { bg: string; color: string; label: string }> = {
  milestone:  { bg: '#F0FDF4', color: green,     label: '🏆 Milestone' },
  update:     { bg: '#EFF6FF', color: blue,      label: '⚡ Update'    },
  ask:        { bg: '#FFFBEB', color: amber,     label: '🙋 Ask'       },
  insight:    { bg: '#F5F3FF', color: '#7C3AED', label: '💡 Insight'   },
  auto_event: { bg: surf,     color: muted,      label: '🤖 Event'     },
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 44, role }: { name: string; avatarUrl: string | null; size?: number; role?: 'founder' | 'investor' }) {
  const accentColor = role === 'investor' ? blue : green
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${bdr}` }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}30)`,
      border: `1.5px solid ${accentColor}35`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: accentColor,
    }}>
      {initials(name)}
    </div>
  )
}

// ─── type → left-border accent color ─────────────────────────────────────────
const TYPE_ACCENT: Record<string, string> = {
  milestone:  green,
  update:     blue,
  ask:        amber,
  insight:    '#7C3AED',
  auto_event: green,
}

// ─── AutoEventRow — compact auto-event pill ───────────────────────────────────
function AutoEventRow({ post, onDelete }: { post: FeedPost; onDelete: (id: string) => void }) {
  const meta  = post.metadata as Record<string, unknown>

  // Q-Score event: stored as newScore/prevScore (camelCase) from auto-events.ts
  const newScore  = (meta.newScore  ?? meta.new_score)  ? Number(meta.newScore ?? meta.new_score)  : null
  const prevScore = (meta.prevScore ?? meta.prev_score) ? Number(meta.prevScore ?? meta.prev_score) : null
  const grade     = (meta.grade as string | undefined) ?? null
  const delta     = newScore !== null && prevScore !== null ? newScore - prevScore : null

  // Artifact event
  const artifactType  = (meta.artifactType  as string | undefined) ?? null
  const artifactTitle = (meta.artifactTitle as string | undefined) ?? artifactType ?? null

  // Section completion event
  const eventType   = (meta.eventType   as string | undefined) ?? null
  const sectionName = (meta.sectionName as string | undefined) ?? null

  const isQScore   = newScore !== null
  const isArtifact = !isQScore && artifactType !== null
  const isSection  = eventType === 'section_complete'

  const sc = newScore !== null ? (newScore >= 70 ? green : newScore >= 50 ? amber : muted) : green
  const accentColor = isArtifact ? blue : isSection ? '#7C3AED' : green
  const emoji = isArtifact ? '⚡' : isSection ? '📋' : '🏆'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      layout
      style={{
        background: `${accentColor}06`,
        border: `1px solid ${accentColor}20`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${accentColor}14`, border: `1px solid ${accentColor}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, lineHeight: 1,
      }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0, lineHeight: 1.5 }}>
          {post.author.name}
          {isQScore && delta !== null && newScore !== null
            ? <span style={{ fontWeight: 400, color: muted }}>
                {` improved Q-Score `}
                <span style={{ fontWeight: 600, color: delta > 0 ? green : muted }}>{delta > 0 ? `+${delta}` : delta}</span>
                {` → `}
                <span style={{ fontWeight: 700, color: sc }}>{newScore}</span>
                {grade && <span style={{ fontWeight: 500, color: sc }}>{` (${grade})`}</span>}
              </span>
            : isArtifact
              ? <span style={{ fontWeight: 400, color: muted }}>{` built a `}<span style={{ fontWeight: 600, color: blue }}>{artifactTitle}</span></span>
              : isSection
                ? <span style={{ fontWeight: 400, color: muted }}>{` completed their `}<span style={{ fontWeight: 600, color: '#7C3AED' }}>{sectionName}</span>{` assessment`}</span>
                : <span style={{ fontWeight: 400, color: muted }}> {post.body}</span>
          }
        </p>
        <p style={{ fontSize: 12, color: muted, margin: '4px 0 0', lineHeight: 1 }}>
          {post.author.subtitle && `${post.author.subtitle} · `}{post.role === 'investor' ? 'Investor' : 'Founder'} · {relDate(post.createdAt)}
        </p>
      </div>
      {isQScore && grade !== null && newScore !== null && (
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 12px', borderRadius: 10, background: `${sc}12`, border: `1px solid ${sc}25` }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: sc, lineHeight: 1 }}>{newScore}</span>
          <span style={{ fontSize: 10, color: sc, fontWeight: 600, marginTop: 2 }}>{grade}</span>
        </div>
      )}
      {post.isOwn && (
        <button onClick={() => onDelete(post.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, flexShrink: 0, opacity: 0.6, transition: 'opacity .2s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
          title="Delete"
        >
          <Trash2 style={{ height: 12, width: 12 }} />
        </button>
      )}
    </motion.div>
  )
}

// ─── CommentThread — expandable comment section ───────────────────────────────
function CommentThread({
  postId, commentsCount: _commentsCount, myName, myAvatarUrl, myRole,
}: {
  postId: string; commentsCount: number; myName: string | null; myAvatarUrl: string | null; myRole: 'founder' | 'investor'
}) {
  const [comments,  setComments]  = useState<FeedComment[]>([])
  const [loaded,    setLoaded]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (loaded) return
    setLoading(true)
    fetch(`/api/feed/${postId}/comments`)
      .then(r => r.ok ? r.json() : { comments: [] })
      .then(d => { setComments(d.comments ?? []); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [postId, loaded])

  async function submitComment() {
    if (!input.trim() || sending) return
    setSending(true)
    const optimistic: FeedComment = {
      id: `opt-${Date.now()}`,
      body: input.trim(),
      createdAt: new Date().toISOString(),
      isOwn: true,
      author: { name: myName ?? 'You', avatarUrl: myAvatarUrl, role: myRole },
    }
    setComments(prev => [...prev, optimistic])
    setInput('')
    try {
      const res = await fetch(`/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: optimistic.body }),
      })
      const d = await res.json()
      if (res.ok && d.comment) {
        setComments(prev => prev.map(c => c.id === optimistic.id ? d.comment : c))
      }
    } catch { /* optimistic stays visible */ }
    finally { setSending(false) }
  }

  async function deleteComment(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId))
    await fetch(`/api/feed/${postId}/comments/${commentId}`, { method: 'DELETE' })
  }

  return (
    <div style={{ borderTop: `1px solid ${bdr}`, marginTop: 0, paddingTop: 16 }}>
      {loading && <p style={{ fontSize: 13, color: muted, margin: '0 0 12px' }}>Loading comments…</p>}
      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar name={c.author.name} avatarUrl={c.author.avatarUrl} size={30} role={c.author.role} />
              <div style={{ flex: 1, minWidth: 0, background: surf, borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.author.name}</span>
                  <span style={{ fontSize: 11, color: muted }}>{relDate(c.createdAt)}</span>
                  {c.isOwn && (
                    <button onClick={() => deleteComment(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 0, fontSize: 11, fontFamily: 'inherit', marginLeft: 'auto', opacity: 0.6, transition: 'opacity .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                    >Delete</button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: ink, margin: '5px 0 0', lineHeight: 1.65, wordBreak: 'break-word' }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Comment input */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar name={myName ?? '?'} avatarUrl={myAvatarUrl} size={30} role={myRole} />
        <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitComment() } }}
            placeholder="Add a comment…"
            rows={1}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              border: `1.5px solid ${bdr}`, background: surf,
              fontSize: 14, color: ink, fontFamily: 'inherit',
              lineHeight: 1.5, resize: 'none', outline: 'none',
              boxSizing: 'border-box', transition: 'border-color .2s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = `${blue}70`)}
            onBlur={e => (e.currentTarget.style.borderColor = bdr)}
          />
          {input.trim() && (
            <button
              onClick={submitComment}
              disabled={sending}
              style={{
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: blue, color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                opacity: sending ? 0.6 : 1, transition: 'opacity .2s',
              }}
            >
              {sending ? '…' : 'Post'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FeedCard — manual posts ──────────────────────────────────────────────────
function FeedCard({
  post, onLike, onDelete, viewerRole, viewerName, viewerAvatarUrl, onInterested, sentRequests,
}: {
  post: FeedPost
  onLike: (id: string) => void
  onDelete: (id: string) => void
  viewerRole: 'founder' | 'investor'
  viewerName: string | null
  viewerAvatarUrl: string | null
  onInterested: (founderId: string) => void
  sentRequests: Set<string>
}) {
  const [commentsOpen, setCommentsOpen] = useState(false)

  if (post.postType === 'auto_event') {
    return <AutoEventRow post={post} onDelete={onDelete} />
  }

  const badge     = postTypeBadge[post.postType] ?? postTypeBadge.update
  const accent    = TYPE_ACCENT[post.postType] ?? blue
  const roleLabel = post.role === 'investor' ? 'Investor' : 'Founder'
  const meta      = post.metadata as Record<string, unknown>
  const metric    = (meta.metric as string | undefined) ?? null

  // Q-Score grade badge on founder posts
  const gradeColor = post.author.qScoreGrade
    ? (post.author.qScore ?? 0) >= 70 ? green : (post.author.qScore ?? 0) >= 50 ? amber : muted
    : null

  const showInterested = viewerRole === 'investor' && post.role === 'founder' && !post.isOwn
  const alreadySent    = sentRequests.has(post.userId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      layout
      style={{
        background: '#fff',
        border: `1px solid ${bdr}`,
        borderRadius: 16,
        padding: '22px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}
    >
      {/* author row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Avatar name={post.author.name} avatarUrl={post.author.avatarUrl} size={44} role={post.role} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{post.author.name}</span>
            {post.author.qScoreGrade && gradeColor && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: `${gradeColor}14`, color: gradeColor, border: `1px solid ${gradeColor}28` }}>
                {post.author.qScoreGrade}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
            {post.author.subtitle && (
              <span style={{ fontSize: 12, color: muted }}>{post.author.subtitle}</span>
            )}
            {post.author.subtitle && <span style={{ fontSize: 10, color: bdr }}>·</span>}
            <span style={{ fontSize: 12, color: muted }}>{roleLabel}</span>
            <span style={{ fontSize: 10, color: bdr }}>·</span>
            <span style={{ fontSize: 12, color: muted }}>{relDate(post.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: `${accent}10`, color: accent, fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${accent}20` }}>
            {badge.label}
          </span>
          {post.isOwn && (
            <button onClick={() => onDelete(post.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex', alignItems: 'center', opacity: 0.5, transition: 'opacity .2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              title="Delete post"
            >
              <Trash2 style={{ height: 13, width: 13 }} />
            </button>
          )}
        </div>
      </div>

      {/* body */}
      <p style={{ fontSize: 15, color: ink, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.body}
      </p>

      {/* milestone metric badge */}
      {metric && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: `${green}10`, border: `1px solid ${green}25`, width: 'fit-content' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: green }}>{metric}</span>
        </div>
      )}

      {post.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.mediaUrl} alt="" style={{ borderRadius: 12, maxWidth: '100%', border: `1px solid ${bdr}`, display: 'block' }} />
      )}

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 10, borderTop: `1px solid ${bdr}` }}>
        <button onClick={() => onLike(post.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: post.likedByMe ? '#DC2626' : muted, fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!post.likedByMe) { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626' } }}
          onMouseLeave={e => { if (!post.likedByMe) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = muted } }}
        >
          <Heart
            style={{ height: 16, width: 16, transition: 'transform 0.2s', transform: post.likedByMe ? 'scale(1.2)' : 'scale(1)' }}
            fill={post.likedByMe ? '#DC2626' : 'none'}
            stroke={post.likedByMe ? '#DC2626' : 'currentColor'}
          />
          <span>{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
        </button>
        <button
          onClick={() => setCommentsOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: commentsOpen ? `${blue}08` : 'none', border: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: commentsOpen ? blue : muted, fontFamily: 'inherit', transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${blue}08`; e.currentTarget.style.color = blue }}
          onMouseLeave={e => { e.currentTarget.style.background = commentsOpen ? `${blue}08` : 'none'; e.currentTarget.style.color = commentsOpen ? blue : muted }}
        >
          <MessageCircle style={{ height: 16, width: 16 }} />
          <span>{post.commentsCount > 0 ? post.commentsCount : 'Comment'}</span>
        </button>
        {showInterested && (
          <button
            onClick={() => !alreadySent && onInterested(post.userId)}
            disabled={alreadySent}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
              padding: '6px 16px', borderRadius: 8,
              border: `1.5px solid ${alreadySent ? green : blue}`,
              background: alreadySent ? `${green}10` : `${blue}08`,
              color: alreadySent ? green : blue,
              fontSize: 13, fontWeight: 600, cursor: alreadySent ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'all .2s',
            }}
          >
            <Briefcase style={{ height: 12, width: 12 }} />
            {alreadySent ? '✓ Request Sent' : 'Interested'}
          </button>
        )}
      </div>

      {/* comment thread — expands when comment button clicked */}
      {commentsOpen && (
        <CommentThread
          postId={post.id}
          commentsCount={post.commentsCount}
          myName={viewerName}
          myAvatarUrl={viewerAvatarUrl}
          myRole={viewerRole}
        />
      )}
    </motion.div>
  )
}

// ─── CreatePostModal ──────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onPost, initialType = 'update', initialText = '' }: { onClose: () => void; onPost: () => void; initialType?: PostTypeKey; initialText?: string }) {
  const [text,        setText]        = useState(initialText)
  const [postType,    setPostType]    = useState<PostTypeKey>(initialType)
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState('')
  const [imageFile,   setImageFile]   = useState<File | null>(null)
  const [imagePreview,setImagePreview]= useState<string | null>(null)
  const [metric,      setMetric]      = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    // Select all so user can immediately replace the template text
    if (initialText) textareaRef.current?.select()
  }, [initialText])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
    setError('')
  }

  function removeImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handlePost() {
    if (!text.trim() || sending) return
    setSending(true); setError('')
    try {
      let mediaUrl: string | null = null
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        fd.append('bucket', 'feed-media')
        const upRes = await fetch('/api/feed/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        if (!upRes.ok) { setError(upData.error ?? 'Image upload failed'); setSending(false); return }
        mediaUrl = upData.url
      }
      const metadata: Record<string, string> = {}
      if (metric.trim()) metadata.metric = metric.trim()
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), postType, mediaUrl, metadata }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Failed to post'); return }
      onPost()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const activeType = POST_TYPES.find(t => t.key === postType)!

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.97, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 12 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 20, border: `1px solid ${bdr}`, padding: '26px 28px', boxShadow: '0 24px 80px rgba(0,0,0,0.16)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: ink }}>Create a post</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 6, borderRadius: 8, transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = surf)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>
        </div>

        {/* post type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {POST_TYPES.map(t => {
            const Icon = t.icon
            const active = postType === t.key
            return (
              <button key={t.key} onClick={() => setPostType(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 9,
                  border: `1.5px solid ${active ? t.color : bdr}`,
                  background: active ? `${t.color}10` : surf,
                  color: active ? t.color : muted,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                <Icon style={{ height: 12, width: 12 }} />
                {t.label}
              </button>
            )
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={activeType.desc}
          rows={5}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12,
            border: `1.5px solid ${bdr}`, background: surf,
            fontSize: 15, color: ink, fontFamily: 'inherit', lineHeight: 1.7,
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            transition: 'border-color .2s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = blue)}
          onBlur={e => (e.currentTarget.style.borderColor = bdr)}
        />

        {/* Milestone metric field */}
        {postType === 'milestone' && (
          <input
            value={metric}
            onChange={e => setMetric(e.target.value)}
            placeholder="Key metric (e.g. $50K MRR, 500 users, pre-seed closed) — optional"
            style={{
              marginTop: 10, width: '100%', padding: '9px 12px', borderRadius: 8,
              border: `1.5px solid ${bdr}`, background: surf, fontSize: 13, color: ink,
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = green)}
            onBlur={e => (e.currentTarget.style.borderColor = bdr)}
          />
        )}

        {imagePreview && (
          <div style={{ position: 'relative', marginTop: 10, borderRadius: 8, overflow: 'hidden', border: `1px solid ${bdr}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
            <button onClick={removeImage}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ height: 11, width: 11, color: '#fff' }} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <button onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: muted, padding: '4px 8px', fontFamily: 'inherit', borderRadius: 8, transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = ink; e.currentTarget.style.background = surf }}
            onMouseLeave={e => { e.currentTarget.style.color = muted; e.currentTarget.style.background = 'none' }}
          >
            <ImageIcon style={{ height: 14, width: 14 }} />
            {imageFile ? imageFile.name.slice(0, 24) : 'Add image'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect} />
          <span style={{ fontSize: 12, color: text.length > 1800 ? '#DC2626' : muted }}>{text.length}/2000</span>
        </div>

        {error && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 8 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = surf; e.currentTarget.style.color = ink }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted }}
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || sending || text.length > 2000}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: text.trim() && !sending && text.length <= 2000 ? blue : bdr,
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
              opacity: sending ? 0.7 : 1, fontFamily: 'inherit',
              transition: 'opacity .2s',
            }}
          >
            {sending ? <Loader2 style={{ height: 14, width: 14, animation: 'spin 1s linear infinite' }} /> : <Send style={{ height: 14, width: 14 }} />}
            {sending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────
function RightSidebar({ sidebar }: { sidebar: SidebarData | null }) {
  return (
    <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top Founders */}
      <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, padding: '18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <TrendingUp style={{ height: 13, width: 13, color: blue }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Top Founders</p>
        </div>
        {sidebar ? (
          sidebar.topFounders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sidebar.topFounders.map((f, i) => {
                const sc = scoreColor(f.score)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={f.name} avatarUrl={f.avatar_url} size={32} role="founder" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                      {f.startup_name && <p style={{ fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.startup_name}</p>}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 22, borderRadius: 6, background: `${sc}12`, border: `1px solid ${sc}25` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sc }}>{f.score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: muted, textAlign: 'center', padding: '8px 0' }}>No data yet</p>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: surf }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 11, width: '70%', background: surf, borderRadius: 4, marginBottom: 5 }} />
                  <div style={{ height: 10, width: '50%', background: surf, borderRadius: 4 }} />
                </div>
                <div style={{ width: 32, height: 22, borderRadius: 6, background: surf }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Stats */}
      <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <Users style={{ height: 13, width: 13, color: blue }} />
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>Community</p>
        </div>
        {sidebar ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: muted }}>Founders</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: green }}>{sidebar.stats.founderCount.toLocaleString()}</span>
            </div>
            <div style={{ height: 1, background: bdr }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: muted }}>Investors</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: blue }}>{sidebar.stats.investorCount.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 14, width: '80%', background: surf, borderRadius: 4 }} />
            <div style={{ height: 1, background: bdr }} />
            <div style={{ height: 14, width: '60%', background: surf, borderRadius: 4 }} />
          </div>
        )}
      </div>
    </div>
  )
}

// Template chips for the compose box
const TEMPLATES: { label: string; emoji: string; type: PostTypeKey; text: string }[] = [
  { label: 'Milestone',    emoji: '🚀', type: 'milestone', text: 'We just hit [metric] — [brief context about what this means for our growth].' },
  { label: 'Fundraising',  emoji: '💰', type: 'milestone', text: "We're raising a [$X] [round]. Looking for [investor type / check size]." },
  { label: 'Looking For',  emoji: '🤝', type: 'ask',       text: "We're looking for [role/resource/advisor]. If you know someone great, DM us." },
  { label: 'Insight',      emoji: '💡', type: 'insight',   text: '[Your market take, founder lesson, or contrarian view on the space.]' },
]

// ─── page ─────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [posts,        setPosts]        = useState<FeedPost[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [nextCursor,   setNextCursor]   = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [createType,   setCreateType]   = useState<PostTypeKey>('update')
  const [createText,   setCreateText]   = useState('')
  const [roleFilter,   setRoleFilter]   = useState<RoleFilter>('all')
  const [sidebar,      setSidebar]      = useState<SidebarData | null>(null)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (opts: { cursor?: string; role?: RoleFilter; reset?: boolean } = {}) => {
    const { cursor, role = roleFilter, reset = false } = opts
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    if (role !== 'all') params.set('role', role)
    const res = await fetch(`/api/feed?${params}`)
    if (!res.ok) return
    const d = await res.json()
    if (reset || !cursor) {
      setPosts(d.posts ?? [])
    } else {
      setPosts(prev => [...prev, ...(d.posts ?? [])])
    }
    setNextCursor(d.nextCursor ?? null)
  }, [roleFilter])

  useEffect(() => {
    setLoading(true)
    fetchPosts({ reset: true, role: roleFilter }).finally(() => setLoading(false))
  }, [roleFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/feed/sidebar').then(r => r.ok ? r.json() : null).then(d => { if (d) setSidebar(d) })
  }, [])

  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextCursor && !loadingMore) {
        setLoadingMore(true)
        fetchPosts({ cursor: nextCursor }).finally(() => setLoadingMore(false))
      }
    }, { threshold: 0.1 })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [nextCursor, loadingMore, fetchPosts])

  async function handleLike(postId: string) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, likedByMe: !p.likedByMe, likesCount: p.likedByMe ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ))
    await fetch(`/api/feed/${postId}/react`, { method: 'POST' })
  }

  async function handleDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    await fetch(`/api/feed/${postId}`, { method: 'DELETE' })
  }

  function openCreate(type: PostTypeKey = 'update', text = '') {
    setCreateType(type)
    setCreateText(text)
    setShowCreate(true)
  }

  async function handleInterested(founderId: string) {
    setSentRequests(prev => new Set(prev).add(founderId))
    try {
      await fetch('/api/investor/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId, message: "I saw your post on Pulse and I'm interested in connecting." }),
      })
    } catch {
      setSentRequests(prev => { const s = new Set(prev); s.delete(founderId); return s })
    }
  }

  const TABS: { key: RoleFilter; label: string }[] = [
    { key: 'all',      label: 'All'       },
    { key: 'founder',  label: 'Founders'  },
    { key: 'investor', label: 'Investors' },
  ]

  const cu = sidebar?.currentUser

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: 'inherit' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes shimmer{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}`}</style>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 20px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Center feed ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Inline compose box */}
          <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              {cu?.name ? (
                <Avatar name={cu.name} avatarUrl={cu.avatar_url ?? null} size={42} role={cu.role ?? 'founder'} />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: surf, flexShrink: 0 }} />
              )}
              <div
                onClick={() => openCreate('update')}
                style={{
                  flex: 1, padding: '12px 18px', borderRadius: 12,
                  border: `1.5px solid ${bdr}`, background: surf,
                  fontSize: 14, color: muted, cursor: 'pointer',
                  transition: 'all .2s', lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${blue}55`; e.currentTarget.style.background = `${blue}04` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = surf }}
              >
                {cu?.role === 'investor'
                  ? 'Share a market insight or deal thesis…'
                  : cu?.startup_name
                    ? `What's new at ${cu.startup_name}?`
                    : 'Share a milestone, update, or question…'}
              </div>
            </div>
            {/* Template chips — quick post creation with pre-filled text */}
            <div style={{ display: 'flex', gap: 7, paddingLeft: 56, flexWrap: 'wrap' }}>
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => openCreate(t.type, t.text)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 13px', borderRadius: 8,
                    border: `1px solid ${bdr}`, background: surf,
                    color: muted, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = `${blue}50`; el.style.color = blue; el.style.background = `${blue}07` }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = bdr; el.style.color = muted; el.style.background = surf }}
                >
                  <span style={{ fontSize: 12 }}>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Role filter tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '3px', background: surf, border: `1px solid ${bdr}`, borderRadius: 11, width: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setRoleFilter(t.key); setNextCursor(null) }}
                style={{
                  padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  background: roleFilter === t.key ? '#fff' : 'transparent',
                  color: roleFilter === t.key ? ink : muted,
                  boxShadow: roleFilter === t.key ? '0 1px 5px rgba(0,0,0,0.09)' : 'none',
                  transition: 'all .2s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Feed list */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 160, borderRadius: 14, background: '#fff', border: `1px solid ${bdr}`, animation: 'shimmer 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, padding: '56px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${blue}10`, border: `1px solid ${blue}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <TrendingUp style={{ height: 22, width: 22, color: blue }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 8 }}>Your Pulse starts here</p>
              <p style={{ fontSize: 13, color: muted, marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
                {roleFilter === 'all'
                  ? 'Be the first to share your story — a win, an update, or a question for the community.'
                  : `No ${roleFilter} stories yet.`}
              </p>
              {roleFilter === 'all' && (
                <button onClick={() => openCreate('milestone')}
                  style={{ padding: '10px 24px', borderRadius: 999, border: 'none', background: blue, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Share your first update
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 48 }}>
                {posts.map(post => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    viewerRole={cu?.role ?? 'founder'}
                    viewerName={cu?.name ?? null}
                    viewerAvatarUrl={cu?.avatar_url ?? null}
                    onInterested={handleInterested}
                    sentRequests={sentRequests}
                  />
                ))}
                <div ref={sentinelRef} style={{ height: 1 }} />
                {loadingMore && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <Loader2 style={{ height: 16, width: 16, color: muted, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </div>
                )}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Right sidebar (hidden < 1060px) ── */}
        <div className="pulse-right-sidebar" style={{ display: 'contents' }}>
          <style>{`@media(max-width:1060px){.pulse-right-sidebar>*{display:none!important}}`}</style>
          <RightSidebar sidebar={sidebar} />
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreatePostModal
            initialType={createType}
            initialText={createText}
            onClose={() => { setShowCreate(false); setCreateText('') }}
            onPost={() => fetchPosts({ reset: true, role: roleFilter })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
