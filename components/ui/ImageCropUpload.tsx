'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Shared circular image cropper. Opens over any picker, lets the user drag to
 * pan + zoom, then exports a circular PNG blob at `output`px. No dependencies —
 * pure canvas. Reuse for founder avatars, investor avatars, company logos, etc.
 */
interface ImageCropUploadProps {
  file: File
  onCancel: () => void
  onSave: (blob: Blob, previewUrl: string) => void
  accent?: string
  /** Output diameter in px (square canvas, circular clip). */
  output?: number
  title?: string
}

const V = 264 // on-screen viewport diameter

export function ImageCropUpload({
  file,
  onCancel,
  onSave,
  accent = '#2563EB',
  output = 512,
  title = 'Adjust your photo',
}: ImageCropUploadProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    const im = new window.Image()
    im.onload = () => {
      imgRef.current = im
      setNat({ w: im.naturalWidth, h: im.naturalHeight })
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
    im.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = nat ? V / Math.min(nat.w, nat.h) : 1
  const dispW = nat ? nat.w * baseScale * scale : 0
  const dispH = nat ? nat.h * baseScale * scale : 0

  // Keep the image covering the circle at all times.
  const clamp = useCallback(
    (o: { x: number; y: number }, s: number) => {
      if (!nat) return o
      const dW = nat.w * baseScale * s
      const dH = nat.h * baseScale * s
      const maxX = Math.max(0, (dW - V) / 2)
      const maxY = Math.max(0, (dH - V) / 2)
      return { x: Math.max(-maxX, Math.min(maxX, o.x)), y: Math.max(-maxY, Math.min(maxY, o.y)) }
    },
    [nat, baseScale],
  )

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.px
    const dy = e.clientY - drag.current.py
    setOffset(clamp({ x: drag.current.ox + dx, y: drag.current.oy + dy }, scale))
  }
  function onPointerUp() {
    drag.current = null
  }
  function onWheel(e: React.WheelEvent) {
    const next = Math.min(3, Math.max(1, scale - e.deltaY * 0.0015))
    setScale(next)
    setOffset(o => clamp(o, next))
  }
  function changeZoom(s: number) {
    setScale(s)
    setOffset(o => clamp(o, s))
  }

  function handleSave() {
    if (!nat || !imgRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = output
    canvas.height = output
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = baseScale * scale
    const imgLeft = (V - dispW) / 2 + offset.x
    const imgTop = (V - dispH) / 2 + offset.y
    // Source rect (in original-image pixels) that the viewport currently shows.
    const sx = -imgLeft / s
    const sy = -imgTop / s
    const sSize = V / s
    ctx.save()
    ctx.beginPath()
    ctx.arc(output / 2, output / 2, output / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, output, output)
    ctx.restore()
    canvas.toBlob(
      blob => { if (blob) onSave(blob, URL.createObjectURL(blob)) },
      'image/png',
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(24,22,15,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, padding: '26px 26px 22px',
          width: '100%', maxWidth: 340, boxShadow: '0 24px 70px -20px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#18160F', letterSpacing: '-0.01em' }}>{title}</p>

        {/* Circular viewport */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
          style={{
            width: V, height: V, borderRadius: '50%', overflow: 'hidden',
            position: 'relative', cursor: drag.current ? 'grabbing' : 'grab',
            background: '#F0EDE6', touchAction: 'none',
            boxShadow: `0 0 0 3px ${accent}22, inset 0 0 0 1px rgba(0,0,0,0.06)`,
          }}
        >
          {imgUrl && nat && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                width: dispW, height: dispH,
                left: (V - dispW) / 2 + offset.x,
                top: (V - dispH) / 2 + offset.y,
                userSelect: 'none', pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Zoom control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <span style={{ fontSize: 12, color: '#8A867C' }}>–</span>
          <input
            type="range" min={1} max={3} step={0.01} value={scale}
            onChange={e => changeZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: accent, cursor: 'pointer' }}
            aria-label="Zoom"
          />
          <span style={{ fontSize: 14, color: '#8A867C' }}>+</span>
        </div>
        <p style={{ margin: '-6px 0 0', fontSize: 11.5, color: '#8A867C', textAlign: 'center' }}>
          Drag to reposition · scroll or slide to zoom
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 42, borderRadius: 11, border: '1.5px solid #E2DDD5',
              background: '#fff', color: '#18160F', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!nat}
            style={{
              flex: 1, height: 42, borderRadius: 11, border: 'none',
              background: accent, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: nat ? 'pointer' : 'not-allowed', opacity: nat ? 1 : 0.6, fontFamily: 'inherit',
            }}
          >
            Save photo
          </button>
        </div>
      </div>
    </div>
  )
}
