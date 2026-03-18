'use client'

import { useState } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { bg, surf, bdr, ink, muted, green, amber, red } from '../../shared/constants/colors'
import { fmtNum, healthColor } from '../../shared/utils'

interface FinModel {
  mrr: string; growthRate: string; burn: string; grossMargin: string;
  cac: string; ltv: string; cash: string;
}

export function FinancialPanel({ onShare, onClose }: { onShare: (ctx: string) => void; onClose?: () => void }) {
  const [model, setModel] = useState<FinModel>({
    mrr: "", growthRate: "", burn: "", grossMargin: "",
    cac: "", ltv: "", cash: "",
  });

  const set = (key: keyof FinModel) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setModel(prev => ({ ...prev, [key]: e.target.value }));

  const n = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;

  const mrr         = n(model.mrr);
  const growth      = n(model.growthRate);
  const burn        = n(model.burn);
  const gm          = n(model.grossMargin);
  const cac         = n(model.cac);
  const ltv         = n(model.ltv);
  const cash        = n(model.cash);

  const arr         = mrr * 12;
  const grossProfit = mrr * (gm / 100);
  const netBurn     = Math.max(burn - grossProfit, 0);
  const runway      = netBurn > 0 ? cash / netBurn : Infinity;
  const ltvCac      = cac > 0 ? ltv / cac : 0;
  const payback     = grossProfit > 0 ? cac / grossProfit : Infinity;

  const projection = Array.from({ length: 12 }, (_, i) => {
    const mo      = i + 1;
    const mrrMo   = mrr * Math.pow(1 + growth / 100, mo);
    const gpMo    = mrrMo * (gm / 100);
    const nbMo    = Math.max(burn - gpMo, 0);
    const cashLeft = cash - nbMo * mo;
    return { mo, mrr: mrrMo, nb: nbMo, cash: cashLeft };
  });

  const hasData = mrr > 0 || burn > 0;

  const handleShare = () => {
    const lines = [
      "Here is my current financial snapshot — please use these exact numbers for your advice:",
      "",
      `**MRR:** $${fmtNum(mrr)}`,
      `**ARR:** $${fmtNum(arr)}`,
      `**Monthly Burn:** $${fmtNum(burn)}`,
      `**Gross Margin:** ${gm}%`,
      `**Net Burn/mo:** $${fmtNum(netBurn)}`,
      `**Runway:** ${isFinite(runway) ? Math.round(runway) + " months" : "Not burning cash"}`,
      `**Cash in Bank:** $${fmtNum(cash)}`,
      ...(cac   > 0 ? [`**CAC:** $${fmtNum(cac)}`]                                       : []),
      ...(ltv   > 0 ? [`**LTV:** $${fmtNum(ltv)}`]                                       : []),
      ...(ltvCac > 0 ? [`**LTV:CAC Ratio:** ${ltvCac.toFixed(2)}:1`]                     : []),
      ...(isFinite(payback) ? [`**Payback Period:** ${Math.round(payback)} months`]       : []),
      `**Monthly Growth Rate:** ${growth}%`,
    ];
    onShare(lines.join("\n"));
  };

  const inputFields: { key: keyof FinModel; label: string; placeholder: string }[] = [
    { key: "mrr",         label: "MRR ($)",            placeholder: "12,000"   },
    { key: "growthRate",  label: "Monthly Growth (%)",  placeholder: "8"        },
    { key: "burn",        label: "Monthly Burn ($)",    placeholder: "45,000"   },
    { key: "grossMargin", label: "Gross Margin (%)",    placeholder: "72"       },
    { key: "cac",         label: "CAC ($)",             placeholder: "800"      },
    { key: "ltv",         label: "LTV ($)",             placeholder: "4,800"    },
    { key: "cash",        label: "Cash in Bank ($)",    placeholder: "250,000"  },
  ];

  const vitals = [
    { label: "ARR",             value: "$" + fmtNum(arr),                                               accent: ink   },
    { label: "Net Burn / mo",   value: netBurn > 0 ? "$" + fmtNum(netBurn) : "Cash positive",            accent: netBurn === 0 ? green : healthColor(runway, 6, 18) },
    { label: "Runway",          value: isFinite(runway) ? fmtNum(runway, 1) + " mo" : "∞",              accent: isFinite(runway) ? healthColor(runway, 6, 18) : green },
    ...(ltvCac > 0 ? [{ label: "LTV : CAC",     value: ltvCac.toFixed(1) + " : 1",                     accent: healthColor(ltvCac, 2, 3) }] : []),
    ...(isFinite(payback) && payback > 0 ? [{ label: "Payback Period", value: Math.round(payback) + " mo", accent: payback <= 12 ? green : payback <= 18 ? amber : red }] : []),
  ];

  return (
    <div style={{
      width: 420, flexShrink: 0,
      borderLeft: `1px solid ${bdr}`,
      background: bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{ flexShrink: 0 }}>
        {/* Green gradient accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #16A34A, #34D399, #16A34A)", backgroundSize: "200% 100%", borderRadius: "0 0 2px 2px" }} />
        <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              height: 34, width: 34, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)",
              border: "1.5px solid #86EFAC",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: green,
            }}>
              F
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>Felix</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ height: 6, width: 6, borderRadius: "50%", background: green }} />
                <p style={{ fontSize: 10, color: muted, fontWeight: 500, letterSpacing: "0.02em" }}>AI Actions ready</p>
              </div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose}
              style={{ background: "none", border: `1px solid ${bdr}`, cursor: "pointer", color: muted, display: "flex", padding: "5px 6px", borderRadius: 7, transition: "border-color .15s, color .15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ink; (e.currentTarget as HTMLElement).style.color = ink; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; (e.currentTarget as HTMLElement).style.color = muted; }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ height: 1, background: bdr }} />
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {inputFields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: key === "cash" ? "1 / -1" : "auto" }}>
              <label style={{
                display: "block", marginBottom: 5,
                fontSize: 10, fontWeight: 600, color: muted,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                {label}
              </label>
              <input
                type="number"
                value={model[key]}
                onChange={set(key)}
                placeholder={placeholder}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, color: ink,
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = green; }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = bdr;   }}
              />
            </div>
          ))}
        </div>
      </div>

      {hasData && vitals.length > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              Vitals
            </p>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1, background: bdr,
            borderTop: `1px solid ${bdr}`,
          }}>
            {vitals.map(({ label, value, accent }) => (
              <div key={label} style={{ background: bg, padding: "14px 16px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                  {label}
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mrr > 0 && burn > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              12-Month Projection
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr", gap: 8, padding: "6px 16px 6px", borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}` }}>
            {["Mo", "MRR", "Burn", "Cash"].map(h => (
              <p key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600, textAlign: h === "Mo" ? "left" : "right" }}>{h}</p>
            ))}
          </div>
          {projection.map(({ mo, mrr: mrrMo, nb, cash: cl }) => {
            const depleted = cl < 0;
            const low      = cl < cash * 0.15 && !depleted;
            return (
              <div
                key={mo}
                style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr",
                  gap: 8, padding: "7px 16px",
                  borderBottom: `1px solid ${bdr}`,
                  background: mo % 2 === 0 ? surf : bg,
                }}
              >
                <p style={{ fontSize: 11, color: muted }}>{mo}</p>
                <p style={{ fontSize: 11, color: ink, textAlign: "right" }}>
                  ${mrrMo >= 1000 ? (mrrMo / 1000).toFixed(1) + "k" : fmtNum(mrrMo)}
                </p>
                <p style={{ fontSize: 11, color: amber, textAlign: "right" }}>
                  ${nb >= 1000 ? (nb / 1000).toFixed(1) + "k" : fmtNum(nb)}
                </p>
                <p style={{
                  fontSize: 11, textAlign: "right", fontWeight: depleted ? 700 : 400,
                  color: depleted ? red : low ? amber : green,
                }}>
                  {depleted
                    ? "Out"
                    : "$" + (cl >= 1000 ? (cl / 1000).toFixed(0) + "k" : fmtNum(cl))}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "16px 20px", marginTop: "auto" }}>
        <button
          onClick={handleShare}
          disabled={!hasData}
          style={{
            width: "100%", padding: "10px 14px",
            background: hasData ? green : surf,
            color: hasData ? "#fff" : muted,
            border: `1px solid ${hasData ? green : bdr}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: hasData ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "opacity .15s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { if (hasData) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <ChevronRight style={{ height: 13, width: 13 }} />
          Share model with Felix
        </button>
        <p style={{ fontSize: 11, color: muted, textAlign: "center", marginTop: 8, opacity: 0.7 }}>
          Felix will reference your exact numbers
        </p>
      </div>
    </div>
  );
}
