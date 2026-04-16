'use client';

import { useState, useEffect, useCallback } from 'react';
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

interface IndicatorConfig {
  id: string;
  code: string;
  parameterId: number;
  name: string;
  description: string;
  unit: string;
  score1Max: number | null;
  score3Max: number | null;
  score5Min: number | null;
  higherIsBetter: boolean;
  aiReconciled: boolean;
  isActive: boolean;
  benchmarkSource?: string;
  notes?: string;
}

const PARAM_NAMES: Record<number, string> = {
  1: 'Market Readiness',
  2: 'Market Potential',
  3: 'IP / Defensibility',
  4: 'Founder / Team',
  5: 'Structural Impact',
};

export default function IQConfigPage() {
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<IndicatorConfig>>>({});
  const [filterParam, setFilterParam] = useState<number | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/iq/indicators');
      const data = await res.json();
      setIndicators(data.indicators ?? []);
    } catch {
      showToast('Failed to load indicators', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleEdit(code: string, field: keyof IndicatorConfig, value: unknown) {
    setEdits(prev => ({
      ...prev,
      [code]: { ...(prev[code] ?? {}), [field]: value },
    }));
  }

  async function handleSave(code: string) {
    const patch = edits[code];
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving(code);
    try {
      const res = await fetch('/api/iq/indicators', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Save failed', false);
      } else {
        showToast(`${code} updated`, true);
        setEdits(prev => { const n = { ...prev }; delete n[code]; return n; });
        await load();
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setSaving(null);
    }
  }

  function getVal(ind: IndicatorConfig, field: keyof IndicatorConfig) {
    const edit = edits[ind.code];
    if (edit && field in edit) return edit[field as keyof typeof edit] as unknown;
    return ind[field];
  }

  const displayed = filterParam
    ? indicators.filter(i => i.parameterId === filterParam)
    : indicators;

  const grouped = [1, 2, 3, 4, 5].map(pid => ({
    pid,
    name: PARAM_NAMES[pid],
    indicators: displayed.filter(i => i.parameterId === pid),
  })).filter(g => g.indicators.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>IQ Indicator Config</h1>
            <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>
              Edit scoring thresholds — changes take effect on the next IQ calculation (cache invalidated automatically)
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: '8px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8, color: ink, fontSize: 13, cursor: 'pointer' }}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* Parameter filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterParam(null)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `1px solid ${filterParam === null ? blue : bdr}`, background: filterParam === null ? blue : surf, color: filterParam === null ? '#fff' : ink, cursor: 'pointer' }}
          >
            All
          </button>
          {[1, 2, 3, 4, 5].map(pid => (
            <button
              key={pid}
              onClick={() => setFilterParam(pid === filterParam ? null : pid)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `1px solid ${filterParam === pid ? blue : bdr}`, background: filterParam === pid ? blue : surf, color: filterParam === pid ? '#fff' : ink, cursor: 'pointer' }}
            >
              P{pid}: {PARAM_NAMES[pid]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>Loading indicators…</div>
        ) : (
          grouped.map(group => (
            <div key={group.pid} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                Parameter {group.pid} — {group.name}
              </h2>

              <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 110px 110px 110px 80px 80px 90px', gap: 0, background: surf, padding: '8px 16px', borderBottom: `1px solid ${bdr}` }}>
                  {['Code', 'Name', 'Unit', 'Score 1 Max', 'Score 3 Max', 'Score 5 Min', 'Higher Better', 'Active', ''].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>

                {group.indicators.map((ind, idx) => {
                  const isDirty = !!edits[ind.code] && Object.keys(edits[ind.code]).length > 0;
                  const isSaving = saving === ind.code;

                  return (
                    <div
                      key={ind.code}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 100px 110px 110px 110px 80px 80px 90px',
                        gap: 0,
                        padding: '10px 16px',
                        borderBottom: idx < group.indicators.length - 1 ? `1px solid ${bdr}` : undefined,
                        background: isDirty ? '#FFFBEB' : '#fff',
                        alignItems: 'center',
                      }}
                    >
                      {/* Code */}
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ind.aiReconciled ? blue : ink }}>{ind.code}</span>
                        {ind.aiReconciled && (
                          <span style={{ fontSize: 9, background: '#EFF6FF', color: blue, padding: '1px 4px', borderRadius: 4, marginLeft: 4 }}>AI</span>
                        )}
                      </div>

                      {/* Name + benchmark */}
                      <div>
                        <div style={{ fontSize: 12, color: ink }}>{ind.name}</div>
                        {ind.benchmarkSource && (
                          <div style={{ fontSize: 10, color: muted }}>{ind.benchmarkSource}</div>
                        )}
                      </div>

                      {/* Unit */}
                      <div style={{ fontSize: 12, color: muted }}>{ind.unit}</div>

                      {/* Score 1 Max */}
                      <NumberInput
                        value={getVal(ind, 'score1Max') as number | null}
                        onChange={v => handleEdit(ind.code, 'score1Max', v)}
                        placeholder="—"
                      />

                      {/* Score 3 Max */}
                      <NumberInput
                        value={getVal(ind, 'score3Max') as number | null}
                        onChange={v => handleEdit(ind.code, 'score3Max', v)}
                        placeholder="—"
                      />

                      {/* Score 5 Min */}
                      <NumberInput
                        value={getVal(ind, 'score5Min') as number | null}
                        onChange={v => handleEdit(ind.code, 'score5Min', v)}
                        placeholder="—"
                      />

                      {/* Higher is better */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <input
                          type="checkbox"
                          checked={getVal(ind, 'higherIsBetter') as boolean}
                          onChange={e => handleEdit(ind.code, 'higherIsBetter', e.target.checked)}
                          style={{ width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </div>

                      {/* Active */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <input
                          type="checkbox"
                          checked={getVal(ind, 'isActive') as boolean}
                          onChange={e => handleEdit(ind.code, 'isActive', e.target.checked)}
                          style={{ width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </div>

                      {/* Save button */}
                      <button
                        onClick={() => handleSave(ind.code)}
                        disabled={!isDirty || isSaving}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          borderRadius: 6,
                          border: `1px solid ${isDirty ? green : bdr}`,
                          background: isDirty ? green : surf,
                          color: isDirty ? '#fff' : muted,
                          cursor: isDirty ? 'pointer' : 'default',
                          fontWeight: 600,
                        }}
                      >
                        {isSaving ? '…' : 'Save'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 24, padding: '12px 16px', background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 12, color: muted }}>
            <span style={{ fontWeight: 600, color: blue }}>AI</span> = AI-reconciled (uses consensus LLM scoring)
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            Yellow row = unsaved changes
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            Score 1 Max: value ≤ this = score 1 | Score 5 Min: value ≥ this = score 5
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '10px 20px',
          background: toast.ok ? green : red,
          color: '#fff',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 9999,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => {
        const v = e.target.value === '' ? null : parseFloat(e.target.value);
        onChange(v != null && isFinite(v) ? v : null);
      }}
      style={{
        width: 90,
        padding: '4px 8px',
        fontSize: 12,
        border: `1px solid ${bdr}`,
        borderRadius: 6,
        background: bg,
        color: ink,
        outline: 'none',
      }}
    />
  );
}
