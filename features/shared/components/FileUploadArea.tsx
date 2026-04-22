'use client'

import { CSSProperties, useRef, useState, DragEvent, ChangeEvent } from 'react'
import Image from 'next/image'
import { surf, bdr, ink, muted, blue, red } from '@/features/shared/tokens'
import { Spinner } from './Spinner'

interface FileUploadAreaProps {
  accept?: string
  maxSizeMB?: number
  label?: string
  hint?: string
  uploading?: boolean
  onFile: (file: File) => void
  style?: CSSProperties
}

export function FileUploadArea({
  accept = '*/*',
  maxSizeMB = 10,
  label = 'Click to upload or drag & drop',
  hint,
  uploading = false,
  onFile,
  style,
}: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [sizeError, setSizeError] = useState('')

  function validate(file: File): boolean {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setSizeError(`File exceeds ${maxSizeMB} MB`)
      return false
    }
    setSizeError('')
    return true
  }

  function handleFiles(files: FileList | null) {
    if (!files?.[0]) return
    if (validate(files[0])) onFile(files[0])
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    e.target.value = '' // reset so same file can be re-uploaded
  }

  const borderColor = dragOver ? blue : sizeError ? red : bdr

  return (
    <div style={style}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 12,
          background: dragOver ? `${blue}08` : surf,
          padding: '28px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, cursor: uploading ? 'default' : 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          minHeight: 100,
          textAlign: 'center',
        }}
      >
        {uploading ? (
          <>
            <Spinner size="md" />
            <p style={{ fontSize: 13, color: muted, margin: 0 }}>Uploading…</p>
          </>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragOver ? blue : muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: dragOver ? blue : ink, margin: '0 0 3px' }}>{label}</p>
              {hint && <p style={{ fontSize: 11, color: muted, margin: 0 }}>{hint}</p>}
            </div>
          </>
        )}
      </div>
      {sizeError && (
        <p style={{ fontSize: 11, color: red, marginTop: 5, margin: '5px 0 0' }}>{sizeError}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

// ── Image Upload Target (small circular/square click-to-upload) ───────────────
interface ImageUploadTargetProps {
  currentUrl?: string | null
  name: string
  size?: number
  radius?: number
  uploading?: boolean
  onFile: (file: File) => void
  style?: CSSProperties
}

export function ImageUploadTarget({
  currentUrl,
  name,
  size = 72,
  radius = 999,
  uploading = false,
  onFile,
  style,
}: ImageUploadTargetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase()

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        width: size, height: size, borderRadius: radius,
        border: `2px solid ${bdr}`, background: surf,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: uploading ? 'default' : 'pointer',
        overflow: 'hidden', position: 'relative', flexShrink: 0,
        transition: 'border-color 0.15s',
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = blue }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr }}
    >
      {uploading ? (
        <Spinner size="sm" />
      ) : currentUrl ? (
        <Image src={currentUrl} alt={name} fill style={{ objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: size * 0.28, fontWeight: 700, color: muted }}>{initials}</span>
      )}
      {/* Hover overlay */}
      {!uploading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0)', borderRadius: radius,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, transition: 'opacity 0.15s' }}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
        style={{ display: 'none' }}
      />
    </div>
  )
}
