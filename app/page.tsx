"use client";
import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
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
function SupplierBar({ supplier, actual, awarded, pct, color }: {
  supplier: string; actual: number; awarded: number; pct: number; color: string;
}) {
  const utilPct = awarded > 0 ? Math.round(actual / awarded * 100) : 0;
  const isAtRisk = utilPct >= 80;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ font: '600 13px/18px var(--font-body)', color: '#242424' }}>{supplier}</span>
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
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const visible = (payload ?? []).filter(p => (p.value ?? 0) > 0);
  const total = visible.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{
      background: '#fff', border: '1px solid #E4E4E4', borderRadius: 8,
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.12)',
      font: '400 13px/18px var(--font-body)', minWidth: 200,
    }}>
      <div style={{ font: '600 13px/18px var(--font-body)', color: '#242424', marginBottom: 8 }}>{label}</div>
      {visible.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#4B4B4B', marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </span>
          <span style={{ fontWeight: 600 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
      {visible.length > 1 && (
        <div style={{ borderTop: '1px solid #EEE', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#242424' }}>
          <span>Total</span><span>{fmtFull(total)}</span>
        </div>
      )}
    </div>
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
    <span
      onMouseEnter={handleEnter}
      onMouseLeave={() => setPos(null)}
      onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, cursor: 'default' }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" stroke="#676767" strokeWidth="1.5"/>
        <path d="M8 7v5M8 5v.5" stroke="#676767" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {pos && (
        <span style={{
          position: 'fixed',
          left: pos.x, top: pos.y,
          transform: 'translate(-50%, -100%)',
          background: '#242424', color: '#fff',
          font: '400 12px/16px var(--font-body)', padding: '6px 10px',
          borderRadius: 6, whiteSpace: 'nowrap', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,.25)',
          pointerEvents: 'none',
          maxWidth: 280,
          textAlign: 'left' as const,
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
  { key: 'contractWeek',             label: 'Week',            tip: 'ISO contract week (e.g. 2025-W32)',                                    w: 90  },
  { key: 'category',                 label: 'Category',        tip: 'Product category: Bakery, Grocery or Protein',                         w: 90  },
  { key: 'market',                   label: 'Market',          tip: 'Geographic market (DACH, US, DKSE, BENELUX)',                           w: 80  },
  { key: 'supplier',                 label: 'Supplier',        tip: 'Contracted supplier for this SKU',                                     w: 200 },
  { key: 'categoryManager',          label: 'Cat. Manager',    tip: 'EU/UK category manager responsible for this SKU',                      w: 200 },
  { key: 'actualsStatus',            label: 'Status',          tip: 'Historical = confirmed actuals; Forecast = projected spend',           w: 100 },
  { key: 'adherencePct',             label: 'Adherence %',     tip: 'Actual volume delivered vs contracted volume (%)',                     w: 100 },
  { key: 'weeklyActualQty',          label: 'Period Qty',      tip: 'Units delivered in this period',                                       w: 100 },
  { key: 'cumulativeActualSpendEur', label: 'Spend to Date',   tip: 'Total actual spend accumulated from contract start to this week (€)',  w: 130 },
  { key: 'cumulativeAwardedSpendEur',label: 'Awarded Budget',  tip: 'Total contracted/awarded budget accumulated to this week (€)',         w: 130 },
  { key: 'spendDiffPct',             label: 'vs Budget %',     tip: 'Variance: actual spend vs awarded budget (negative = under-spending)', w: 100 },
  { key: 'budgetRisk',               label: 'Risk',            tip: 'Budget exhaustion risk: High (≥ −10%), Medium (≥ −40%), Low (< −40%)', w: 80  },
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
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: catStyle.bg, color: catStyle.color }}>
                    {row.category}
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: mktStyle.bg, color: mktStyle.color }}>
                    {row.market}
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: SUPPLIER_COLOR[row.supplier] ?? '#BBB', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ color: '#242424', fontWeight: 500 }}>{row.supplier}</span>
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: '#4B4B4B', font: '400 12px/18px var(--font-body)', whiteSpace: 'nowrap' }}>
                  {row.categoryManager}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: isForecast ? '#E9FAFF' : '#F6FDE9', color: isForecast ? '#001DB2' : '#067A46' }}>
                    {row.actualsStatus}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: row.adherencePct === 0 ? '#BBB' : '#242424', fontFamily: 'var(--font-mono)' }}>
                  {row.adherencePct > 0 ? `${row.adherencePct}%` : '—'}
                </td>
                <td style={{ padding: '9px 12px', color: row.weeklyActualQty === 0 ? '#BBB' : '#242424', fontFamily: 'var(--font-mono)' }}>
                  {row.weeklyActualQty > 0 ? row.weeklyActualQty.toLocaleString() : '—'}
                </td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: '#242424' }}>{fmtFull(row.cumulativeActualSpendEur)}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: '#676767' }}>{fmtFull(row.cumulativeAwardedSpendEur)}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: diffColor, fontWeight: 600 }}>
                  {row.spendDiffPct > 0 ? '+' : ''}{row.spendDiffPct}%
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, font: '600 11px/16px var(--font-body)', background: row.budgetRisk === 'High' ? '#FEE2E2' : row.budgetRisk === 'Medium' ? '#FEF3C7' : '#F6FDE9', color: row.budgetRisk === 'High' ? '#B30000' : row.budgetRisk === 'Medium' ? '#92400E' : '#067A46' }}>
                    {row.budgetRisk}
                  </span>
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

    {/* Pagination footer */}
    <div style={{
      padding: '12px 20px', borderTop: '1px solid #EEE',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ font: '400 12px/16px var(--font-body)', color: '#676767' }}>Rows per page:</span>
        {PAGE_SIZE_OPTIONS.map(n => (
          <button key={n} onClick={() => { setPageSize(n); setPage(1); }} style={{
            padding: '4px 10px', borderRadius: 6,
            border: `1.5px solid ${pageSize === n ? '#067A46' : '#E4E4E4'}`,
            background: pageSize === n ? '#F6FDE9' : '#fff',
            color: pageSize === n ? '#067A46' : '#4B4B4B',
            font: '600 12px/16px var(--font-body)', cursor: 'pointer',
          }}>{n}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ font: '400 12px/16px var(--font-body)', color: '#676767' }}>
          {sorted.length === 0 ? '0 rows' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
        </span>
        <button onClick={() => setPage(1)}        disabled={safePage === 1}          style={btnStyle(safePage > 1)}>«</button>
        <button onClick={() => setPage(p => p - 1)} disabled={safePage === 1}        style={btnStyle(safePage > 1)}>‹</button>
        <span style={{ font: '600 12px/16px var(--font-body)', color: '#242424', minWidth: 60, textAlign: 'center' }}>
          {safePage} / {totalPages}
        </span>
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
      <label style={{ font: '500 11px/14px var(--font-body)', color: '#676767', letterSpacing: '.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '7px 28px 7px 10px',
          borderRadius: 7,
          border: `1.5px solid ${active ? '#067A46' : '#E4E4E4'}`,
          background: active ? '#F6FDE9' : '#fff',
          color: active ? '#067A46' : '#242424',
          font: `${active ? 600 : 400} 13px/18px var(--font-body)`,
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23676767' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 9px center',
          minWidth: 110,
          maxWidth: 200,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt === 'All' ? `All ${label}s` : opt}</option>
        ))}
      </select>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SpendDashboard() {
  const [filterCategory,        setFilterCategory]        = useState<string>('All');
  const [filterMarket,          setFilterMarket]          = useState<string>('All');
  const [filterStatus,          setFilterStatus]          = useState<'All' | 'Historical' | 'Forecast'>('All');
  const [filterCategoryManager, setFilterCategoryManager] = useState<string>('All');
  const [search,                setSearch]                = useState('');

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROWS.filter(r => {
      if (filterCategory        !== 'All' && r.category        !== filterCategory)        return false;
      if (filterMarket          !== 'All' && r.market          !== filterMarket)          return false;
      if (filterStatus          !== 'All' && r.actualsStatus   !== filterStatus)          return false;
      if (filterCategoryManager !== 'All' && r.categoryManager !== filterCategoryManager) return false;
      if (!q) return true;
      return (
        r.supplier.toLowerCase().includes(q)          ||
        r.skuName.toLowerCase().includes(q)           ||
        r.skuCode.toLowerCase().includes(q)           ||
        r.globalIngredient.toLowerCase().includes(q)  ||
        r.contractWeek.toLowerCase().includes(q)      ||
        r.market.toLowerCase().includes(q)            ||
        r.category.toLowerCase().includes(q)          ||
        r.budgetRisk.toLowerCase().includes(q)         ||
        r.categoryManager.toLowerCase().includes(q)
      );
    });
  }, [filterCategory, filterMarket, filterStatus, filterCategoryManager, search]);

  const metrics       = useMemo(() => computeMetrics(filteredRows),      [filteredRows]);
  const supplierSplit = useMemo(() => computeSupplierSplit(filteredRows), [filteredRows]);
  const weeklyRaw     = useMemo(() => computeWeeklyChart(filteredRows),  [filteredRows]);
  const chartData     = useMemo(() => weeklyRaw.filter(w => w.total > 0 || w.isForecast), [weeklyRaw]);

  // Top-8 suppliers by actual spend (keeps chart legend readable)
  const chartSuppliers = useMemo(() => supplierSplit.slice(0, 8).map(s => s.supplier), [supplierSplit]);

  const hasFilters = filterCategory !== 'All' || filterMarket !== 'All' || filterStatus !== 'All' || filterCategoryManager !== 'All' || search !== '';

  const contextLabel = [
    filterCategory !== 'All' ? filterCategory : 'All Categories',
    filterMarket   !== 'All' ? filterMarket   : 'All Markets',
  ].join(' · ');

  const riskTone = (r: string) => r === 'High' ? 'danger' : r === 'Medium' ? 'warning' : 'positive';

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>
      {/* Page Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #EEE', padding: '22px 32px' }}>
        <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginBottom: 6, display: 'flex', gap: 6 }}>
          <span>Strategic Procurement</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: '#242424' }}>Spend Analysis</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <h1 style={{ font: '500 30px/38px var(--font-display)', color: '#242424', margin: 0 }}>Spend Analysis</h1>
            <div style={{ font: '400 13px/18px var(--font-body)', color: '#676767', marginTop: 4, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Contract: {metrics.contractStart} → 2026-W23</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />
              <span>{contextLabel}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />
              <span>{metrics.supplierCount} supplier{metrics.supplierCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <span style={{ padding: '6px 12px', background: '#F6FDE9', color: '#067A46', borderRadius: 6, font: '600 12px/16px var(--font-body)', border: '1px solid #D2F895', whiteSpace: 'nowrap' }}>
            ● Live data
          </span>
        </div>
      </header>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: 10, padding: '14px 20px',
          border: '1px solid #E4E4E4',
          display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ font: '500 11px/14px var(--font-body)', color: '#676767', letterSpacing: '.03em', textTransform: 'uppercase' }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="6.5" cy="6.5" r="4" stroke="#9CA3AF" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Supplier, SKU, ingredient, week…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 30px 7px 30px',
                  borderRadius: 7, border: `1.5px solid ${search ? '#067A46' : '#E4E4E4'}`,
                  font: '400 13px/18px var(--font-body)', color: '#242424',
                  outline: 'none', background: '#fff',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: '#9CA3AF', fontSize: 14, lineHeight: 1,
                }}>✕</button>
              )}
            </div>
          </div>

          {/* Dropdowns */}
          <FilterSelect label="Category"     options={['All', ...CATEGORIES]}        value={filterCategory}        onChange={setFilterCategory} />
          <FilterSelect label="Market"       options={['All', ...MARKETS]}           value={filterMarket}          onChange={setFilterMarket} />
          <FilterSelect label="Status"       options={['All', 'Historical', 'Forecast']} value={filterStatus}     onChange={v => setFilterStatus(v as 'All' | 'Historical' | 'Forecast')} />
          <FilterSelect label="Cat. Manager" options={['All', ...CATEGORY_MANAGERS]} value={filterCategoryManager} onChange={setFilterCategoryManager} />

          {/* Clear */}
          {hasFilters && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ font: '500 11px/14px var(--font-body)', color: 'transparent', letterSpacing: '.03em' }}>x</label>
              <button
                onClick={() => { setFilterCategory('All'); setFilterMarket('All'); setFilterStatus('All'); setFilterCategoryManager('All'); setSearch(''); }}
                style={{
                  padding: '7px 14px', borderRadius: 7,
                  border: '1.5px solid #E4E4E4', background: '#fff',
                  color: '#676767', font: '400 13px/18px var(--font-body)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        {/* ── KPI Strip ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard
            label="Total Actual Spend"
            value={fmtFull(metrics.totalActualSpendEur)}
            sub={`${metrics.budgetUtilizationPct}% of awarded budget`}
            tone="neutral"
          />
          <KpiCard
            label="Awarded Budget"
            value={fmtFull(metrics.totalAwardedSpendEur)}
            sub={`Remaining: ${fmtFull(metrics.totalAwardedSpendEur - metrics.totalActualSpendEur)}`}
            tone="neutral"
          />
          <KpiCard
            label="Budget Utilization"
            value={`${metrics.budgetUtilizationPct}%`}
            sub="Actual vs contracted spend"
            tone={metrics.budgetUtilizationPct >= 90 ? 'danger' : metrics.budgetUtilizationPct >= 75 ? 'warning' : 'neutral'}
          />
          <KpiCard
            label="Avg Adherence"
            value={`${metrics.avgAdherencePct}%`}
            sub="Actual vs awarded volume"
            tone={metrics.avgAdherencePct >= 80 ? 'positive' : 'warning'}
          />
          <KpiCard
            label="Active Suppliers"
            value={String(metrics.supplierCount)}
            sub={`${contextLabel}`}
            tone="neutral"
          />
          <KpiCard
            label="At-Risk Contracts"
            value={String(metrics.atRiskSuppliers)}
            sub={`Supplier(s) ≥ 80% budget utilization`}
            tone={metrics.atRiskSuppliers > 0 ? (metrics.atRiskSuppliers >= 3 ? 'danger' : 'warning') : 'positive'}
          />
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

          {/* Weekly Spend Chart */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #E4E4E4' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Weekly Spend (EUR)</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
                Actual spend per period by supplier · {chartSuppliers.length < supplierSplit.length ? `Top ${chartSuppliers.length} of ${supplierSplit.length} suppliers shown` : `${chartSuppliers.length} supplier${chartSuppliers.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barSize={14} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: '#676767' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartData.length / 12))} />
                  <YAxis tick={{ fontSize: 11, fill: '#676767' }} tickLine={false} axisLine={false} tickFormatter={v => v === 0 ? '' : fmt(v)} width={52} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6,122,70,.04)' }} />
                  <Legend formatter={v => v} wrapperStyle={{ font: '400 11px var(--font-body)', paddingTop: 12 }} />
                  {chartSuppliers.map((sup, idx) => {
                    const color = SUPPLIER_COLOR[sup] ?? '#BBB';
                    const isLast = idx === chartSuppliers.length - 1;
                    return (
                      <Bar key={sup} dataKey={supplierKey(sup)} stackId="a" fill={color} name={sup} radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}>
                        {chartData.map((entry, j) => (
                          <Cell key={j} fill={entry.isForecast ? '#C8C8C8' : color} />
                        ))}
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BBB', font: '400 14px/20px var(--font-body)' }}>
                No spend data for selected filters
              </div>
            )}
          </div>

          {/* Supplier Split */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #E4E4E4', overflowY: 'auto', maxHeight: 380 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Supplier Split</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
                By actual spend · {supplierSplit.length} supplier{supplierSplit.length !== 1 ? 's' : ''}
              </div>
            </div>
            {supplierSplit.length > 0 ? supplierSplit.map(s => (
              <SupplierBar
                key={s.supplier}
                supplier={s.supplier}
                actual={s.actualEur}
                awarded={s.awardedEur}
                pct={s.pct}
                color={SUPPLIER_COLOR[s.supplier] ?? '#BBB'}
              />
            )) : (
              <div style={{ color: '#BBB', font: '400 13px/18px var(--font-body)', textAlign: 'center', padding: '32px 0' }}>No data</div>
            )}

            {/* Summary */}
            {supplierSplit.length > 0 && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: '#F8F8F8', borderRadius: 8, borderLeft: `4px solid ${metrics.atRiskSuppliers > 0 ? '#DC2626' : '#067A46'}` }}>
                <div style={{ font: '600 12px/16px var(--font-body)', color: '#242424', marginBottom: 3 }}>Spend vs Budget</div>
                <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767' }}>
                  {fmtFull(metrics.totalActualSpendEur)} of {fmtFull(metrics.totalAwardedSpendEur)} awarded.
                  {' '}Utilization <strong style={{ color: metrics.budgetUtilizationPct >= 90 ? '#B30000' : metrics.budgetUtilizationPct >= 75 ? '#A43700' : '#067A46' }}>{metrics.budgetUtilizationPct}%</strong>.
                  {metrics.atRiskSuppliers > 0 && <span style={{ color: '#B30000', fontWeight: 600 }}> {metrics.atRiskSuppliers} supplier{metrics.atRiskSuppliers !== 1 ? 's' : ''} at risk.</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Data Table ────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E4E4' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEE' }}>
            <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Contract Detail</div>
            <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
              {filteredRows.length} of {ROWS.length} rows · Click column header to sort · 25 / 50 / 100 per page
            </div>
          </div>
          <DataTable rows={filteredRows} />
        </div>

        {/* Footer */}
        <div style={{ font: '400 11px/16px var(--font-body)', color: '#BBB', textAlign: 'center', paddingBottom: 8 }}>
          HelloFresh Category Management · Data as of 2026-W19 · Confidential
        </div>
      </div>
    </div>
  );
}
