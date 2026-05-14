"use client";
import React, { useState, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, Brush, Line,
} from "recharts";
import {
  ROWS, CATEGORIES, MARKETS, CATEGORY_MANAGERS,
  computeMetrics, computeSupplierSplit, computeWeeklyChart,
  supplierKey, SUPPLIER_COLOR,
  type SpendRow,
} from "@/lib/data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${n.toLocaleString()}`;
const fmtFull = (n: number) => `€${n.toLocaleString('de-DE')}`;

const CATEGORY_CHIP: Record<string, { bg: string; color: string }> = {
  Bakery:  { bg: '#FEF3C7', color: '#92400E' },
  Grocery: { bg: '#EFF6FF', color: '#1E40AF' },
  Protein: { bg: '#F0FDF4', color: '#166534' },
};

const MARKET_CHIP: Record<string, { bg: string; color: string }> = {
  DACH:    { bg: '#F5F5F5', color: '#374151' },
  US:      { bg: '#EFF6FF', color: '#1E40AF' },
  DKSE:    { bg: '#FDF4FF', color: '#7E22CE' },
  BENELUX: { bg: '#FFF7ED', color: '#9A3412' },
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, tone }: {
  label: string; value: string; sub?: string;
  tone?: 'positive' | 'warning' | 'danger' | 'neutral';
}) {
  const subColor = tone === 'positive' ? '#067A46' : tone === 'warning' ? '#A43700' : tone === 'danger' ? '#B30000' : '#676767';
  return (
    <div style={{
      flex: 1, minWidth: 140, background: '#fff', borderRadius: 10, padding: '18px 20px',
      border: `1px solid ${tone === 'danger' ? '#FCA5A5' : tone === 'warning' ? '#FCD34D' : '#E4E4E4'}`,
      boxShadow: '0 1px 3px rgba(36,36,36,.06)',
    }}>
      <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {label}
      </div>
      <div style={{ font: '700 24px/30px var(--font-display)', color: '#242424' }}>{value}</div>
      {sub && <div style={{ font: '400 12px/16px var(--font-body)', color: subColor, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Supplier bar ──────────────────────────────────────────────────────────────
function SupplierBar({ supplier, actual, awarded, pct, color, onClick }: {
  supplier: string; actual: number; awarded: number; pct: number; color: string; onClick?: () => void;
}) {
  const utilPct = awarded > 0 ? Math.round(actual / awarded * 100) : 0;
  const isAtRisk = utilPct >= 80;
  return (
    <div
      onClick={onClick}
      style={{ marginBottom: 14, cursor: onClick ? 'pointer' : 'default', borderRadius: 8, padding: '4px 6px', transition: 'background 120ms' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = '#F8F8F8'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ font: '600 13px/18px var(--font-body)', color: '#242424' }}>{supplier}</span>
          {onClick && <span style={{ font: '400 10px/14px var(--font-body)', color: '#9CA3AF' }}>↗</span>}
        </div>
        <span style={{ font: '700 13px/18px var(--font-body)', color: isAtRisk ? '#B30000' : '#242424' }}>
          {utilPct}%
          {isAtRisk && <span style={{ marginLeft: 4, fontSize: 11 }}>⚠</span>}
        </span>
      </div>
      <div style={{ height: 8, background: '#EEE', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: isAtRisk ? '#DC2626' : color, borderRadius: 6, transition: 'width 600ms cubic-bezier(0,0,0.2,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ font: '400 11px/14px var(--font-body)', color: '#676767' }}>{fmtFull(actual)} actual</span>
        <span style={{ font: '400 11px/14px var(--font-body)', color: '#676767' }}>of {fmtFull(awarded)}</span>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const bars = (payload ?? []).filter(p => (p.value ?? 0) > 0 && p.dataKey !== 'yoyTotal');
  const yoy = payload.find(p => p.dataKey === 'yoyTotal');
  const total = bars.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{
      background: '#fff', border: '1px solid #E4E4E4', borderRadius: 8,
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.12)',
      font: '400 13px/18px var(--font-body)', minWidth: 200,
    }}>
      <div style={{ font: '600 13px/18px var(--font-body)', color: '#242424', marginBottom: 8 }}>{label}</div>
      {bars.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#4B4B4B', marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </span>
          <span style={{ fontWeight: 600 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
      {bars.length > 1 && (
        <div style={{ borderTop: '1px solid #EEE', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#242424' }}>
          <span>Total</span><span>{fmtFull(total)}</span>
        </div>
      )}
      {yoy && (
        <div style={{ borderTop: '1px solid #EEE', marginTop: 6, paddingTop: 6, font: '400 11px/14px var(--font-body)', color: '#7C3AED', display: 'flex', justifyContent: 'space-between' }}>
          <span>Prior Year (est.)</span><span>{fmtFull(yoy.value)}</span>
        </div>
      )}
    </div>
  );
}

// ── Custom angled XAxis tick ──────────────────────────────────────────────────
function AngledTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#676767" fontSize={9} transform="rotate(-40)">
        {payload.value}
      </text>
    </g>
  );
}

// ── Info tooltip ──────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const handleEnter = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top - 8 });
  };
  return (
    <span onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)} onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, cursor: 'default' }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" stroke="#676767" strokeWidth="1.5"/>
        <path d="M8 7v5M8 5v.5" stroke="#676767" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {pos && (
        <span style={{
          position: 'fixed', left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)',
          background: '#242424', color: '#fff', font: '400 12px/16px var(--font-body)', padding: '6px 10px',
          borderRadius: 6, whiteSpace: 'nowrap', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,.25)',
          pointerEvents: 'none', maxWidth: 280, textAlign: 'left' as const,
        }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #242424' }} />
        </span>
      )}
    </span>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
const TABLE_COLS = [
  { key: 'contractWeek',             label: 'Week',           tip: 'ISO contract week (e.g. 2025-W32)',                                    w: 90  },
  { key: 'category',                 label: 'Category',       tip: 'Product category: Bakery, Grocery or Protein',                         w: 90  },
  { key: 'market',                   label: 'Market',         tip: 'Geographic market (DACH, US, DKSE, BENELUX)',                           w: 80  },
  { key: 'supplier',                 label: 'Supplier',       tip: 'Contracted supplier for this SKU',                                     w: 200 },
  { key: 'categoryManager',          label: 'Cat. Manager',   tip: 'EU/UK category manager responsible for this SKU',                      w: 200 },
  { key: 'actualsStatus',            label: 'Status',         tip: 'Historical = confirmed actuals; Forecast = projected spend',           w: 100 },
  { key: 'adherencePct',             label: 'Adherence %',    tip: 'Actual volume delivered vs contracted volume (%)',                     w: 100 },
  { key: 'weeklyActualQty',          label: 'Period Qty',     tip: 'Units delivered in this period',                                       w: 100 },
  { key: 'cumulativeActualSpendEur', label: 'Spend to Date',  tip: 'Total actual spend accumulated from contract start to this week (€)',  w: 130 },
  { key: 'cumulativeAwardedSpendEur',label: 'Awarded Budget', tip: 'Total contracted/awarded budget accumulated to this week (€)',         w: 130 },
  { key: 'spendDiffPct',             label: 'vs Budget %',    tip: 'Variance: actual spend vs awarded budget (negative = under-spending)', w: 100 },
  { key: 'budgetRisk',               label: 'Risk',           tip: 'Budget exhaustion risk: High (≥ −10%), Medium (≥ −40%), Low (< −40%)', w: 80  },
] as const;

type ColKey = typeof TABLE_COLS[number]['key'];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function DataTable({ rows }: { rows: SpendRow[] }) {
  const [sortKey, setSortKey] = useState<ColKey>('contractWeek');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = useMemo(() =>
    [...rows].sort((a, b) => {
      const av = a[sortKey as keyof SpendRow];
      const bv = b[sortKey as keyof SpendRow];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    }), [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggle = (key: ColKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E4E4E4',
    background: enabled ? '#fff' : '#F8F8F8', color: enabled ? '#242424' : '#BBB',
    font: '600 12px/16px var(--font-body)', cursor: enabled ? 'pointer' : 'default',
  });

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 13px/18px var(--font-body)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E4E4E4' }}>
              {TABLE_COLS.map(col => (
                <th key={col.key} onClick={() => toggle(col.key)} style={{
                  padding: '10px 12px', textAlign: 'left', color: '#676767',
                  font: '600 12px/16px var(--font-body)', cursor: 'pointer',
                  whiteSpace: 'nowrap', width: col.w, userSelect: 'none',
                  background: sortKey === col.key ? '#F8F8F8' : 'transparent',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.label}
                    <span style={{ opacity: 0.5 }}>{sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    <InfoTip text={col.tip} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const isForecast = row.actualsStatus === 'Forecast';
              const diffColor  = row.spendDiffPct >= -10 ? '#B30000' : row.spendDiffPct >= -40 ? '#A43700' : '#4B4B4B';
              const catStyle   = CATEGORY_CHIP[row.category] ?? { bg: '#F5F5F5', color: '#4B4B4B' };
              const mktStyle   = MARKET_CHIP[row.market]     ?? { bg: '#F5F5F5', color: '#4B4B4B' };
              return (
                <tr key={i} style={{ borderBottom: '1px solid #F0F0F0', background: isForecast ? '#FAFFF5' : 'transparent' }}>
                  <td style={{ padding: '9px 12px', color: '#242424', fontFamily: 'var(--font-mono)' }}>{row.contractWeek}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: catStyle.bg, color: catStyle.color }}>{row.category}</span>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: mktStyle.bg, color: mktStyle.color }}>{row.market}</span>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: SUPPLIER_COLOR[row.supplier] ?? '#BBB', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ color: '#242424', fontWeight: 500 }}>{row.supplier}</span>
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', color: '#4B4B4B', font: '400 12px/18px var(--font-body)', whiteSpace: 'nowrap' }}>{row.categoryManager}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: isForecast ? '#E9FAFF' : '#F6FDE9', color: isForecast ? '#001DB2' : '#067A46' }}>{row.actualsStatus}</span>
                  </td>
                  <td style={{ padding: '9px 12px', color: row.adherencePct === 0 ? '#BBB' : '#242424', fontFamily: 'var(--font-mono)' }}>{row.adherencePct > 0 ? `${row.adherencePct}%` : '—'}</td>
                  <td style={{ padding: '9px 12px', color: row.weeklyActualQty === 0 ? '#BBB' : '#242424', fontFamily: 'var(--font-mono)' }}>{row.weeklyActualQty > 0 ? row.weeklyActualQty.toLocaleString() : '—'}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: '#242424' }}>{fmtFull(row.cumulativeActualSpendEur)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: '#676767' }}>{fmtFull(row.cumulativeAwardedSpendEur)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: diffColor, fontWeight: 600 }}>{row.spendDiffPct > 0 ? '+' : ''}{row.spendDiffPct}%</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: row.budgetRisk === 'High' ? '#FEE2E2' : row.budgetRisk === 'Medium' ? '#FEF3C7' : '#F6FDE9', color: row.budgetRisk === 'High' ? '#B30000' : row.budgetRisk === 'Medium' ? '#92400E' : '#067A46' }}>{row.budgetRisk}</span>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr><td colSpan={12} style={{ padding: '32px', textAlign: 'center', color: '#BBB', font: '400 14px/20px var(--font-body)' }}>No rows match the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #EEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '400 12px/16px var(--font-body)', color: '#676767' }}>Rows per page:</span>
          {PAGE_SIZE_OPTIONS.map(n => (
            <button key={n} onClick={() => { setPageSize(n); setPage(1); }} style={{
              padding: '4px 10px', borderRadius: 6, border: `1.5px solid ${pageSize === n ? '#067A46' : '#E4E4E4'}`,
              background: pageSize === n ? '#F6FDE9' : '#fff', color: pageSize === n ? '#067A46' : '#4B4B4B',
              font: '600 12px/16px var(--font-body)', cursor: 'pointer',
            }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: '400 12px/16px var(--font-body)', color: '#676767' }}>
            {sorted.length === 0 ? '0 rows' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
          </span>
          <button onClick={() => setPage(1)}          disabled={safePage === 1}          style={btnStyle(safePage > 1)}>«</button>
          <button onClick={() => setPage(p => p - 1)} disabled={safePage === 1}          style={btnStyle(safePage > 1)}>‹</button>
          <span style={{ font: '600 12px/16px var(--font-body)', color: '#242424', minWidth: 60, textAlign: 'center' }}>{safePage} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={safePage === totalPages} style={btnStyle(safePage < totalPages)}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={btnStyle(safePage < totalPages)}>»</button>
        </div>
      </div>
    </div>
  );
}

// ── Filter dropdown ───────────────────────────────────────────────────────────
function FilterSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const active = value !== 'All';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <label style={{ font: '500 11px/14px var(--font-body)', color: '#676767', letterSpacing: '.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: '7px 28px 7px 10px', borderRadius: 7, border: `1.5px solid ${active ? '#067A46' : '#E4E4E4'}`,
        background: active ? '#F6FDE9' : '#fff', color: active ? '#067A46' : '#242424',
        font: `${active ? 600 : 400} 13px/18px var(--font-body)`, cursor: 'pointer', outline: 'none',
        appearance: 'none', WebkitAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23676767' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
        minWidth: 110, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {options.map(opt => <option key={opt} value={opt}>{opt === 'All' ? `All ${label}s` : opt}</option>)}
      </select>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
type ChatMessage = { role: 'user' | 'assistant'; text: string };

export default function SpendDashboard() {
  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterCategory,        setFilterCategory]        = useState<string>('All');
  const [filterMarket,          setFilterMarket]          = useState<string>('All');
  const [filterStatus,          setFilterStatus]          = useState<'All' | 'Historical' | 'Forecast'>('All');
  const [filterCategoryManager, setFilterCategoryManager] = useState<string>('All');
  const [search,                setSearch]                = useState('');

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // ── Feature State ─────────────────────────────────────────────────────────────
  const [presenterMode,    setPresenterMode]    = useState(false);
  const [showBrief,        setShowBrief]        = useState(false);
  const [brief,            setBrief]            = useState('');
  const [briefLoading,     setBriefLoading]     = useState(false);
  const [anomalyDismissed, setAnomalyDismissed] = useState(true);
  const [showYoY,          setShowYoY]          = useState(false);

  // ── Filtered Data ─────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROWS.filter(r => {
      if (filterCategory        !== 'All' && r.category        !== filterCategory)        return false;
      if (filterMarket          !== 'All' && r.market          !== filterMarket)          return false;
      if (filterStatus          !== 'All' && r.actualsStatus   !== filterStatus)          return false;
      if (filterCategoryManager !== 'All' && r.categoryManager !== filterCategoryManager) return false;
      if (!q) return true;
      return (
        r.supplier.toLowerCase().includes(q)         ||
        r.skuName.toLowerCase().includes(q)          ||
        r.skuCode.toLowerCase().includes(q)          ||
        r.globalIngredient.toLowerCase().includes(q) ||
        r.contractWeek.toLowerCase().includes(q)     ||
        r.market.toLowerCase().includes(q)           ||
        r.category.toLowerCase().includes(q)         ||
        r.budgetRisk.toLowerCase().includes(q)       ||
        r.categoryManager.toLowerCase().includes(q)
      );
    });
  }, [filterCategory, filterMarket, filterStatus, filterCategoryManager, search]);

  const metrics       = useMemo(() => computeMetrics(filteredRows),      [filteredRows]);
  const supplierSplit = useMemo(() => computeSupplierSplit(filteredRows), [filteredRows]);
  const weeklyRaw     = useMemo(() => computeWeeklyChart(filteredRows),  [filteredRows]);
  const chartData     = useMemo(() => weeklyRaw.filter(w => w.total > 0 || w.isForecast), [weeklyRaw]);

  // ── YoY Synthetic Overlay ─────────────────────────────────────────────────────
  const chartDataWithExtras = useMemo(() => chartData.map((w, i) => ({
    ...w,
    yoyTotal: showYoY ? Math.round((w.total as number) * (0.73 + Math.sin(i * 0.35) * 0.09)) : undefined,
  })), [chartData, showYoY]);

  // ── Anomaly Detection ─────────────────────────────────────────────────────────
  const anomalies = useMemo(() => {
    const issues: { message: string; severity: 'high' | 'medium' }[] = [];
    const supMap = new Map<string, { actualEur: number; awardedEur: number; cm: string }>();
    filteredRows.forEach(r => {
      if (!supMap.has(r.supplier)) supMap.set(r.supplier, { actualEur: 0, awardedEur: 0, cm: r.categoryManager });
      const e = supMap.get(r.supplier)!;
      e.actualEur  = Math.max(e.actualEur,  r.cumulativeActualSpendEur);
      e.awardedEur = Math.max(e.awardedEur, r.cumulativeAwardedSpendEur);
    });
    supMap.forEach((v, supplier) => {
      if (v.awardedEur === 0) return;
      const util = Math.round(v.actualEur / v.awardedEur * 100);
      if (util >= 90)
        issues.push({ message: `${supplier} — ${util}% utilisation, approaching contract ceiling (CM: ${v.cm})`, severity: 'high' });
      else if (util >= 80)
        issues.push({ message: `${supplier} — ${util}% utilisation, at risk of budget exhaustion (CM: ${v.cm})`, severity: 'medium' });
    });
    const highRiskCount = filteredRows.filter(r => r.budgetRisk === 'High').length;
    if (highRiskCount > 3)
      issues.push({ message: `${highRiskCount} contract lines flagged High budget risk — escalation recommended`, severity: 'medium' });
    return issues;
  }, [filteredRows]);

  // ── Brush Range ───────────────────────────────────────────────────────────────
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
  const prevChartLen = React.useRef(chartData.length);
  React.useEffect(() => {
    if (prevChartLen.current !== chartData.length) {
      setBrushRange(null);
      prevChartLen.current = chartData.length;
    }
  }, [chartData.length]);

  const WEEK_PRESETS = [
    { label: '4W',  weeks: 4 },
    { label: '8W',  weeks: 8 },
    { label: '13W', weeks: 13 },
    { label: 'All', weeks: null },
  ];

  function applyWeekPreset(weeks: number | null) {
    if (weeks === null || chartData.length === 0) { setBrushRange(null); }
    else { const end = chartData.length - 1; setBrushRange({ startIndex: Math.max(0, end - weeks + 1), endIndex: end }); }
  }

  const activeBrushPreset = React.useMemo(() => {
    if (!brushRange) return 'All';
    const span = brushRange.endIndex - brushRange.startIndex + 1;
    const match = WEEK_PRESETS.find(p => p.weeks === span && brushRange.endIndex === chartData.length - 1);
    return match ? match.label : null;
  }, [brushRange, chartData.length]);

  const chartSuppliers = useMemo(() => supplierSplit.slice(0, 8).map(s => s.supplier), [supplierSplit]);

  const hasFilters = filterCategory !== 'All' || filterMarket !== 'All' || filterStatus !== 'All' || filterCategoryManager !== 'All' || search !== '';

  const contextLabel = [
    filterCategory !== 'All' ? filterCategory : 'All Categories',
    filterMarket   !== 'All' ? filterMarket   : 'All Markets',
  ].join(' · ');

  // ── Smart Filter Presets ──────────────────────────────────────────────────────
  const SMART_PRESETS = [
    { label: '⚠ At Risk',  apply: () => { setFilterCategory('All'); setFilterMarket('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); setAnomalyDismissed(false); } },
    { label: 'Bakery',     apply: () => { setFilterCategory('Bakery');  setFilterMarket('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); } },
    { label: 'Grocery',    apply: () => { setFilterCategory('Grocery'); setFilterMarket('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); } },
    { label: 'Protein',    apply: () => { setFilterCategory('Protein'); setFilterMarket('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); } },
    { label: 'DACH',       apply: () => { setFilterMarket('DACH');   setFilterCategory('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); } },
    { label: 'US',         apply: () => { setFilterMarket('US');     setFilterCategory('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); } },
    { label: 'DKSE',       apply: () => { setFilterMarket('DKSE');   setFilterCategory('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); } },
  ];

  const isPresetActive = (label: string) => {
    if (label === 'Bakery')     return filterCategory === 'Bakery'  && filterMarket === 'All' && filterStatus === 'All';
    if (label === 'Grocery')    return filterCategory === 'Grocery' && filterMarket === 'All' && filterStatus === 'All';
    if (label === 'Protein')    return filterCategory === 'Protein' && filterMarket === 'All' && filterStatus === 'All';
    if (label === 'DACH')       return filterMarket === 'DACH';
    if (label === 'US')         return filterMarket === 'US';
    if (label === 'DKSE')       return filterMarket === 'DKSE';
    return false;
  };

  // ── AI Context Builder ────────────────────────────────────────────────────────
  const buildContext = useCallback(() => {
    const lines: string[] = [];
    lines.push(`## Current Dashboard View`);
    lines.push(`Filters: Category=${filterCategory}, Market=${filterMarket}, Status=${filterStatus}, Category Manager=${filterCategoryManager}`);
    lines.push('');
    lines.push(`## Key Metrics`);
    lines.push(`- Total Actual Spend: €${metrics.totalActualSpendEur.toLocaleString('de-DE')}`);
    lines.push(`- Total Awarded Budget: €${metrics.totalAwardedSpendEur.toLocaleString('de-DE')}`);
    lines.push(`- Budget Utilisation: ${metrics.budgetUtilizationPct}%`);
    lines.push(`- Suppliers at risk (≥80% utilisation): ${metrics.atRiskSuppliers}`);
    lines.push(`- Total Suppliers: ${metrics.supplierCount}`);
    lines.push('');
    const supMap = new Map<string, { category: string; market: string; categoryManager: string; actualEur: number; awardedEur: number }>();
    filteredRows.forEach(r => {
      if (!supMap.has(r.supplier)) supMap.set(r.supplier, { category: r.category, market: r.market, categoryManager: r.categoryManager, actualEur: 0, awardedEur: 0 });
      const e = supMap.get(r.supplier)!;
      e.actualEur  = Math.max(e.actualEur,  r.cumulativeActualSpendEur);
      e.awardedEur = Math.max(e.awardedEur, r.cumulativeAwardedSpendEur);
    });
    lines.push(`## All Suppliers in Current View (${supMap.size} total)`);
    lines.push(`Supplier | Category | Market | Category Manager | Actual Spend | Awarded Budget | Utilisation %`);
    supMap.forEach((v, supplier) => {
      const util = v.awardedEur > 0 ? Math.round(v.actualEur / v.awardedEur * 100) : 0;
      lines.push(`${supplier} | ${v.category} | ${v.market} | ${v.categoryManager} | €${v.actualEur.toLocaleString('de-DE')} | €${v.awardedEur.toLocaleString('de-DE')} | ${util}%${util >= 80 ? ' ⚠ AT RISK' : ''}`);
    });
    return lines.join('\n');
  }, [filterCategory, filterMarket, filterStatus, filterCategoryManager, filteredRows, metrics]);

  // Auto-scroll chat
  React.useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  // ── Chat helpers ──────────────────────────────────────────────────────────────
  async function sendMessageWith(question: string) {
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: buildContext() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMessage() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    await sendMessageWith(q);
  }

  // ── Conversational Drill-Down ─────────────────────────────────────────────────
  function drilldownSupplier(supplier: string) {
    const q = `Analyse ${supplier} in detail: current spend vs awarded budget, utilisation %, risk level, trend, and what the responsible category manager should do next.`;
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatOpen(true);
    sendMessageWith(q);
  }

  // ── Executive Brief ───────────────────────────────────────────────────────────
  async function generateBrief() {
    setBriefLoading(true);
    setShowBrief(true);
    setBrief('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Generate a concise executive briefing with these sections: (1) Headline Numbers — total spend vs budget with %; (2) At-Risk Suppliers — list each with utilisation % and responsible CM; (3) Category Summary — performance by category; (4) Key Trends; (5) Recommended Actions — exactly 3 bullet points. Use bold for numbers. Be specific with €EUR figures.',
          context: buildContext(),
        }),
      });
      const data = await res.json();
      setBrief(data.answer || 'Failed to generate brief.');
    } catch {
      setBrief('Error generating brief. Please try again.');
    } finally {
      setBriefLoading(false);
    }
  }

  const savingsEur = metrics.totalAwardedSpendEur - metrics.totalActualSpendEur;

  // ── Presenter Mode: dark background ──────────────────────────────────────────
  const pm = presenterMode;

  return (
    <div style={{ background: pm ? '#0F172A' : '#F8F8F8', minHeight: '100vh', transition: 'background 300ms' }}>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <header style={{ background: pm ? '#1E293B' : '#fff', borderBottom: `1px solid ${pm ? '#334155' : '#EEE'}`, padding: '22px 32px' }}>
        <div style={{ font: '400 12px/16px var(--font-body)', color: pm ? '#94A3B8' : '#676767', marginBottom: 6, display: 'flex', gap: 6 }}>
          <span>Strategic Procurement</span><span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: pm ? '#E2E8F0' : '#242424' }}>Spend Analysis</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ font: '500 30px/38px var(--font-display)', color: pm ? '#F1F5F9' : '#242424', margin: 0 }}>Spend Analysis</h1>
            <div style={{ font: '400 13px/18px var(--font-body)', color: pm ? '#94A3B8' : '#676767', marginTop: 4, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Contract period: Jun 2025 – Jun 2026</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />
              <span>{contextLabel}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />
              <span>{metrics.supplierCount} supplier{metrics.supplierCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {anomalies.length > 0 && (
              <button onClick={() => setAnomalyDismissed(false)} style={{ padding: '6px 12px', background: '#FEF2F2', color: '#B30000', borderRadius: 6, font: '600 12px/16px var(--font-body)', border: '1px solid #FECACA', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ⚠ {anomalies.length} Alert{anomalies.length !== 1 ? 's' : ''}
              </button>
            )}
            <button onClick={generateBrief} style={{ padding: '6px 14px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, font: '600 12px/16px var(--font-body)', border: '1px solid #BFDBFE', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📋 Executive Brief
            </button>
            <button onClick={() => setPresenterMode(m => !m)} style={{ padding: '6px 14px', borderRadius: 6, font: '600 12px/16px var(--font-body)', border: `1px solid ${pm ? '#7C3AED' : '#E4E4E4'}`, cursor: 'pointer', whiteSpace: 'nowrap', background: pm ? '#6D28D9' : '#fff', color: pm ? '#fff' : '#4B4B4B' }}>
              {pm ? '✕ Exit Presenter' : '🎯 Presenter Mode'}
            </button>
            <span style={{ padding: '6px 12px', background: '#F6FDE9', color: '#067A46', borderRadius: 6, font: '600 12px/16px var(--font-body)', border: '1px solid #D2F895', whiteSpace: 'nowrap' }}>
              ● Live data
            </span>
          </div>
        </div>
      </header>

      <div style={{ padding: pm ? '20px 40px' : '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Anomaly Watchtower Banner ──────────────────────────────────── */}
        {anomalies.length > 0 && !anomalyDismissed && (
          <div style={{
            background: anomalies.some(a => a.severity === 'high') ? '#FEF2F2' : '#FFFBEB',
            border: `1px solid ${anomalies.some(a => a.severity === 'high') ? '#FECACA' : '#FDE68A'}`,
            borderRadius: 10, padding: '12px 18px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 13px/18px var(--font-body)', color: anomalies.some(a => a.severity === 'high') ? '#B30000' : '#92400E', marginBottom: 4 }}>
                Anomaly Watchtower — {anomalies.length} issue{anomalies.length !== 1 ? 's' : ''} detected
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                {anomalies.map((a, i) => (
                  <li key={i} style={{ font: '400 12px/18px var(--font-body)', color: a.severity === 'high' ? '#B30000' : '#92400E', marginBottom: 2 }}>{a.message}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setAnomalyDismissed(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, flexShrink: 0, padding: 2, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* ── Smart Filter Chips ─────────────────────────────────────────── */}
        {!pm && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ font: '500 11px/14px var(--font-body)', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>Quick:</span>
            {SMART_PRESETS.map(p => {
              const active = isPresetActive(p.label);
              return (
                <button key={p.label} onClick={p.apply} style={{
                  padding: '4px 12px', borderRadius: 20, font: '500 12px/18px var(--font-body)',
                  border: `1px solid ${active ? '#067A46' : '#E0E0E0'}`,
                  background: active ? '#067A46' : '#fff', color: active ? '#fff' : '#4B4B4B',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 120ms',
                }}>{p.label}</button>
              );
            })}
          </div>
        )}

        {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
        {!pm && (
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', border: '1px solid #E4E4E4', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ font: '500 11px/14px var(--font-body)', color: '#676767', letterSpacing: '.03em', textTransform: 'uppercase' }}>Search</label>
              <div style={{ position: 'relative' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="6.5" cy="6.5" r="4" stroke="#9CA3AF" strokeWidth="1.5"/>
                  <path d="M10 10l3 3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Supplier, SKU, ingredient, week…" style={{
                  width: '100%', boxSizing: 'border-box', padding: '7px 30px 7px 30px',
                  borderRadius: 7, border: `1.5px solid ${search ? '#067A46' : '#E4E4E4'}`,
                  font: '400 13px/18px var(--font-body)', color: '#242424', outline: 'none', background: '#fff',
                }} />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', fontSize: 14, lineHeight: 1 }}>✕</button>
                )}
              </div>
            </div>
            <FilterSelect label="Category"     options={['All', ...CATEGORIES]}            value={filterCategory}        onChange={setFilterCategory} />
            <FilterSelect label="Market"       options={['All', ...MARKETS]}               value={filterMarket}          onChange={setFilterMarket} />
            <FilterSelect label="Status"       options={['All', 'Historical', 'Forecast']} value={filterStatus}          onChange={v => setFilterStatus(v as 'All' | 'Historical' | 'Forecast')} />
            <FilterSelect label="Cat. Manager" options={['All', ...CATEGORY_MANAGERS]}     value={filterCategoryManager} onChange={setFilterCategoryManager} />
            {hasFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label style={{ font: '500 11px/14px var(--font-body)', color: 'transparent', letterSpacing: '.03em' }}>x</label>
                <button onClick={() => { setFilterCategory('All'); setFilterMarket('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); }} style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid #E4E4E4', background: '#fff', color: '#676767', font: '400 13px/18px var(--font-body)', cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ Clear</button>
              </div>
            )}
          </div>
        )}

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard label="Total Actual Spend"  value={fmtFull(metrics.totalActualSpendEur)}  sub={`${metrics.budgetUtilizationPct}% of awarded budget`} tone="neutral" />
          <KpiCard label="Awarded Budget"       value={fmtFull(metrics.totalAwardedSpendEur)} sub={`Remaining: ${fmtFull(Math.max(0, savingsEur))}`} tone="neutral" />
          <KpiCard
            label="Savings vs Budget"
            value={savingsEur >= 0 ? `+${fmtFull(savingsEur)}` : fmtFull(savingsEur)}
            sub={savingsEur >= 0 ? 'Under budget — potential saving' : 'Over budget — action needed'}
            tone={savingsEur >= 0 ? 'positive' : 'danger'}
          />
          <KpiCard label="Budget Utilization"  value={`${metrics.budgetUtilizationPct}%`}   sub="Actual vs contracted spend" tone={metrics.budgetUtilizationPct >= 90 ? 'danger' : metrics.budgetUtilizationPct >= 75 ? 'warning' : 'neutral'} />
          <KpiCard label="Avg Adherence"        value={`${metrics.avgAdherencePct}%`}         sub="Actual vs awarded volume"  tone={metrics.avgAdherencePct >= 80 ? 'positive' : 'warning'} />
          <KpiCard
            label="At-Risk Contracts"
            value={String(metrics.atRiskSuppliers)}
            sub="Supplier(s) ≥ 80% utilization"
            tone={metrics.atRiskSuppliers > 0 ? (metrics.atRiskSuppliers >= 3 ? 'danger' : 'warning') : 'positive'}
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: pm ? '1fr 420px' : '1fr 360px', gap: 16 }}>

          {/* Weekly Spend Chart */}
          <div style={{ background: pm ? '#1E293B' : '#fff', borderRadius: 10, padding: '20px 24px', border: `1px solid ${pm ? '#334155' : '#E4E4E4'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ font: '600 15px/20px var(--font-body)', color: pm ? '#F1F5F9' : '#242424' }}>Weekly Spend (EUR)</div>
                <div style={{ font: '400 12px/16px var(--font-body)', color: pm ? '#94A3B8' : '#676767', marginTop: 2 }}>
                  Actual spend per period by supplier · {chartSuppliers.length < supplierSplit.length ? `Top ${chartSuppliers.length} of ${supplierSplit.length} suppliers` : `${chartSuppliers.length} supplier${chartSuppliers.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* YoY toggle */}
                <button onClick={() => setShowYoY(y => !y)} style={{
                  padding: '3px 10px', borderRadius: 5, border: `1px solid ${showYoY ? '#7C3AED' : '#D4D4D4'}`,
                  background: showYoY ? '#EDE9FE' : '#fff', color: showYoY ? '#7C3AED' : '#555',
                  font: '500 11px/18px var(--font-body)', cursor: 'pointer', transition: 'all 120ms',
                }}>📊 YoY</button>
                {chartData.length > 0 && WEEK_PRESETS.map(p => {
                  const isActive = activeBrushPreset === p.label;
                  return (
                    <button key={p.label} onClick={() => applyWeekPreset(p.weeks)} style={{
                      padding: '3px 9px', borderRadius: 5, border: `1px solid ${isActive ? '#067A46' : '#D4D4D4'}`,
                      background: isActive ? '#067A46' : '#fff', color: isActive ? '#fff' : '#555',
                      font: '500 11px/18px var(--font-body)', cursor: 'pointer', transition: 'all 120ms',
                    }}>{p.label}</button>
                  );
                })}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={pm ? 400 : 300}>
                <ComposedChart data={chartDataWithExtras} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barSize={14} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={pm ? '#334155' : '#F0F0F0'} vertical={false} />
                  <XAxis dataKey="weekLabel" tick={<AngledTick />} tickLine={{ stroke: '#E0E0E0', strokeWidth: 1 }} axisLine={false} interval={Math.max(0, Math.ceil(chartData.length / 16) - 1)} height={42} />
                  <YAxis tick={{ fontSize: 11, fill: pm ? '#94A3B8' : '#676767' }} tickLine={false} axisLine={false} tickFormatter={v => v === 0 ? '' : fmt(v)} width={52} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6,122,70,.04)' }} />
                  <Legend formatter={v => v} wrapperStyle={{ font: '400 11px var(--font-body)', paddingTop: 8 }} />
                  {chartSuppliers.map((sup, idx) => {
                    const color = SUPPLIER_COLOR[sup] ?? '#BBB';
                    const isLast = idx === chartSuppliers.length - 1;
                    return (
                      <Bar key={sup} dataKey={supplierKey(sup)} stackId="a" fill={color} name={sup} radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}>
                        {chartDataWithExtras.map((entry, j) => <Cell key={j} fill={entry.isForecast ? '#C8C8C8' : color} />)}
                      </Bar>
                    );
                  })}
                  {showYoY && (
                    <Line dataKey="yoyTotal" name="Prior Year (est.)" type="monotone" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 3" dot={false} legendType="line" />
                  )}
                  <Brush dataKey="weekLabel" height={22} stroke="#D4D4D4" fill="#F8F8F8" travellerWidth={6}
                    startIndex={brushRange?.startIndex ?? 0}
                    endIndex={brushRange?.endIndex ?? (chartData.length - 1)}
                    onChange={(range) => {
                      if (range && typeof range.startIndex === 'number' && typeof range.endIndex === 'number') {
                        setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                      }
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BBB', font: '400 14px/20px var(--font-body)' }}>No spend data for selected filters</div>
            )}
          </div>

          {/* Supplier Split — clickable for drill-down */}
          <div style={{ background: pm ? '#1E293B' : '#fff', borderRadius: 10, padding: '20px 24px', border: `1px solid ${pm ? '#334155' : '#E4E4E4'}`, overflowY: 'auto', maxHeight: pm ? 480 : 380 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: '600 15px/20px var(--font-body)', color: pm ? '#F1F5F9' : '#242424' }}>Supplier Split</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: pm ? '#94A3B8' : '#676767', marginTop: 2 }}>
                By actual spend · click any supplier to AI drill-down
              </div>
            </div>
            {supplierSplit.length > 0 ? supplierSplit.map(s => (
              <SupplierBar key={s.supplier} supplier={s.supplier} actual={s.actualEur} awarded={s.awardedEur}
                pct={s.pct} color={SUPPLIER_COLOR[s.supplier] ?? '#BBB'} onClick={() => drilldownSupplier(s.supplier)} />
            )) : (
              <div style={{ color: '#BBB', font: '400 13px/18px var(--font-body)', textAlign: 'center', padding: '32px 0' }}>No data</div>
            )}
            {supplierSplit.length > 0 && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: pm ? '#0F172A' : '#F8F8F8', borderRadius: 8, borderLeft: `4px solid ${metrics.atRiskSuppliers > 0 ? '#DC2626' : '#067A46'}` }}>
                <div style={{ font: '600 12px/16px var(--font-body)', color: pm ? '#F1F5F9' : '#242424', marginBottom: 3 }}>Spend vs Budget</div>
                <div style={{ font: '400 12px/16px var(--font-body)', color: pm ? '#94A3B8' : '#676767' }}>
                  {fmtFull(metrics.totalActualSpendEur)} of {fmtFull(metrics.totalAwardedSpendEur)}.{' '}
                  Utilization <strong style={{ color: metrics.budgetUtilizationPct >= 90 ? '#B30000' : metrics.budgetUtilizationPct >= 75 ? '#A43700' : '#067A46' }}>{metrics.budgetUtilizationPct}%</strong>.
                  {metrics.atRiskSuppliers > 0 && <span style={{ color: '#B30000', fontWeight: 600 }}> {metrics.atRiskSuppliers} supplier{metrics.atRiskSuppliers !== 1 ? 's' : ''} at risk.</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Data Table — hidden in presenter mode ──────────────────────── */}
        {!pm && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E4E4' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEE' }}>
              <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Contract Detail</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
                {filteredRows.length} of {ROWS.length} rows · Click column header to sort · 25 / 50 / 100 per page
              </div>
            </div>
            <DataTable rows={filteredRows} />
          </div>
        )}

        {/* Footer */}
        <div style={{ font: '400 11px/16px var(--font-body)', color: pm ? '#475569' : '#BBB', textAlign: 'center', paddingBottom: 8 }}>
          HelloFresh Category Management · Data as of 2026-W19 · Confidential
        </div>
      </div>

      {/* ── Executive Brief Panel ──────────────────────────────────────── */}
      {showBrief && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1100,
          width: 480, background: '#fff', borderLeft: '1px solid #E4E4E4',
          boxShadow: '-8px 0 32px rgba(0,0,0,.1)', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #EEE', background: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 14px/18px var(--font-body)', color: '#fff' }}>Executive Brief</div>
              <div style={{ font: '400 11px/14px var(--font-body)', color: 'rgba(255,255,255,.7)' }}>
                {contextLabel} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <button onClick={() => setShowBrief(false)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'rgba(255,255,255,.8)', fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {briefLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 40 }}>
                <div style={{ font: '400 13px/20px var(--font-body)', color: '#888', textAlign: 'center', marginBottom: 16 }}>Generating brief…</div>
                {[80, 70, 90, 65, 75].map((w, i) => (
                  <div key={i} style={{ width: `${w}%`, height: 14, background: '#F0F0F0', borderRadius: 6 }} />
                ))}
              </div>
            ) : (
              <ReactMarkdown components={{
                h2:     ({ children }) => <h2 style={{ font: '600 16px/22px var(--font-display)', color: '#1D4ED8', borderBottom: '2px solid #DBEAFE', paddingBottom: 8, marginBottom: 12, marginTop: 24 }}>{children}</h2>,
                h3:     ({ children }) => <h3 style={{ font: '600 14px/20px var(--font-body)', color: '#242424', marginBottom: 8, marginTop: 16 }}>{children}</h3>,
                p:      ({ children }) => <p style={{ margin: '0 0 10px', font: '400 13px/20px var(--font-body)', color: '#374151' }}>{children}</p>,
                ul:     ({ children }) => <ul style={{ margin: '4px 0 12px', paddingLeft: 20 }}>{children}</ul>,
                ol:     ({ children }) => <ol style={{ margin: '4px 0 12px', paddingLeft: 20 }}>{children}</ol>,
                li:     ({ children }) => <li style={{ font: '400 13px/20px var(--font-body)', color: '#374151', marginBottom: 4 }}>{children}</li>,
                strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#1D4ED8' }}>{children}</strong>,
              }}>
                {brief}
              </ReactMarkdown>
            )}
          </div>
          <div style={{ padding: '14px 20px', borderTop: '1px solid #EEE', display: 'flex', gap: 10 }}>
            <button onClick={generateBrief} disabled={briefLoading} style={{ flex: 1, padding: '9px 14px', background: briefLoading ? '#93C5FD' : '#1D4ED8', color: '#fff', borderRadius: 8, border: 'none', font: '600 13px/18px var(--font-body)', cursor: briefLoading ? 'default' : 'pointer' }}>
              ↺ Regenerate
            </button>
            <button onClick={() => setShowBrief(false)} style={{ padding: '9px 16px', background: '#F4F4F4', color: '#4B4B4B', borderRadius: 8, border: 'none', font: '600 13px/18px var(--font-body)', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── AI Chat Button ──────────────────────────────────────────────── */}
      <button onClick={() => setChatOpen(o => !o)} title="Ask AI about this data" style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
        width: 52, height: 52, borderRadius: '50%', background: '#067A46', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(6,122,70,.35)', transition: 'transform 150ms, box-shadow 150ms',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        {chatOpen ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3l12 12M15 3L3 15" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.953 9.953 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="white"/>
            <path d="M8 11h8M8 15h5" stroke="#067A46" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        {chatMessages.length > 0 && !chatOpen && (
          <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#96DC14', border: '2px solid white' }} />
        )}
      </button>

      {/* ── AI Chat Panel ──────────────────────────────────────────────── */}
      {chatOpen && (
        <div style={{
          position: 'fixed', bottom: 92, right: 28, zIndex: 999,
          width: 380, height: 520, borderRadius: 16,
          background: '#fff', border: '1px solid #E4E4E4',
          boxShadow: '0 8px 32px rgba(0,0,0,.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ background: '#067A46', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.953 9.953 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
            </div>
            <div>
              <div style={{ font: '600 14px/18px var(--font-body)', color: '#fff' }}>Ask about this data</div>
              <div style={{ font: '400 11px/14px var(--font-body)', color: 'rgba(255,255,255,.7)' }}>
                {filterCategory !== 'All' || filterMarket !== 'All' ? contextLabel : 'All categories · All markets'}
              </div>
            </div>
            {chatMessages.length > 0 && (
              <button onClick={() => setChatMessages([])} style={{ marginLeft: 'auto', background: 'transparent', border: 0, cursor: 'pointer', color: 'rgba(255,255,255,.6)', font: '400 11px var(--font-body)', padding: '4px 8px', borderRadius: 6 }}>Clear</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chatMessages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '0 8px' }}>
                <div style={{ font: '400 13px/20px var(--font-body)', color: '#888', textAlign: 'center' }}>Ask anything about the spend data on screen, or click any supplier to drill down.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  {['Which supplier is most over budget?', 'How many suppliers are at risk?', 'What is the spend split across markets?'].map(s => (
                    <button key={s} onClick={() => setChatInput(s)} style={{ background: '#F4FAF6', border: '1px solid #C8E6D4', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left', font: '400 12px/18px var(--font-body)', color: '#067A46' }}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? '#067A46' : '#F4F4F4',
                    color: msg.role === 'user' ? '#fff' : '#242424',
                    font: '400 13px/20px var(--font-body)',
                  }}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown components={{
                        p:      ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
                        ul:     ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ul>,
                        ol:     ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ol>,
                        li:     ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                        strong: ({ children }) => <strong style={{ fontWeight: 600, color: '#067A46' }}>{children}</strong>,
                        code:   ({ children }) => <code style={{ background: '#E8E8E8', padding: '1px 4px', borderRadius: 3, fontSize: 12 }}>{children}</code>,
                      }}>{msg.text}</ReactMarkdown>
                    ) : msg.text}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (chatMessages.length === 0 || chatMessages[chatMessages.length - 1].role === 'user') && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: '#F4F4F4' }}>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />)}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '12px 14px', borderTop: '1px solid #EEE', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about spend, suppliers, risk…" rows={1}
              style={{ flex: 1, resize: 'none', border: '1px solid #DDD', borderRadius: 10, padding: '9px 12px', font: '400 13px/20px var(--font-body)', color: '#242424', outline: 'none', background: '#FAFAFA', maxHeight: 100, overflowY: 'auto' }}
            />
            <button onClick={sendMessage} disabled={!chatInput.trim() || chatLoading} style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: chatInput.trim() && !chatLoading ? '#067A46' : '#E0E0E0',
              border: 'none', cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M9 3l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
