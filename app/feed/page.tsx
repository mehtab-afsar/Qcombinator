'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Send, X, Loader2,
  Lightbulb, HelpCircle, Star, Zap, Trash2, Image as ImageIcon,
  LayoutDashboard, Bot, Briefcase, LineChart, Users, TrendingUp,
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

interface SidebarData {
  currentUser: { name: string | null; startup_name: string | null; avatar_url: string | null; score: number | null; grade: string | null }
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

// ─── FeedCard ─────────────────────────────────────────────────────────────────
function FeedCard({ post, onLike, onDelete }: { post: FeedPost; onLike: (id: string) => void; onDelete: (id: string) => void }) {
  const badge = postTypeBadge[post.postType] ?? postTypeBadge.update
  const roleBadge = post.role === 'investor'
    ? { bg: '#EFF6FF', color: blue,  label: 'Investor' }
    : { bg: '#F0FDF4', color: green, label: 'Founder'  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      layout
      style={{
        background: '#fff',
        border: `1px solid ${bdr}`,
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* author row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar name={post.author.name} avatarUrl={post.author.avatarUrl} size={44} role={post.role} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{post.author.name}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: roleBadge.bg, color: roleBadge.color, fontWeight: 600 }}>
              {roleBadge.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {post.author.subtitle && (
              <span style={{ fontSize: 11, color: muted }}>{post.author.subtitle}</span>
            )}
            {post.author.subtitle && <span style={{ fontSize: 10, color: bdr }}>·</span>}
            <span style={{ fontSize: 11, color: muted }}>{relDate(post.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {badge.label}
          </span>
          {post.isOwn && (
            <button onClick={() => onDelete(post.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4, display: 'flex', alignItems: 'center' }}
              title="Delete post"
            >
              <Trash2 style={{ height: 12, width: 12 }} />
            </button>
          )}
        </div>
      </div>

      {/* body */}
      <p style={{ fontSize: 14, color: ink, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.body}
      </p>

      {post.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.mediaUrl} alt="" style={{ borderRadius: 10, maxWidth: '100%', border: `1px solid ${bdr}`, display: 'block' }} />
      )}

      {/* actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingTop: 8, borderTop: `1px solid ${bdr}` }}>
        <button onClick={() => onLike(post.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            fontSize: 13, color: post.likedByMe ? '#DC2626' : muted, fontFamily: 'inherit',
            transition: 'color 0.12s',
          }}
        >
          <Heart style={{ height: 15, width: 15, transition: 'fill 0.12s' }} fill={post.likedByMe ? '#DC2626' : 'none'} stroke={post.likedByMe ? '#DC2626' : muted} />
          <span>{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'default', padding: '4px 0', fontSize: 13, color: muted, fontFamily: 'inherit' }}>
          <MessageCircle style={{ height: 15, width: 15 }} />
          <span>{post.commentsCount > 0 ? post.commentsCount : 'Comment'}</span>
        </button>
      </div>
    </motion.div>
  )
}

// ─── CreatePostModal ──────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onPost, initialType = 'update' }: { onClose: () => void; onPost: () => void; initialType?: PostTypeKey }) {
  const [text,        setText]        = useState('')
  const [postType,    setPostType]    = useState<PostTypeKey>(initialType)
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
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 10 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 16, border: `1px solid ${bdr}`, padding: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.14)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Create a post</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 4 }}>
            <X style={{ height: 16, width: 16 }} />
          </button>
        </div>

        {/* post type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {POST_TYPES.map(t => {
            const Icon = t.icon
            const active = postType === t.key
            return (
              <button key={t.key} onClick={() => setPostType(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 999,
                  border: `1.5px solid ${active ? t.color : bdr}`,
                  background: active ? `${t.color}10` : surf,
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
          placeholder={activeType.desc}
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <button onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: muted, padding: 0, fontFamily: 'inherit' }}>
            <ImageIcon style={{ height: 13, width: 13 }} />
            {imageFile ? imageFile.name.slice(0, 24) : 'Add image'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect} />
          <span style={{ fontSize: 11, color: text.length > 1800 ? '#DC2626' : muted }}>{text.length}/2000</span>
        </div>

        {error && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 6 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!text.trim() || sending || text.length > 2000}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: text.trim() && !sending && text.length <= 2000 ? blue : bdr,
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
              opacity: sending ? 0.7 : 1, fontFamily: 'inherit',
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

// ─── LeftSidebar ──────────────────────────────────────────────────────────────
function LeftSidebar({ sidebar }: { sidebar: SidebarData | null }) {
  const cu = sidebar?.currentUser
  const score = cu?.score ?? null
  const grade = cu?.grade ?? null
  const sc = scoreColor(score)

  const navLinks = [
    { icon: LayoutDashboard, label: 'Dashboard',  href: '/founder/dashboard'  },
    { icon: Bot,             label: 'AI Agents',  href: '/founder/agents'     },
    { icon: Briefcase,       label: 'Workspace',  href: '/founder/workspace'  },
    { icon: LineChart,       label: 'Portfolio',  href: '/founder/portfolio'  },
  ]

  return (
    <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Profile card */}
      <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* banner strip */}
        <div style={{ height: 52, background: `linear-gradient(135deg, ${blue}15, ${green}10)` }} />
        <div style={{ padding: '0 18px 18px', marginTop: -26 }}>
          {/* Avatar */}
          {cu?.name ? (
            <Avatar name={cu.name} avatarUrl={cu.avatar_url ?? null} size={52} role="founder" />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: surf, border: `2px solid #fff`, flexShrink: 0 }} />
          )}
          <div style={{ marginTop: 10 }}>
            {cu?.name ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 2 }}>{cu.name}</p>
                {cu.startup_name && <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>{cu.startup_name}</p>}
              </>
            ) : (
              <>
                <div style={{ height: 14, width: 120, background: surf, borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 11, width: 80, background: surf, borderRadius: 4, marginBottom: 8 }} />
              </>
            )}
            {score !== null ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: `${sc}10`, border: `1px solid ${sc}25` }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: sc, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>Q-Score · {grade}</span>
              </div>
            ) : (
              <div style={{ height: 24, width: 100, background: surf, borderRadius: 999 }} />
            )}
          </div>
        </div>

        {/* nav links */}
        <div style={{ borderTop: `1px solid ${bdr}`, padding: '8px 10px' }}>
          {navLinks.map(({ icon: Icon, label, href }) => (
            <a key={href} href={href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: muted, fontSize: 13, fontWeight: 500, transition: 'all .12s' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = `${blue}08`; el.style.color = blue }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.color = muted }}
            >
              <Icon style={{ height: 15, width: 15 }} />
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
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

// ─── page ─────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const [posts,       setPosts]       = useState<FeedPost[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor,  setNextCursor]  = useState<string | null>(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [createType,  setCreateType]  = useState<PostTypeKey>('update')
  const [roleFilter,  setRoleFilter]  = useState<RoleFilter>('all')
  const [sidebar,     setSidebar]     = useState<SidebarData | null>(null)
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

  function openCreate(type: PostTypeKey = 'update') {
    setCreateType(type)
    setShowCreate(true)
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

        {/* ── Left sidebar (hidden < 900px via inline media hack using CSS var) ── */}
        <div className="pulse-left-sidebar" style={{ display: 'contents' }}>
          <style>{`@media(max-width:900px){.pulse-left-sidebar>*{display:none!important}}`}</style>
          <LeftSidebar sidebar={sidebar} />
        </div>

        {/* ── Center feed ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Inline compose box */}
          <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {cu?.name ? (
                <Avatar name={cu.name} avatarUrl={cu.avatar_url ?? null} size={38} role="founder" />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: surf, flexShrink: 0 }} />
              )}
              <div
                onClick={() => openCreate('update')}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 999,
                  border: `1px solid ${bdr}`, background: surf,
                  fontSize: 13, color: muted, cursor: 'pointer',
                  transition: 'border-color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${blue}60`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}
              >
                Share your story — milestone, update, or question…
              </div>
            </div>
            {/* Quick action chips */}
            <div style={{ display: 'flex', gap: 6, paddingLeft: 50, flexWrap: 'wrap' }}>
              {POST_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.key} onClick={() => openCreate(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 999,
                      border: `1px solid ${bdr}`, background: 'transparent',
                      color: muted, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = `${t.color}60`; el.style.color = t.color; el.style.background = `${t.color}08` }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = bdr; el.style.color = muted; el.style.background = 'transparent' }}
                  >
                    <Icon style={{ height: 11, width: 11 }} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role filter tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '3px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10, width: 'fit-content' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setRoleFilter(t.key); setNextCursor(null) }}
                style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                  background: roleFilter === t.key ? '#fff' : 'transparent',
                  color: roleFilter === t.key ? ink : muted,
                  boxShadow: roleFilter === t.key ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                  transition: 'all .12s',
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
            onClose={() => setShowCreate(false)}
            onPost={() => fetchPosts({ reset: true, role: roleFilter })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
