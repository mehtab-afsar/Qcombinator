'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Search, BarChart3, FileText, CheckCircle, Crown } from 'lucide-react'
import { ink, muted, blue, bdr } from '@/lib/constants/colors'

const PRO_FEATURES = [
  { icon: Search,      label: 'Unlimited deal flow access'       },
  { icon: BarChart3,   label: 'AI match scores + personalization' },
  { icon: Zap,         label: 'Pipeline management & kanban'      },
  { icon: FileText,    label: 'Thesis extraction from PDF'        },
  { icon: CheckCircle, label: 'Founder deep-dive profiles'        },
  { icon: Crown,       label: 'Priority support'                  },
]

interface UpgradeModalProps {
  onClose:   () => void
  onUpgrade: () => void
  acting?:   boolean
}

export function UpgradeModal({ onClose, onUpgrade, acting = false }: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="upgrade-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <motion.div
        key="upgrade-modal"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9001,
          width: 'min(520px, 95vw)',
          background: '#fff',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '22px 24px 16px',
          borderBottom: `1px solid ${bdr}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${blue}12`, border: `1px solid ${blue}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap style={{ height: 15, width: 15, color: blue }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: blue }}>Investor Pro</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: ink, letterSpacing: '-0.02em', marginBottom: 4 }}>
              Upgrade to unlock this feature
            </h2>
            <p style={{ fontSize: 13, color: muted, lineHeight: 1.55 }}>
              This feature is available on the Pro plan. Join investors already using Edge Alpha to discover top founders.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: muted, flexShrink: 0 }}
          >
            <X style={{ height: 16, width: 16 }} />
          </button>
        </div>

        {/* Feature grid */}
        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PRO_FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ height: 26, width: 26, borderRadius: 7, background: `${blue}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ height: 12, width: 12, color: blue }} />
              </div>
              <span style={{ fontSize: 12, color: ink }}>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA footer */}
        <div style={{ padding: '16px 24px 22px', borderTop: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 700, color: ink }}>$99</span>
            <span style={{ fontSize: 13, color: muted }}> / month</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: muted, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Maybe later
            </button>
            <button
              onClick={onUpgrade}
              disabled={acting}
              style={{
                padding: '10px 24px', borderRadius: 9, border: 'none',
                background: blue, color: '#fff',
                fontSize: 13, fontWeight: 600,
                cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                boxShadow: `0 2px 10px ${blue}40`,
              }}
            >
              <Zap style={{ height: 13, width: 13 }} />
              {acting ? 'Loading…' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
