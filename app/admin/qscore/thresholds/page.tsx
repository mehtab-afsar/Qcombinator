'use client';

import { useState, useEffect, useCallback } from 'react';
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

interface TierRow {
  dimension: string;
  metric: string;
  tierRank: number;
  minValue: number | null;
  maxValue: number | null;
  points: number;
  maxPoints: number;
  label: string;
  isActive?: boolean;
}

interface WeightRow {
  sector: string;
  dimension: string;
  weight: number;
}

const DIMENSION_LABELS: Record<string, string> = {
  market: 'Market',
  product: 'Product',
  goToMarket: 'Go-to-Market',
  financial: 'Financial',
  team: 'Team',
  traction: 'Traction',
};

const SECTOR_LABELS: Record<string, string> = {
  default: 'Default (SaaS)',
  saas_b2b: 'SaaS B2B',
  deeptech: 'Deep Tech',
  consumer: 'Consumer',
  healthtech: 'Health Tech',
  fintech: 'Fintech',
  climatetech: 'Climate Tech',
  edtech: 'EdTech',
};

const DIMENSIONS = ['market', 'product', 'goToMarket', 'financial', 'team', 'traction'];

// Tier edit key: "dimension.metric.tierRank"
function tierKey(t: TierRow) {
  return `${t.dimension}.${t.metric}.${t.tierRank}`;
}

// Weight edit key: "sector.dimension"
function weightKey(w: WeightRow) {
  return `${w.sector}.${w.dimension}`;
}

export default function QScoreThresholdsPage() {
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [weights, setWeights] = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [tierEdits, setTierEdits] = useState<Record<string, Partial<TierRow>>>({});
  const [weightEdits, setWeightEdits] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'tiers' | 'weights'>('tiers');
  const [filterDim, setFilterDim] = useState<string | null>(null);
  const [filterSector, setFilterSector] = useState<string>('default');

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qscore/thresholds');
      const data = await res.json();

      // Convert thresholds map (plain object) back to TierRow[]
      const allTiers: TierRow[] = [];
      for (const [key, tierList] of Object.entries(data.thresholds ?? {})) {
        const [dimension, metric] = key.split('.');
        for (const t of tierList as TierRow[]) {
          allTiers.push({ ...t, dimension, metric });
        }
      }
      setTiers(allTiers);
      setWeights(data.weights ?? []);
    } catch {
      showToast('Failed to load config', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Tier editing ──────────────────────────────────────────────────────────

  function handleTierEdit(key: string, field: keyof TierRow, value: unknown) {
    setTierEdits(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }));
  }

  async function handleTierSave(tier: TierRow) {
    const key = tierKey(tier);
    const patch = tierEdits[key];
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving(key);
    try {
      const res = await fetch('/api/qscore/thresholds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension: tier.dimension,
          metric: tier.metric,
          tierRank: tier.tierRank,
          minValue: 'minValue' in patch ? patch.minValue : undefined,
          maxValue: 'maxValue' in patch ? patch.maxValue : undefined,
          points: 'points' in patch ? patch.points : undefined,
          label: 'label' in patch ? patch.label : undefined,
          isActive: 'isActive' in patch ? patch.isActive : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Save failed', false);
      } else {
        showToast(`${tier.dimension}.${tier.metric} tier ${tier.tierRank} updated`, true);
        setTierEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
        await load();
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setSaving(null);
    }
  }

  function getTierVal<K extends keyof TierRow>(tier: TierRow, field: K): TierRow[K] {
    const k = tierKey(tier);
    const edit = tierEdits[k];
    if (edit && field in edit) return edit[field as keyof typeof edit] as unknown as TierRow[K];
    return tier[field];
  }

  // ── Weight editing ────────────────────────────────────────────────────────

  function handleWeightEdit(key: string, value: number) {
    setWeightEdits(prev => ({ ...prev, [key]: value }));
  }

  async function handleWeightSave(w: WeightRow) {
    const key = weightKey(w);
    const newWeight = weightEdits[key];
    if (newWeight === undefined) return;

    setSaving(key);
    try {
      const res = await fetch('/api/qscore/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: w.sector, dimension: w.dimension, weight: newWeight }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Save failed', false);
      } else {
        showToast(`${w.sector} / ${w.dimension} weight updated`, true);
        setWeightEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
        await load();
      }
    } catch {
      showToast('Network error', false);
    } finally {
      setSaving(null);
    }
  }

  // ── Computed views ────────────────────────────────────────────────────────

  const displayedTiers = filterDim
    ? tiers.filter(t => t.dimension === filterDim)
    : tiers;

  // Group tiers: dimension → metric → tiers[]
  const tierGroups: { dim: string; metrics: { metric: string; tiers: TierRow[] }[] }[] = DIMENSIONS
    .map(dim => ({
      dim,
      metrics: Array.from(
        displayedTiers
          .filter(t => t.dimension === dim)
          .reduce((acc, t) => {
            if (!acc.has(t.metric)) acc.set(t.metric, []);
            acc.get(t.metric)!.push(t);
            return acc;
          }, new Map<string, TierRow[]>())
          .entries()
      ).map(([metric, tiers]) => ({
        metric,
        tiers: [...tiers].sort((a, b) => a.tierRank - b.tierRank),
      })),
    }))
    .filter(g => g.metrics.length > 0);

  // Weights for selected sector
  const sectorWeights = weights.filter(w => w.sector === filterSector);
  // Sum for validation display
  const weightSum = sectorWeights.reduce((s, w) => {
    const k = weightKey(w);
    return s + (weightEdits[k] !== undefined ? weightEdits[k] : w.weight);
  }, 0);
  const weightSumOk = Math.abs(weightSum - 1.0) < 0.005;

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>Q-Score Threshold Config</h1>
            <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>
              Edit scoring tiers and dimension weights — changes take effect on next Q-Score calculation (cache invalidated automatically)
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${bdr}`, paddingBottom: 0 }}>
          {(['tiers', 'weights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${blue}` : '2px solid transparent',
                color: activeTab === tab ? blue : muted,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {tab === 'tiers' ? 'Scoring Tiers' : 'Dimension Weights'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: muted }}>Loading…</div>
        ) : activeTab === 'tiers' ? (
          <>
            {/* Dimension filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilterDim(null)}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `1px solid ${filterDim === null ? blue : bdr}`, background: filterDim === null ? blue : surf, color: filterDim === null ? '#fff' : ink, cursor: 'pointer' }}
              >
                All
              </button>
              {DIMENSIONS.map(dim => (
                <button
                  key={dim}
                  onClick={() => setFilterDim(dim === filterDim ? null : dim)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `1px solid ${filterDim === dim ? blue : bdr}`, background: filterDim === dim ? blue : surf, color: filterDim === dim ? '#fff' : ink, cursor: 'pointer' }}
                >
                  {DIMENSION_LABELS[dim] ?? dim}
                </button>
              ))}
            </div>

            {tierGroups.map(({ dim, metrics }) => (
              <div key={dim} style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                  {DIMENSION_LABELS[dim] ?? dim}
                </h2>

                {metrics.map(({ metric, tiers: metricTiers }) => (
                  <div key={metric} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6, paddingLeft: 2 }}>
                      {metric.replace(/_/g, ' ')}
                    </div>

                    <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 10, overflow: 'hidden' }}>
                      {/* Table header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 120px 120px 90px 90px 1fr 70px 70px', gap: 0, background: surf, padding: '7px 14px', borderBottom: `1px solid ${bdr}` }}>
                        {['Rank', 'Min Value', 'Max Value', 'Points', 'Max Pts', 'Label', 'Active', ''].map(h => (
                          <div key={h} style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                        ))}
                      </div>

                      {metricTiers.map((tier, idx) => {
                        const key = tierKey(tier);
                        const isDirty = !!tierEdits[key] && Object.keys(tierEdits[key]).length > 0;
                        const isSaving = saving === key;

                        return (
                          <div
                            key={key}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '60px 120px 120px 90px 90px 1fr 70px 70px',
                              gap: 0,
                              padding: '8px 14px',
                              borderBottom: idx < metricTiers.length - 1 ? `1px solid ${bdr}` : undefined,
                              background: isDirty ? '#FFFBEB' : '#fff',
                              alignItems: 'center',
                            }}
                          >
                            {/* Rank */}
                            <div style={{ fontSize: 11, fontWeight: 700, color: muted }}>#{tier.tierRank}</div>

                            {/* Min Value */}
                            <NullableNumberInput
                              value={getTierVal(tier, 'minValue')}
                              onChange={v => handleTierEdit(key, 'minValue', v)}
                              placeholder="none"
                            />

                            {/* Max Value */}
                            <NullableNumberInput
                              value={getTierVal(tier, 'maxValue')}
                              onChange={v => handleTierEdit(key, 'maxValue', v)}
                              placeholder="none"
                            />

                            {/* Points */}
                            <NumberInput
                              value={getTierVal(tier, 'points')}
                              onChange={v => handleTierEdit(key, 'points', v ?? 0)}
                            />

                            {/* Max Points (read-only context) */}
                            <div style={{ fontSize: 11, color: muted }}>{tier.maxPoints} max</div>

                            {/* Label */}
                            <input
                              type="text"
                              value={getTierVal(tier, 'label') as string}
                              onChange={e => handleTierEdit(key, 'label', e.target.value)}
                              style={{ padding: '3px 8px', fontSize: 11, border: `1px solid ${bdr}`, borderRadius: 5, background: bg, color: ink, outline: 'none', width: '100%' }}
                            />

                            {/* Active */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={(getTierVal(tier, 'isActive') as boolean | undefined) ?? true}
                                onChange={e => handleTierEdit(key, 'isActive', e.target.checked)}
                                style={{ width: 14, height: 14, cursor: 'pointer' }}
                              />
                            </div>

                            {/* Save */}
                            <button
                              onClick={() => handleTierSave(tier)}
                              disabled={!isDirty || isSaving}
                              style={{
                                padding: '3px 10px',
                                fontSize: 11,
                                borderRadius: 5,
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
                ))}
              </div>
            ))}

            {/* Tier legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 8, padding: '10px 14px', background: surf, borderRadius: 8, border: `1px solid ${bdr}`, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: muted }}>Tiers evaluated in Rank order (1 = first checked). First matching tier wins.</div>
              <div style={{ fontSize: 12, color: muted }}>Min/Max Value: leave blank for open-ended (e.g. &quot;≥ anything&quot;)</div>
              <div style={{ fontSize: 12, color: muted }}>Yellow row = unsaved changes</div>
            </div>
          </>
        ) : (
          <>
            {/* Sector selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {Object.keys(SECTOR_LABELS).map(sector => (
                <button
                  key={sector}
                  onClick={() => setFilterSector(sector)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `1px solid ${filterSector === sector ? blue : bdr}`, background: filterSector === sector ? blue : surf, color: filterSector === sector ? '#fff' : ink, cursor: 'pointer' }}
                >
                  {SECTOR_LABELS[sector]}
                </button>
              ))}
            </div>

            {/* Weight sum indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: muted }}>Weight sum for <strong style={{ color: ink }}>{SECTOR_LABELS[filterSector] ?? filterSector}</strong>:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: weightSumOk ? green : red }}>
                {(weightSum * 100).toFixed(1)}% {weightSumOk ? '✓' : '⚠ must equal 100%'}
              </span>
            </div>

            {/* Weight table */}
            <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 80px', gap: 0, background: surf, padding: '8px 16px', borderBottom: `1px solid ${bdr}` }}>
                {['Dimension', 'Weight', '% of Total', ''].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>

              {sectorWeights.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: muted, fontSize: 13 }}>
                  No weights found for this sector. Run the DB migration to seed defaults.
                </div>
              ) : (
                DIMENSIONS.map((dim, idx) => {
                  const row = sectorWeights.find(w => w.dimension === dim);
                  if (!row) return null;
                  const key = weightKey(row);
                  const currentVal = weightEdits[key] !== undefined ? weightEdits[key] : row.weight;
                  const isDirty = weightEdits[key] !== undefined;
                  const isSaving = saving === key;

                  return (
                    <div
                      key={dim}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 160px 120px 80px',
                        gap: 0,
                        padding: '10px 16px',
                        borderBottom: idx < DIMENSIONS.length - 1 ? `1px solid ${bdr}` : undefined,
                        background: isDirty ? '#FFFBEB' : '#fff',
                        alignItems: 'center',
                      }}
                    >
                      {/* Dimension name */}
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{DIMENSION_LABELS[dim] ?? dim}</span>
                      </div>

                      {/* Weight input (0.00–1.00) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={currentVal}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            if (isFinite(v)) handleWeightEdit(key, v);
                          }}
                          style={{ width: 80, padding: '5px 8px', fontSize: 12, border: `1px solid ${bdr}`, borderRadius: 6, background: bg, color: ink, outline: 'none' }}
                        />
                        <span style={{ fontSize: 11, color: muted }}>decimal</span>
                      </div>

                      {/* % display */}
                      <div>
                        <div style={{ fontSize: 13, color: ink, marginBottom: 2 }}>{(currentVal * 100).toFixed(1)}%</div>
                        <div style={{ height: 4, background: bdr, borderRadius: 2, width: 100, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, currentVal * 100)}%`, background: blue, borderRadius: 2 }} />
                        </div>
                      </div>

                      {/* Save */}
                      <button
                        onClick={() => handleWeightSave(row)}
                        disabled={!isDirty || isSaving}
                        style={{
                          padding: '5px 12px',
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
                })
              )}
            </div>

            {/* Weight legend */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 12, color: muted }}>
                Weights must sum to 1.0 (100%) per sector. Changes apply to all founders whose sector maps to this key. The &quot;Default (SaaS)&quot; sector is used as fallback when no match is found.
              </div>
            </div>
          </>
        )}
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

function NullableNumberInput({
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
        width: 100,
        padding: '3px 8px',
        fontSize: 11,
        border: `1px solid ${bdr}`,
        borderRadius: 5,
        background: bg,
        color: ink,
        outline: 'none',
      }}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => {
        const v = parseFloat(e.target.value);
        onChange(isFinite(v) ? v : null);
      }}
      style={{
        width: 70,
        padding: '3px 8px',
        fontSize: 11,
        border: `1px solid ${bdr}`,
        borderRadius: 5,
        background: bg,
        color: ink,
        outline: 'none',
      }}
    />
  );
}
