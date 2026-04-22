'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Send, X, Loader2, Rss,
  TrendingUp, Lightbulb, HelpCircle, Star, Zap, Trash2, Image as ImageIcon,
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
  author: { name: string; subtitle: string; avatarUrl: string | null }
  isOwn: boolean
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
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
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

// ─── FeedCard ─────────────────────────────────────────────────────────────────
function FeedCard({
  post,
  onLike,
  onDelete,
}: {
  post: FeedPost
  onLike: (id: string) => void
  onDelete: (id: string) => void
}) {
  const badge = postTypeBadge[post.postType] ?? postTypeBadge.update
  const roleBadge = post.role === 'investor'
    ? { bg: '#EFF6FF', color: blue,  label: 'Investor' }
    : { bg: '#F0FDF4', color: green, label: 'Founder'  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
      style={{
        background: bg, border: `1px solid ${bdr}`, borderRadius: 14,
        padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* author row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: post.role === 'investor' ? `${blue}14` : `${green}14`,
          border: `1px solid ${post.role === 'investor' ? blue : green}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          color: post.role === 'investor' ? blue : green,
        }}>
          {initials(post.author.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{post.author.name}</span>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: roleBadge.bg, color: roleBadge.color, fontWeight: 600 }}>
              {roleBadge.label}
            </span>
            {post.author.subtitle && (
              <span style={{ fontSize: 11, color: muted }}>· {post.author.subtitle}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, background: badge.bg, color: badge.color, fontWeight: 500 }}>
              {badge.label}
            </span>
            <span style={{ fontSize: 10, color: muted }}>{relDate(post.createdAt)}</span>
          </div>
        </div>
        {/* delete own post */}
        {post.isOwn && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, flexShrink: 0 }}
            title="Delete post"
          >
            <Trash2 style={{ height: 13, width: 13 }} />
          </button>
        )}
      </div>

      {/* body */}
      <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.body}
      </p>

      {post.mediaUrl && (
        <img src={post.mediaUrl} alt="" style={{ borderRadius: 8, maxWidth: '100%', border: `1px solid ${bdr}` }} />
      )}

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingTop: 6, borderTop: `1px solid ${bdr}` }}>
        <button
          onClick={() => onLike(post.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 12, color: post.likedByMe ? '#DC2626' : muted, fontFamily: 'inherit',
            transition: 'color 0.12s',
          }}
        >
          <Heart
            style={{ height: 14, width: 14, transition: 'fill 0.12s' }}
            fill={post.likedByMe ? '#DC2626' : 'none'}
            stroke={post.likedByMe ? '#DC2626' : muted}
          />
          <span>{post.likesCount > 0 ? post.likesCount : ''}</span>
        </button>

        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'default', padding: 0,
            fontSize: 12, color: muted, fontFamily: 'inherit',
          }}
        >
          <MessageCircle style={{ height: 14, width: 14 }} />
          <span>{post.commentsCount > 0 ? post.commentsCount : ''}</span>
        </button>
      </div>
    </motion.div>
  )
}

// ─── CreatePostModal ──────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onPost }: { onClose: () => void; onPost: () => void }) {
  const [text,        setText]        = useState('')
  const [postType,    setPostType]    = useState<PostTypeKey>('update')
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState('')
  const [imageFile,   setImageFile]   = useState<File | null>(null)
  const [imagePreview,setImagePreview]= useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

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
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), postType, mediaUrl }),
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: bg, borderRadius: 16, border: `1px solid ${bdr}`, padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>New post</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted }}>
            <X style={{ height: 16, width: 16 }} />
          </button>
        </div>

        {/* post type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {POST_TYPES.map(t => {
            const Icon = t.icon
            const active = postType === t.key
            return (
              <button
                key={t.key}
                onClick={() => setPostType(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 999,
                  border: `1.5px solid ${active ? t.color : bdr}`,
                  background: active ? `${t.color}12` : surf,
                  color: active ? t.color : muted,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}
              >
                <Icon style={{ height: 11, width: 11 }} />
                {t.label}
              </button>
            )
          })}
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={POST_TYPES.find(t => t.key === postType)?.desc ?? 'What\'s on your mind?'}
          rows={5}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: `1.5px solid ${bdr}`, background: surf,
            fontSize: 14, color: ink, fontFamily: 'inherit', lineHeight: 1.65,
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = blue)}
          onBlur={e => (e.currentTarget.style.borderColor = bdr)}
        />

        {/* image preview */}
        {imagePreview && (
          <div style={{ position: 'relative', marginTop: 10, borderRadius: 8, overflow: 'hidden', border: `1px solid ${bdr}` }}>
            <img src={imagePreview} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
            <button
              onClick={removeImage}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X style={{ height: 11, width: 11, color: '#fff' }} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: muted, padding: 0, fontFamily: 'inherit' }}
          >
            <ImageIcon style={{ height: 13, width: 13 }} />
            {imageFile ? imageFile.name.slice(0, 24) : 'Add image'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect} />
          <span style={{ fontSize: 11, color: text.length > 1800 ? '#DC2626' : muted }}>{text.length}/2000</span>
        </div>

        {error && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 6 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || sending || text.length > 2000}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: text.trim() ? blue : bdr, color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
              opacity: sending ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {sending ? <Loader2 style={{ height: 13, width: 13, animation: 'spin 1s linear infinite' }} /> : <Send style={{ height: 13, width: 13 }} />}
            {sending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [posts,       setPosts]       = useState<FeedPost[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor,  setNextCursor]  = useState<string | null>(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [roleFilter,  setRoleFilter]  = useState<RoleFilter>('all')
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

  // initial load + refetch when role filter changes
  useEffect(() => {
    setLoading(true)
    fetchPosts({ reset: true, role: roleFilter }).finally(() => setLoading(false))
  }, [roleFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll sentinel
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

  const TABS: { key: RoleFilter; label: string }[] = [
    { key: 'all',      label: 'All'       },
    { key: 'founder',  label: 'Founders'  },
    { key: 'investor', label: 'Investors' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: 'inherit' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>

        {/* header */}
        <div style={{ padding: '32px 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Rss style={{ height: 16, width: 16, color: blue }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: ink, letterSpacing: '-0.03em' }}>Pulse</h1>
            </div>
            <p style={{ fontSize: 12, color: muted, margin: 0 }}>Your story · The community · All in one place</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 999, border: 'none',
              background: blue, color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <TrendingUp style={{ height: 13, width: 13 }} />
            Share update
          </button>
        </div>

        {/* create prompt card */}
        <div
          onClick={() => setShowCreate(true)}
          style={{
            background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
            padding: '12px 16px', marginBottom: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: 8, background: bdr, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: '7px 14px', borderRadius: 999, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: muted }}>
            Share your story — milestone, update, or question…
          </div>
        </div>

        {/* role filter tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '3px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10, marginBottom: 20, width: 'fit-content' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setRoleFilter(t.key); setNextCursor(null) }}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                background: roleFilter === t.key ? bg : 'transparent',
                color: roleFilter === t.key ? ink : muted,
                boxShadow: roleFilter === t.key ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                transition: 'all .12s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* feed list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 150, borderRadius: 14, background: surf, border: `1px solid ${bdr}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px' }}>
            <Rss style={{ height: 36, width: 36, color: muted, margin: '0 auto 16px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 8 }}>Your Pulse starts here</p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
              {roleFilter === 'all'
                ? 'Be the first to share your story — a win, an update, or a question for the community.'
                : `No ${roleFilter} stories yet.`}
            </p>
            {roleFilter === 'all' && (
              <button
                onClick={() => setShowCreate(true)}
                style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: blue, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Share your first update
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>
              {posts.map(post => (
                <FeedCard key={post.id} post={post} onLike={handleLike} onDelete={handleDelete} />
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

      <AnimatePresence>
        {showCreate && (
          <CreatePostModal
            onClose={() => setShowCreate(false)}
            onPost={() => fetchPosts({ reset: true, role: roleFilter })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
