'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { bdr, muted, green } from '../constants/colors'

export function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: "none", border: `1px solid ${bdr}`, borderRadius: 6,
        padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, color: copied ? green : muted, transition: "color .15s",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}
