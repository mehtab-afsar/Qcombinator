"use client";

import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FolderOpen, MessageSquare, Target, Users, TrendingUp,
  Shield, User, DollarSign, CheckCircle2, Check, BarChart, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { bg, surf, bdr, ink, muted, blue, green } from '@/lib/constants/colors';
import { surf2 } from '@/features/profile-builder/lib/constants';
import type { ProfileBuilderStep, FlowMode, SectionState, SubmitResult } from '@/features/profile-builder/types';

interface ProfileBuilderShellProps {
  currentStep: ProfileBuilderStep;
  flowMode: FlowMode;
  sections: Record<string, SectionState>;
  animatedScores: Record<string, number>;
  submitResult: SubmitResult | null;
  onNavigate: (step: ProfileBuilderStep) => void;
  onExit: () => void;
  children: ReactNode;
}

export function ProfileBuilderShell({
  currentStep, flowMode, sections, animatedScores, submitResult, onNavigate, onExit, children,
}: ProfileBuilderShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Floating Save & Exit ── */}
      <button
        onClick={onExit}
        style={{
          position: 'fixed', top: 20, right: 24, zIndex: 50,
          padding: '9px 18px', borderRadius: 10,
          border: `1px solid ${bdr}`, background: 'rgba(249,247,242,0.95)',
          backdropFilter: 'blur(10px)',
          fontSize: 13, fontWeight: 500, color: ink,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 2px 12px rgba(24,22,15,0.10)',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(24,22,15,0.16)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(24,22,15,0.10)' }}
      >
        Save &amp; Exit
      </button>

      {/* ── Main layout (full height, no header offset) ── */}
      <div style={{ minHeight: '100vh', display: 'flex' }}>

        {/* ── Collapsible left sidebar ── */}
        <div style={{
          width: sidebarOpen ? 224 : 0,
          minWidth: sidebarOpen ? 224 : 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          borderRight: `1px solid ${bdr}`,
          background: surf,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 16px 16px', opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Brand */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: ink, letterSpacing: '-0.01em' }}>Edge Alpha</div>
            </div>

            {/* Setup items */}
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Setup</div>
            {([
              { key: '0', label: 'Documents', Icon: FolderOpen },
              ...(flowMode === 'fast' ? [
                { key: 'extract-results', label: 'Your Snapshot',   Icon: BarChart },
                { key: 'smart-qa',        label: 'Quick Questions', Icon: MessageSquare },
              ] : [
                { key: 'pitch', label: 'Your Pitch', Icon: Target },
              ]),
            ] as Array<{ key: string; label: string; Icon: LucideIcon }>).map(({ key, label, Icon }) => {
              const isActive = String(currentStep) === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === '0') onNavigate(0);
                    else if (key === 'pitch') onNavigate('pitch');
                    else if (key === 'extract-results') onNavigate('extract-results');
                    else if (key === 'smart-qa') onNavigate('smart-qa');
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? surf2 : 'transparent',
                    marginBottom: 1, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bdr }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={14} color={isActive ? blue : muted} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? blue : ink, lineHeight: 1.3 }}>{label}</div>
                </button>
              );
            })}

            {/* Parameters */}
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 16, marginBottom: 8 }}>Parameters</div>
            {([
              { key: '1', label: 'Market & Customers', Icon: Users },
              { key: '2', label: 'Market Potential',   Icon: TrendingUp },
              { key: '3', label: 'IP & Defensibility', Icon: Shield },
              { key: '4', label: 'Founder & Team',     Icon: User },
              { key: '5', label: 'Financials',         Icon: DollarSign },
            ] as Array<{ key: string; label: string; Icon: LucideIcon }>).map(({ key, label, Icon }) => {
              const isActive = String(currentStep) === key;
              const sec = sections[key];
              const pct = animatedScores[key] ?? sec?.completionScore ?? 0;
              const isDone = pct >= 70;
              return (
                <button
                  key={key}
                  onClick={() => onNavigate(parseInt(key, 10))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? surf2 : 'transparent',
                    marginBottom: 1, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bdr }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={14} color={isActive ? blue : muted} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? blue : ink, lineHeight: 1.3 }}>{label}</div>
                    <div style={{ marginTop: 3 }}>
                      <div style={{ height: 2, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isDone ? green : blue, borderRadius: 2, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  </div>
                  {isDone && <Check size={12} color={green} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                </button>
              );
            })}

            {/* Review & Score Report */}
            <div style={{ marginTop: 16 }}>
              {(() => {
                const isActive = String(currentStep) === '6';
                return (
                  <button
                    onClick={() => onNavigate(6)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive && !submitResult ? surf2 : 'transparent',
                      marginBottom: 1, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive || submitResult) e.currentTarget.style.background = bdr }}
                    onMouseLeave={e => { if (!isActive || submitResult) e.currentTarget.style.background = 'transparent' }}
                  >
                    <CheckCircle2 size={14} color={isActive && !submitResult ? blue : muted} strokeWidth={isActive && !submitResult ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: isActive && !submitResult ? 600 : 400, color: isActive && !submitResult ? blue : ink, lineHeight: 1.3 }}>Review & Submit</div>
                  </button>
                );
              })()}
              {submitResult && (() => {
                const isActive = String(currentStep) === '6';
                return (
                  <button
                    onClick={() => onNavigate(6)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? surf2 : 'transparent',
                      marginBottom: 1, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bdr }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <FileText size={14} color={isActive ? blue : green} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? blue : green, lineHeight: 1.3 }}>
                      Score Report · {submitResult.score}
                    </div>
                  </button>
                );
              })()}
            </div>

          </div>
        </div>

        {/* ── Toggle sidebar button ── */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'fixed', top: 20, left: sidebarOpen ? 212 : 8,
            zIndex: 40, width: 24, height: 24, borderRadius: '50%',
            border: `1px solid ${bdr}`, background: bg,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: muted, transition: 'left 0.25s ease',
            boxShadow: '0 1px 4px rgba(24,22,15,0.08)',
          }}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
      <motion.div
        key={String(currentStep)}
        initial={{ opacity: 0, x: 16, filter: 'blur(3px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -16, filter: 'blur(3px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
      </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
