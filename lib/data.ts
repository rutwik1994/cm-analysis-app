export interface SpendRow {
  market: string;
  skuCode: string;
  globalIngredient: string;
  skuName: string;
  supplier: string;
  contractWeek: string;
  actualsStatus: 'Historical' | 'Forecast';
  adherencePct: number;
  weeklyActualQty: number;
  avgStaticPriceEur: number;
  cumulativeActualSpendEur: number;
  cumulativeAwardedSpendEur: number;
  spendDiffPct: number;
  budgetRisk: string;
}

// [supplier, contractWeek, status, adherence, weeklyQty, avgPrice, cumActual, cumAwarded, diffPct]
type RawRow = [string, string, 'H' | 'F', number, number, number, number, number, number];

const AMORE = 'AmoreFood GmbH BAK';
const LIKA  = 'Lika Bakery BV';
const H = 'H', F = 'F';

const RAW: RawRow[] = [
  [LIKA,  '2025-W24', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W24', H, 15,  1560, 0.50,   905,  5299, -83],
  [AMORE, '2025-W25', H,  7,     0, 0.00,   905,  5299, -83],
  [LIKA,  '2025-W25', H,  0,     0, 0.00,     0,     0,   0],
  [LIKA,  '2025-W26', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W26', H, 10,  1560, 0.50,  1810, 10598, -83],
  [AMORE, '2025-W27', H,  7,     0, 0.00,  1810, 10598, -83],
  [LIKA,  '2025-W27', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W28', H,  6,     0, 0.00,  1810, 10598, -83],
  [LIKA,  '2025-W28', H,  0,     0, 0.00,     0,     0,   0],
  [LIKA,  '2025-W29', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W29', H, 10,  3120, 0.50,  3620, 15897, -77],
  [LIKA,  '2025-W30', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W30', H, 19,  7800, 0.50,  8144, 21196, -62],
  [LIKA,  '2025-W31', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W31', H, 17,     0, 0.00,  8144, 21196, -62],
  [AMORE, '2025-W32', H, 18,  3120, 0.53,  9814, 26813, -63],
  [LIKA,  '2025-W32', H,  0,     0, 0.00,     0,     0,   0],
  [LIKA,  '2025-W33', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W33', H, 16,     0, 0.00,  9814, 26813, -63],
  [AMORE, '2025-W34', H, 15,     0, 0.00,  9814, 26813, -63],
  [LIKA,  '2025-W34', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W35', H, 17,  4680, 0.53, 12318, 32430, -62],
  [LIKA,  '2025-W35', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W36', H, 17,  1560, 0.53, 13153, 38048, -65],
  [LIKA,  '2025-W36', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W37', H, 17,  1560, 0.53, 13988, 43665, -68],
  [LIKA,  '2025-W37', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W38', H, 16,     0, 0.00, 13988, 43665, -68],
  [LIKA,  '2025-W38', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W39', H, 15,     0, 0.00, 13988, 43665, -68],
  [LIKA,  '2025-W39', H,  0,     0, 0.00,     0,     0,   0],
  [LIKA,  '2025-W40', H,  0,     0, 0.00,     0,     0,   0],
  [AMORE, '2025-W40', H, 14,     0, 0.00, 13988, 43665, -68],
  [LIKA,  '2025-W41', H,  5,  8640, 0.53,  4580,  5617, -18],
  [AMORE, '2025-W41', H, 16,  6240, 0.53, 17327, 49282, -65],
  [LIKA,  '2025-W42', H,  4,     0, 0.00,  4580,  5617, -18],
  [AMORE, '2025-W42', H, 15,     0, 0.00, 17327, 49282, -65],
  [AMORE, '2025-W43', H, 15,     0, 0.00, 17327, 49282, -65],
  [LIKA,  '2025-W43', H,  4,     0, 0.00,  4580,  5617, -18],
  [LIKA,  '2025-W44', H,  5,  1440, 0.53,  5343, 11234, -52],
  [AMORE, '2025-W44', H, 15,  1560, 0.53, 18162, 54899, -67],
  [LIKA,  '2025-W45', H,  4,     0, 0.00,  5343, 11234, -52],
  [AMORE, '2025-W45', H, 14,     0, 0.00, 18162, 54899, -67],
  [LIKA,  '2025-W46', H,  4,     0, 0.00,  5343, 11234, -52],
  [AMORE, '2025-W46', H, 13,     0, 0.00, 18162, 54899, -67],
  [AMORE, '2025-W47', H, 15,  4680, 0.53, 20666, 60516, -66],
  [LIKA,  '2025-W47', H,  7,  8640, 0.53,  9922, 16851, -41],
  [LIKA,  '2025-W48', H,  7,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2025-W48', H, 14,     0, 0.00, 20666, 60516, -66],
  [LIKA,  '2025-W49', H,  7,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2025-W49', H, 14,     0, 0.00, 20666, 60516, -66],
  [AMORE, '2025-W50', H, 13,     0, 0.00, 20666, 60516, -66],
  [LIKA,  '2025-W50', H,  7,     0, 0.00,  9922, 16851, -41],
  [LIKA,  '2025-W51', H,  6,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2025-W51', H, 13,     0, 0.00, 20666, 60516, -66],
  [AMORE, '2025-W52', H, 12,     0, 0.00, 20666, 60516, -66],
  [LIKA,  '2025-W52', H,  6,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2026-W01', H, 12,     0, 0.00, 20666, 60516, -66],
  [LIKA,  '2026-W01', H,  6,     0, 0.00,  9922, 16851, -41],
  [LIKA,  '2026-W02', H,  6,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2026-W02', H, 11,     0, 0.00, 20666, 60516, -66],
  [LIKA,  '2026-W03', H,  6,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2026-W03', H, 13,  6240, 0.53, 24005, 66133, -64],
  [LIKA,  '2026-W04', H,  5,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2026-W04', H, 12,     0, 0.00, 24005, 66133, -64],
  [LIKA,  '2026-W05', H,  5,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2026-W05', H, 12,     0, 0.00, 24005, 66133, -64],
  [LIKA,  '2026-W06', H,  5,     0, 0.00,  9922, 16851, -41],
  [AMORE, '2026-W06', H, 12,     0, 0.00, 24005, 66133, -64],
  [LIKA,  '2026-W07', H,  8, 12960, 0.53, 16791, 22468, -25],
  [AMORE, '2026-W07', H, 12,  3560, 0.53, 25910, 71750, -64],
  [LIKA,  '2026-W08', H,  8,     0, 0.00, 16791, 22468, -25],
  [AMORE, '2026-W08', H, 12,     0, 0.00, 25910, 71750, -64],
  [AMORE, '2026-W09', H, 12,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W09', H,  8,     0, 0.00, 16791, 22468, -25],
  [LIKA,  '2026-W10', H,  8,     0, 0.00, 16791, 22468, -25],
  [AMORE, '2026-W10', H, 11,     0, 0.00, 25910, 71750, -64],
  [AMORE, '2026-W11', H, 11,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W11', H,  8,  1440, 0.53, 17554, 28085, -38],
  [AMORE, '2026-W12', H, 11,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W12', H,  9,  4320, 0.53, 19844, 33702, -41],
  [LIKA,  '2026-W13', H,  8,     0, 0.00, 19844, 33702, -41],
  [AMORE, '2026-W13', H, 11,     0, 0.00, 25910, 71750, -64],
  [AMORE, '2026-W14', H, 10,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W14', H,  8,     0, 0.00, 19844, 33702, -41],
  [AMORE, '2026-W15', H, 10,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W15', H,  9,  4320, 0.53, 22133, 39319, -44],
  [AMORE, '2026-W16', H, 10,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W16', H,  9,     0, 0.00, 22133, 39319, -44],
  [AMORE, '2026-W17', H, 10,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W17', H,  9,  2880, 0.53, 23659, 44936, -47],
  [AMORE, '2026-W18', H,  9,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W18', H,  9,  1440, 0.53, 24422, 50553, -52],
  [AMORE, '2026-W19', H,  9,   746, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W19', H,  9,  1491, 0.00, 24422, 50553, -52],
  [AMORE, '2026-W20', F,  9,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W20', F,  9,     0, 0.00, 24422, 50553, -52],
  [AMORE, '2026-W21', F,  9,     0, 0.00, 25910, 71750, -64],
  [LIKA,  '2026-W21', F,  9,     0, 0.00, 24422, 50553, -52],
];

export const ROWS: SpendRow[] = RAW.map(([supplier, contractWeek, status, adherencePct, weeklyActualQty, avgStaticPriceEur, cumulativeActualSpendEur, cumulativeAwardedSpendEur, spendDiffPct]) => ({
  market: 'DACH',
  skuCode: 'BAK-00-127869-3',
  globalIngredient: 'Lebanese Flatbread',
  skuName: 'Libanesisches Fladenbrot (2x60g)',
  supplier,
  contractWeek,
  actualsStatus: status === 'H' ? 'Historical' : 'Forecast',
  adherencePct,
  weeklyActualQty,
  avgStaticPriceEur,
  cumulativeActualSpendEur,
  cumulativeAwardedSpendEur,
  spendDiffPct,
  budgetRisk: 'Low',
}));

// ── Computed aggregates ───────────────────────────────────────────────────────

const SUPPLIERS = [AMORE, LIKA] as const;
export type SupplierName = typeof SUPPLIERS[number];

function latestCumSpend(supplier: string): { actual: number; awarded: number } {
  const supplierRows = ROWS.filter(r => r.supplier === supplier);
  const last = supplierRows[supplierRows.length - 1];
  return { actual: last.cumulativeActualSpendEur, awarded: last.cumulativeAwardedSpendEur };
}

const amoreSpend  = latestCumSpend(AMORE);
const likaSpend   = latestCumSpend(LIKA);

export const METRICS = {
  totalActualSpendEur:   amoreSpend.actual  + likaSpend.actual,
  totalAwardedSpendEur:  amoreSpend.awarded + likaSpend.awarded,
  get budgetUtilizationPct() {
    return Math.round((this.totalActualSpendEur / this.totalAwardedSpendEur) * 1000) / 10;
  },
  supplierCount: 2,
  contractStart: '2025-W24',
  contractEnd:   '2026-W23',
  budgetRisk:    'Low',
  get avgAdherencePct() {
    const active = ROWS.filter(r => r.adherencePct > 0 && r.actualsStatus === 'Historical');
    return Math.round(active.reduce((s, r) => s + r.adherencePct, 0) / active.length);
  },
} as const;

export const SUPPLIER_SPLIT: { supplier: string; actualEur: number; awardedEur: number; pct: number }[] = [
  { supplier: AMORE, actualEur: amoreSpend.actual,  awardedEur: amoreSpend.awarded,  pct: Math.round((amoreSpend.actual  / (amoreSpend.actual + likaSpend.actual)) * 1000) / 10 },
  { supplier: LIKA,  actualEur: likaSpend.actual,   awardedEur: likaSpend.awarded,   pct: Math.round((likaSpend.actual   / (amoreSpend.actual + likaSpend.actual)) * 1000) / 10 },
];

// Weekly spend chart: delta of cumulative per supplier, aggregated per week
export interface WeeklySpendPoint {
  week: string;
  weekLabel: string;
  amore: number;
  lika: number;
  total: number;
  isForecast: boolean;
}

export function buildWeeklyChart(): WeeklySpendPoint[] {
  const weeks = Array.from(new Set(ROWS.map(r => r.contractWeek))).sort();
  const prevAmore: Record<string, number> = {};
  const prevLika:  Record<string, number> = {};
  let lastAmore = 0, lastLika = 0;

  return weeks.map(week => {
    const amoreRow = ROWS.find(r => r.contractWeek === week && r.supplier === AMORE);
    const likaRow  = ROWS.find(r => r.contractWeek === week && r.supplier === LIKA);

    const amoreNow = amoreRow?.cumulativeActualSpendEur ?? lastAmore;
    const likaNow  = likaRow?.cumulativeActualSpendEur  ?? lastLika;

    const amoreDelta = Math.max(0, amoreNow - lastAmore);
    const likaDelta  = Math.max(0, likaNow  - lastLika);

    lastAmore = amoreNow;
    lastLika  = likaNow;

    const isForecast = amoreRow?.actualsStatus === 'Forecast' || likaRow?.actualsStatus === 'Forecast';
    const [year, wNum] = week.split('-');
    const weekLabel = `${wNum}\n${year.slice(2)}`;

    return { week, weekLabel, amore: amoreDelta, lika: likaDelta, total: amoreDelta + likaDelta, isForecast };
  });
}

export const WEEKLY_CHART = buildWeeklyChart();
export const ALL_SUPPLIERS = [AMORE, LIKA] as const;
