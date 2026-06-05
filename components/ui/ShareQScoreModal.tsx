'use client'

import { useState } from 'react'
import { X, Copy, Download } from 'lucide-react'
import { ink, muted, blue, green, bdr } from '@/lib/constants/colors'
import { downloadQScore, type QScoreExportData } from '@/lib/utils/qscore-export'

interface ShareQScoreModalProps {
  isOpen: boolean
  onClose: () => void
  shareUrl?: string
  qscoreData: QScoreExportData
}

export function ShareQScoreModal({ isOpen, onClose, shareUrl, qscoreData }: ShareQScoreModalProps) {
  const [linkCopied, setLinkCopied] = useState(false)

  if (!isOpen) return null

  const scoreColor = (score: number) => {
    if (score >= 70) return blue
    if (score >= 50) return '#D97706'
    return '#DC2626'
  }

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2500)
      })
    }
  }

  const handleDownload = () => {
    downloadQScore(qscoreData, 'pdf')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 0,
          maxWidth: 520,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: `1px solid ${bdr}` }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: ink, margin: 0 }}>Share Q-Score</h2>
            <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>Send to investors or download for records</p>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'transparent',
              border: `1px solid ${bdr}`,
              cursor: 'pointer',
              color: muted,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div style={{ padding: '24px 28px', background: '#fafaf8' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            Preview
          </p>
          <div
            style={{
              background: '#fff',
              border: `1px solid ${bdr}`,
              borderRadius: 12,
              padding: '20px',
              textAlign: 'center',
            }}
          >
            {/* Company info */}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: ink, margin: 0, marginBottom: 4 }}>
              {qscoreData.companyName}
            </h3>
            {qscoreData.oneLiner && (
              <p style={{ fontSize: 12, color: muted, margin: '0 0 12px' }}>
                {qscoreData.oneLiner}
              </p>
            )}

            {/* Score circle */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: scoreColor(qscoreData.overallScore),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '16px auto',
                color: '#fff',
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {qscoreData.overallScore}
            </div>
            <p style={{ fontSize: 12, color: muted, margin: '8px 0' }}>Overall Q-Score</p>

            {/* Mini dimensions */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${bdr}`, fontSize: 11 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ color: muted, margin: '0 0 2px' }}>Market</p>
                  <p style={{ color: scoreColor(qscoreData.dimensions.marketReadiness), fontWeight: 700, margin: 0 }}>
                    {qscoreData.dimensions.marketReadiness}
                  </p>
                </div>
                <div>
                  <p style={{ color: muted, margin: '0 0 2px' }}>Team</p>
                  <p style={{ color: scoreColor(qscoreData.dimensions.founderTeam), fontWeight: 700, margin: 0 }}>
                    {qscoreData.dimensions.founderTeam}
                  </p>
                </div>
                <div>
                  <p style={{ color: muted, margin: '0 0 2px' }}>Product</p>
                  <p style={{ color: scoreColor(qscoreData.dimensions.ipDefensibility), fontWeight: 700, margin: 0 }}>
                    {qscoreData.dimensions.ipDefensibility}
                  </p>
                </div>
                <div>
                  <p style={{ color: muted, margin: '0 0 2px' }}>Financials</p>
                  <p style={{ color: scoreColor(qscoreData.dimensions.financials), fontWeight: 700, margin: 0 }}>
                    {qscoreData.dimensions.financials}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '20px 28px', borderTop: `1px solid ${bdr}`, display: 'flex', gap: 10 }}>
          <button
            onClick={handleCopyLink}
            disabled={!shareUrl}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 10,
              border: `1px solid ${bdr}`,
              background: linkCopied ? green : '#fff',
              color: linkCopied ? '#fff' : blue,
              fontSize: 13,
              fontWeight: 600,
              cursor: shareUrl ? 'pointer' : 'not-allowed',
              opacity: shareUrl ? 1 : 0.5,
              transition: 'all 0.2s',
            }}
          >
            <Copy size={16} />
            {linkCopied ? 'Link copied!' : 'Copy link'}
          </button>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: blue,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.opacity = '0.9'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.opacity = '1'
            }}
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
