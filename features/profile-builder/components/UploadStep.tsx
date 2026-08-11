"use client";

import { motion } from 'framer-motion';
import {
  Presentation, DollarSign, FileText, FileSignature, Users, Shield,
  UploadCloud, ShieldAlert, RefreshCw, AlertTriangle, Check, X as XIcon, Loader2, Zap,
} from 'lucide-react';
import { bg, surf, ink, muted, bdr, blue, green, amber, red, cyan, white, alpha } from '@/lib/constants/colors';
import { ScrollDoodle } from '@/features/onboarding/components/doodles/ScrollDoodle';
import { UPLOAD_MESSAGES, UPLOAD_DOODLES, MAX_UPLOAD_FILES, surf2, greenTintBg, redTintBg, redTintBorder, redIconBg, redDeepText, amberSoftBg, amberSoftBorder, greenBorderSoft } from '@/features/profile-builder/lib/constants';
import type { FlowMode, UploadedFile, ProfileBuilderStep, RecalcResult } from '@/features/profile-builder/types';

interface UploadStepProps {
  flowMode: FlowMode;
  uploadedFiles: UploadedFile[];
  uploadLoading: boolean;
  uploadMsgIdx: number;
  uploadError: string | null;
  uploadWarning: string | null;
  identityMismatch: { reason: string; file: File } | null;
  recalcResult: RecalcResult | null;
  recalcLoading: boolean;
  onUploadClick: () => void;
  onRemoveFile: (index: number) => void;
  onRecalculate: () => void;
  onRetryIdentityCheck: () => void;
  onDismissIdentityMismatch: () => void;
  setCurrentStep: (step: ProfileBuilderStep) => void;
}

export function UploadStep({
  flowMode, uploadedFiles, uploadLoading, uploadMsgIdx, uploadError, uploadWarning,
  identityMismatch, recalcResult, recalcLoading, onUploadClick, onRemoveFile,
  onRecalculate, onRetryIdentityCheck, onDismissIdentityMismatch, setCurrentStep,
}: UploadStepProps) {
  const UploadDoodle = UPLOAD_DOODLES[uploadMsgIdx] ?? ScrollDoodle;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '56px 40px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 68, height: 68 }}>
            <ScrollDoodle color={cyan} />
          </div>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Upload your pitch deck
        </h2>
        <p style={{ fontSize: 14, color: muted, margin: '0 0 20px', lineHeight: 1.6 }}>
          We analyse it, identify your weakest parameters, and give you a partial Q-Score in under 5 minutes.
        </p>
        {/* Flow preview — a real stepper: numbered badges instead of flat grey digits */}
        <div style={{
          display: 'flex', border: `1px solid ${bdr}`, borderRadius: 10,
          overflow: 'hidden', marginBottom: 16, textAlign: 'left', background: bg,
        }}>
          {[
            { step: '1', label: 'Upload', sub: 'PDF, PPTX, DOCX' },
            { step: '2', label: '3 questions', sub: 'Weakest params only' },
            { step: '3', label: 'Instant score', sub: 'Partial Q-Score' },
          ].map(({ step, label, sub }, i, arr) => (
            <div key={step} style={{
              flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
              borderRight: i < arr.length - 1 ? `1px solid ${bdr}` : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: alpha(cyan, 0.14), color: cyan,
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{label}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 8,
        }}>
          {[
            { label: 'Pitch deck', note: 'Market + team', icon: Presentation },
            { label: 'Financial model', note: 'MRR, burn, runway', icon: DollarSign },
            { label: 'Business plan', note: 'Full coverage', icon: FileText },
            { label: 'LOI / contracts', note: 'Customer traction', icon: FileSignature },
            { label: 'Team bios', note: 'Team section', icon: Users },
            { label: 'Technical spec', note: 'IP + defensibility', icon: Shield },
          ].map(({ label, note, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                borderRadius: 8, border: `1px solid ${bdr}`, textAlign: 'left',
                background: bg, transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = alpha(cyan, 0.4)
                e.currentTarget.style.boxShadow = `0 2px 10px ${alpha(cyan, 0.12)}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = bdr
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: alpha(cyan, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={13} color={cyan} strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: ink }}>{label}</div>
                <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{note}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Animated loading screen (replaces upload zone during processing) ── */}
      {uploadLoading ? (
        <div style={{
          borderRadius: 20, padding: '56px 32px', background: surf,
          border: `1px solid ${bdr}`, textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          {/* Hand-drawn doodle — re-draws on each phase (keyed by message index) */}
          <div style={{ width: 96, height: 96 }}>
            <UploadDoodle key={uploadMsgIdx} color={blue} />
          </div>
          {/* Rotating message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: ink, letterSpacing: '-0.01em', minHeight: 26 }}>
              {UPLOAD_MESSAGES[uploadMsgIdx]}
            </div>
            <div style={{ fontSize: 13, color: muted }}>
              Extracting all 30 indicators across 6 parameters
            </div>
          </div>
          {/* Indicator dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {UPLOAD_MESSAGES.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === uploadMsgIdx ? blue : bdr,
                transition: 'background 0.4s',
              }} />
            ))}
          </div>
        </div>
      ) : (
      <div
        onClick={() => { if (uploadedFiles.length < MAX_UPLOAD_FILES) onUploadClick() }}
        style={{
          border: `2px dashed ${bdr}`, borderRadius: 16, padding: '48px 32px',
          textAlign: 'center', background: surf,
          cursor: uploadedFiles.length >= MAX_UPLOAD_FILES ? 'not-allowed' : 'pointer',
          opacity: uploadedFiles.length >= MAX_UPLOAD_FILES ? 0.55 : 1,
          transition: 'all 0.2s', boxShadow: 'inset 0 1px 3px rgba(24,22,15,0.04)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = amber; e.currentTarget.style.background = amberSoftBg; e.currentTarget.style.boxShadow = '0 2px 12px rgba(217,119,6,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = surf; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(24,22,15,0.04)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <UploadCloud size={36} color={muted} strokeWidth={1.25} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>
          {uploadedFiles.length >= MAX_UPLOAD_FILES ? `${MAX_UPLOAD_FILES}-file limit reached` : 'Drop files or click to upload'}
        </div>
        <div style={{ fontSize: 13, color: muted }}>PDF, PPTX, DOCX, XLSX, CSV, TXT, RTF, ODT, Images — max 20 MB each · up to 10 files, merged automatically</div>
      </div>
      )}

      {identityMismatch && (
        <div style={{
          display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 12,
          background: redTintBg, border: `1px solid ${redTintBorder}`,
        }}>
          <div style={{
            flexShrink: 0, width: 30, height: 30, borderRadius: 8,
            background: redIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldAlert size={15} color={red} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 3 }}>
              This file doesn&rsquo;t match your company
            </div>
            <div style={{ fontSize: 13, color: redDeepText, lineHeight: 1.5 }}>
              {identityMismatch.reason} We didn&rsquo;t merge its data into your profile.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={onRetryIdentityCheck}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 7, border: 'none',
                  background: red, color: white, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <RefreshCw size={12} strokeWidth={2.5} />
                Retry
              </button>
              <button
                onClick={onDismissIdentityMismatch}
                style={{
                  padding: '6px 12px', borderRadius: 7, border: `1px solid ${redTintBorder}`,
                  background: 'transparent', color: redDeepText, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadError && !identityMismatch && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: redTintBg, border: `1px solid ${redTintBorder}`, fontSize: 13, color: red }}>
          {uploadError}
        </div>
      )}

      {uploadWarning && !uploadError && !identityMismatch && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8, background: amberSoftBg, border: `1px solid ${amberSoftBorder}`, fontSize: 13, color: amber }}>
          <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{uploadWarning}</span>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Uploaded
            </div>
            <div style={{ fontSize: 11, color: muted }}>
              {uploadedFiles.length}/{MAX_UPLOAD_FILES} files · data merged
            </div>
          </div>
          {uploadedFiles.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 10, background: bg,
              border: `1px solid ${bdr}`, marginBottom: 6,
              boxShadow: '0 1px 3px rgba(24,22,15,0.05)',
            }}>
              <div
                onClick={() => f.fileUrl && window.open(f.fileUrl, '_blank', 'noopener')}
                title={f.fileUrl ? 'Click to preview' : undefined}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: surf2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  cursor: f.fileUrl ? 'pointer' : 'default',
                }}
              >
                <FileText size={15} color={f.fileUrl ? blue : muted} strokeWidth={1.75} />
              </div>
              <div
                style={{ flex: 1, minWidth: 0, cursor: f.fileUrl ? 'pointer' : 'default' }}
                onClick={() => f.fileUrl && window.open(f.fileUrl, '_blank', 'noopener')}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: f.fileUrl ? blue : ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: f.failed ? amber : f.fields > 0 ? green : muted, marginTop: 2 }}>
                  {f.failed ? "Couldn't read this file" : f.fields > 0 ? `${f.fields} fields extracted` : 'Stored as context'}
                  {f.fileUrl && <span style={{ color: muted }}> · click to preview</span>}
                </div>
              </div>
              {f.failed
                ? <AlertTriangle size={14} color={amber} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                : <Check size={14} color={green} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
              <button
                onClick={() => onRemoveFile(i)}
                title="Remove file"
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: `1px solid ${bdr}`,
                  background: bg, color: muted, fontSize: 13, lineHeight: 1,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, fontFamily: 'inherit', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = redTintBg; e.currentTarget.style.borderColor = redTintBorder }}
                onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = bdr }}
              ><XIcon size={11} color={muted} strokeWidth={2} /></button>
            </div>
          ))}

          {/* Recalculate score after upload */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onRecalculate}
              disabled={recalcLoading}
              style={{
                padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                background: recalcLoading ? bdr : bg, color: ink,
                fontSize: 13, fontWeight: 500, cursor: recalcLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {recalcLoading
                ? <><Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Calculating…</>
                : <><Zap size={13} strokeWidth={2} /> Preview score impact</>}
            </button>
            {recalcResult && (
              <div style={{
                padding: '6px 12px', borderRadius: 8,
                background: greenTintBg, border: `1px solid ${greenBorderSoft}`,
                fontSize: 13, fontWeight: 600, color: green,
              }}>
                Q-Score {recalcResult.finalIQ} · {recalcResult.grade}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          onClick={() => setCurrentStep(flowMode === 'fast' && uploadedFiles.length > 0 ? 'extract-results' : 'pitch')}
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: blue, color: white, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {flowMode === 'fast' && uploadedFiles.length > 0
            ? 'See what we found →'
            : uploadedFiles.length > 0 ? 'Continue →' : 'Skip, answer questions →'
          }
        </button>
      </div>
    </div>
  );
}
