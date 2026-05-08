"use client";
import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import { ROWS, METRICS, SUPPLIER_SPLIT, WEEKLY_CHART, type SpendRow } from "@/lib/data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1000 ? `€${(n / 1000).toFixed(1)}k` : `€${n.toLocaleString()}`;

const fmtFull = (n: number) => `€${n.toLocaleString('de-DE')}`;

const SUPPLIER_COLORS: Record<string, string> = {
  'AmoreFood GmbH BAK': '#067A46',
  'Lika Bakery BV':     '#1268FF',
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, tone }: {
  label: string; value: string; sub?: string;
  tone?: 'positive' | 'warning' | 'neutral';
}) {
  const subColor = tone === 'positive' ? '#067A46' : tone === 'warning' ? '#A43700' : '#676767';
  return (
    <div style={{
      flex: 1, minWidth: 140, background: '#fff', borderRadius: 10, padding: '18px 20px',
      border: '1px solid #E4E4E4', boxShadow: '0 1px 3px rgba(36,36,36,.06)',
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
  const shortName = supplier === 'AmoreFood GmbH BAK' ? 'AmoreFood' : 'Lika Bakery';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ font: '600 14px/20px var(--font-body)', color: '#242424' }}>{shortName}</span>
        </div>
        <span style={{ font: '700 14px/20px var(--font-body)', color: '#242424' }}>{fmtFull(actual)}</span>
      </div>
      <div style={{ height: 10, background: '#EEE', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 600ms cubic-bezier(0,0,0.2,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ font: '400 11px/14px var(--font-body)', color: '#676767' }}>{pct}% of actual spend</span>
        <span style={{ font: '400 11px/14px var(--font-body)', color: '#676767' }}>Budget: {fmtFull(awarded)}</span>
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
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{
      background: '#fff', border: '1px solid #E4E4E4', borderRadius: 8,
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.12)',
      font: '400 13px/18px var(--font-body)', minWidth: 180,
    }}>
      <div style={{ font: '600 13px/18px var(--font-body)', color: '#242424', marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: '#4B4B4B', marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
            {p.name === 'amore' ? 'AmoreFood' : 'Lika Bakery'}
          </span>
          <span style={{ fontWeight: 600 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div style={{ borderTop: '1px solid #EEE', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#242424' }}>
          <span>Total</span>
          <span>{fmtFull(total)}</span>
        </div>
      )}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
const TABLE_COLS = [
  { key: 'contractWeek',            label: 'Week',         w: 90 },
  { key: 'supplier',                label: 'Supplier',     w: 200 },
  { key: 'actualsStatus',           label: 'Status',       w: 100 },
  { key: 'adherencePct',            label: 'Adherence %',  w: 100 },
  { key: 'weeklyActualQty',         label: 'Weekly Qty (g)',w: 120 },
  { key: 'cumulativeActualSpendEur',label: 'Cum Actual',   w: 120 },
  { key: 'cumulativeAwardedSpendEur',label: 'Cum Budget',  w: 120 },
  { key: 'spendDiffPct',            label: 'Spend Diff %', w: 110 },
  { key: 'budgetRisk',              label: 'Risk',         w: 80 },
] as const;

type ColKey = typeof TABLE_COLS[number]['key'];

function DataTable({ rows }: { rows: SpendRow[] }) {
  const [sortKey, setSortKey]   = useState<ColKey>('contractWeek');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey as keyof SpendRow];
      const bv = b[sortKey as keyof SpendRow];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: ColKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 13px/18px var(--font-body)' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E4E4E4' }}>
            {TABLE_COLS.map(col => (
              <th key={col.key}
                onClick={() => toggleSort(col.key)}
                style={{
                  padding: '10px 12px', textAlign: 'left', color: '#676767',
                  font: '600 12px/16px var(--font-body)', cursor: 'pointer',
                  whiteSpace: 'nowrap', width: col.w, userSelect: 'none',
                  background: sortKey === col.key ? '#F8F8F8' : 'transparent',
                }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {col.label}
                  <span style={{ opacity: 0.5 }}>
                    {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const supplierColor = SUPPLIER_COLORS[row.supplier] ?? '#242424';
            const isForecast    = row.actualsStatus === 'Forecast';
            const diffColor     = row.spendDiffPct < -50 ? '#B30000' : row.spendDiffPct < -20 ? '#A43700' : '#067A46';
            return (
              <tr key={i} style={{ borderBottom: '1px solid #F0F0F0', background: isForecast ? '#FAFFF5' : 'transparent' }}>
                <td style={{ padding: '9px 12px', color: '#242424', fontFamily: 'var(--font-mono)' }}>{row.contractWeek}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: supplierColor, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ color: '#242424', fontWeight: 500 }}>{row.supplier}</span>
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                    font: '600 11px/16px var(--font-body)',
                    background: isForecast ? '#E9FAFF' : '#F6FDE9',
                    color: isForecast ? '#001DB2' : '#067A46',
                  }}>
                    {row.actualsStatus}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: row.adherencePct === 0 ? '#BBB' : '#242424', fontFamily: 'var(--font-mono)' }}>
                  {row.adherencePct > 0 ? `${row.adherencePct}%` : '—'}
                </td>
                <td style={{ padding: '9px 12px', color: row.weeklyActualQty === 0 ? '#BBB' : '#242424', fontFamily: 'var(--font-mono)' }}>
                  {row.weeklyActualQty > 0 ? row.weeklyActualQty.toLocaleString() : '—'}
                </td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: '#242424' }}>
                  {fmtFull(row.cumulativeActualSpendEur)}
                </td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: '#676767' }}>
                  {fmtFull(row.cumulativeAwardedSpendEur)}
                </td>
                <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: diffColor, fontWeight: 600 }}>
                  {row.spendDiffPct > 0 ? '+' : ''}{row.spendDiffPct}%
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                    font: '600 11px/16px var(--font-body)',
                    background: '#F6FDE9', color: '#067A46',
                  }}>
                    {row.budgetRisk}
                  </span>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#BBB', font: '400 14px/20px var(--font-body)' }}>
                No rows match the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SpendDashboard() {
  const [filterStatus,   setFilterStatus]   = useState<'All' | 'Historical' | 'Forecast'>('All');
  const [filterSupplier, setFilterSupplier] = useState<'All' | string>('All');

  const filteredRows = useMemo(() =>
    ROWS.filter(r =>
      (filterStatus   === 'All' || r.actualsStatus === filterStatus) &&
      (filterSupplier === 'All' || r.supplier      === filterSupplier)
    ), [filterStatus, filterSupplier]);

  // Chart: only show weeks that have any spend (or are forecast)
  const chartData = useMemo(() =>
    WEEKLY_CHART.filter(w => w.total > 0 || w.isForecast)
      .map(w => ({ ...w, weekLabel: w.week.replace('20', '').replace('-', ' ') }))
  , []);

  const selectStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 6,
    border: `1.5px solid ${active ? '#067A46' : '#E4E4E4'}`,
    background: active ? '#F6FDE9' : '#fff',
    color: active ? '#067A46' : '#4B4B4B',
    font: '600 13px/18px var(--font-body)',
    cursor: 'pointer', transition: 'all 150ms',
  });

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100vh' }}>
      {/* Page Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #EEE', padding: '22px 32px',
      }}>
        <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginBottom: 6, display: 'flex', gap: 6 }}>
          <span>Strategic Procurement</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: '#242424' }}>Spend Analysis</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <h1 style={{ font: '500 30px/38px var(--font-display)', color: '#242424', margin: 0 }}>
              Spend Analysis
            </h1>
            <div style={{ font: '400 13px/18px var(--font-body)', color: '#676767', marginTop: 4, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span>Contract: {METRICS.contractStart} → {METRICS.contractEnd}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />
              <span>Market: DACH</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#BBB', display: 'inline-block' }} />
              <span>SKU: BAK-00-127869-3 · Lebanese Flatbread</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '6px 12px', background: '#F6FDE9', color: '#067A46',
              borderRadius: 6, font: '600 12px/16px var(--font-body)',
              border: '1px solid #D2F895',
            }}>
              ● Live data
            </span>
          </div>
        </div>
      </header>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── KPI Strip ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard
            label="Total Actual Spend"
            value={fmtFull(METRICS.totalActualSpendEur)}
            sub={`${METRICS.budgetUtilizationPct}% of awarded budget`}
            tone="neutral"
          />
          <KpiCard
            label="Awarded Budget"
            value={fmtFull(METRICS.totalAwardedSpendEur)}
            sub={`Remaining: ${fmtFull(METRICS.totalAwardedSpendEur - METRICS.totalActualSpendEur)}`}
            tone="neutral"
          />
          <KpiCard
            label="Budget Utilization"
            value={`${METRICS.budgetUtilizationPct}%`}
            sub="vs contracted volume"
            tone={METRICS.budgetUtilizationPct >= 80 ? 'positive' : 'warning'}
          />
          <KpiCard
            label="Avg Adherence"
            value={`${METRICS.avgAdherencePct}%`}
            sub="Actual vs awarded qty"
            tone={METRICS.avgAdherencePct >= 80 ? 'positive' : 'warning'}
          />
          <KpiCard
            label="Active Suppliers"
            value={String(METRICS.supplierCount)}
            sub="DACH market"
            tone="neutral"
          />
          <KpiCard
            label="Budget Risk"
            value={METRICS.budgetRisk}
            sub="Across all categories"
            tone="positive"
          />
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

          {/* Weekly Spend Bar Chart */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #E4E4E4' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Weekly Spend (EUR)</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
                Actual spend per week by supplier · Weeks with activity shown · Shaded = Forecast
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barSize={16} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 10, fill: '#676767' }}
                  tickLine={false} axisLine={false}
                  interval={Math.floor(chartData.length / 10)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#676767' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => v === 0 ? '' : fmt(v)}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6,122,70,.04)' }} />
                <Legend
                  formatter={(value) => value === 'amore' ? 'AmoreFood GmbH BAK' : 'Lika Bakery BV'}
                  wrapperStyle={{ font: '400 12px var(--font-body)', paddingTop: 12 }}
                />
                <Bar dataKey="amore" stackId="a" fill="#067A46" name="amore" radius={[0, 0, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isForecast ? '#96DC14' : '#067A46'} />
                  ))}
                </Bar>
                <Bar dataKey="lika" stackId="a" fill="#1268FF" name="lika" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isForecast ? '#93C5FD' : '#1268FF'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Supplier Split */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #E4E4E4' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Supplier Split</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
                Cumulative actual spend per supplier
              </div>
            </div>

            {SUPPLIER_SPLIT.map(s => (
              <SupplierBar
                key={s.supplier}
                supplier={s.supplier}
                actual={s.actualEur}
                awarded={s.awardedEur}
                pct={s.pct}
                color={SUPPLIER_COLORS[s.supplier] ?? '#242424'}
              />
            ))}

            {/* Summary */}
            <div style={{
              marginTop: 12, padding: '14px 16px', background: '#F8F8F8',
              borderRadius: 8, borderLeft: '4px solid #067A46',
            }}>
              <div style={{ font: '600 12px/16px var(--font-body)', color: '#242424', marginBottom: 4 }}>
                Spend vs Budget
              </div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767' }}>
                {fmtFull(METRICS.totalActualSpendEur)} actual out of {fmtFull(METRICS.totalAwardedSpendEur)} awarded.
                Budget utilization is <strong style={{ color: '#A43700' }}>{METRICS.budgetUtilizationPct}%</strong> — spend trailing awarded by ~{Math.round(100 - METRICS.budgetUtilizationPct)}%.
              </div>
            </div>
          </div>
        </div>

        {/* ── Data Table ────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E4E4E4' }}>
          {/* Table Header + Filters */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #EEE',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ font: '600 15px/20px var(--font-body)', color: '#242424' }}>Contract Detail</div>
              <div style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginTop: 2 }}>
                {filteredRows.length} of {ROWS.length} rows · Click column header to sort
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Status filter */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginRight: 4 }}>Status:</span>
                {(['All', 'Historical', 'Forecast'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={selectStyle(filterStatus === s)}>
                    {s}
                  </button>
                ))}
              </div>
              {/* Supplier filter */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ font: '400 12px/16px var(--font-body)', color: '#676767', marginRight: 4 }}>Supplier:</span>
                {(['All', 'AmoreFood GmbH BAK', 'Lika Bakery BV'] as const).map(s => (
                  <button key={s} onClick={() => setFilterSupplier(s)} style={selectStyle(filterSupplier === s)}>
                    {s === 'All' ? 'All' : s === 'AmoreFood GmbH BAK' ? 'AmoreFood' : 'Lika Bakery'}
                  </button>
                ))}
              </div>
              {(filterStatus !== 'All' || filterSupplier !== 'All') && (
                <button
                  onClick={() => { setFilterStatus('All'); setFilterSupplier('All'); }}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #E4E4E4', background: 'transparent', color: '#676767', font: '400 12px/16px var(--font-body)', cursor: 'pointer' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <DataTable rows={filteredRows} />
        </div>

        {/* Footer */}
        <div style={{ font: '400 11px/16px var(--font-body)', color: '#BBB', textAlign: 'center', paddingBottom: 8 }}>
          HelloFresh Category Management · DACH · Data as of 2026-W19 · Confidential
        </div>
      </div>
    </div>
  );
}
