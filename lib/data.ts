export interface SpendRow {
  category: string;
  market: string;
  skuCode: string;
  globalIngredient: string;
  skuName: string;
  supplier: string;
  categoryManager: string;
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

export interface WeeklySpendPoint {
  week: string;
  weekLabel: string;
  total: number;
  isForecast: boolean;
  [key: string]: number | string | boolean;
}

export interface MetricsResult {
  totalActualSpendEur: number;
  totalAwardedSpendEur: number;
  budgetUtilizationPct: number;
  supplierCount: number;
  contractStart: string;
  contractEnd: string;
  budgetRisk: string;
  avgAdherencePct: number;
  atRiskSuppliers: number;
}

export interface SupplierSplitEntry {
  supplier: string;
  actualEur: number;
  awardedEur: number;
  pct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bakery / DACH  (original weekly data, H = Historical, F = Forecast)
// [supplier, week, H|F, adh%, weeklyQty, price, cumActual, cumAwarded, diffPct]
// ─────────────────────────────────────────────────────────────────────────────
type RawRow = [string, string, 'H'|'F', number, number, number, number, number, number];

const AMORE = 'AmoreFood GmbH BAK';
const LIKA  = 'Lika Bakery BV';
const H = 'H', F = 'F';

const BAKERY_RAW: RawRow[] = [
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

const BAKERY_ROWS: SpendRow[] = BAKERY_RAW.map(
  ([supplier, contractWeek, status, adherencePct, weeklyActualQty, avgStaticPriceEur,
    cumulativeActualSpendEur, cumulativeAwardedSpendEur, spendDiffPct]) => ({
    category: 'Bakery',
    market: 'DACH',
    skuCode: 'BAK-00-127869-3',
    globalIngredient: 'Flatbread',
    skuName: 'Lebanese Flatbread',
    supplier,
    categoryManager: 'Manon Turpaud',
    contractWeek,
    actualsStatus: status === 'H' ? 'Historical' : 'Forecast',
    adherencePct,
    weeklyActualQty,
    avgStaticPriceEur,
    cumulativeActualSpendEur,
    cumulativeAwardedSpendEur,
    spendDiffPct,
    budgetRisk: spendDiffPct >= -10 ? 'High' : spendDiffPct >= -40 ? 'Medium' : 'Low',
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic Grocery & Protein data (monthly checkpoints W24/2025 → W19/2026)
// ─────────────────────────────────────────────────────────────────────────────

// 13 checkpoint weeks spanning the contract period
const CKWKS = [
  '2025-W24', '2025-W28', '2025-W32', '2025-W36', '2025-W40',
  '2025-W44', '2025-W48', '2025-W52', '2026-W04', '2026-W08',
  '2026-W12', '2026-W16', '2026-W19',
];

// % of final cumulative at each checkpoint (patterns per utilisation story)
const NORMAL  = [0,  6, 14, 23, 33, 48, 62, 73, 81, 87, 91, 95, 100];
const AT_RISK = [0,  8, 18, 30, 43, 57, 70, 81, 87, 92, 96, 98, 100]; // running hot → near budget exhaustion
const SLOW    = [0,  3,  8, 14, 22, 35, 50, 63, 74, 83, 89, 95, 100]; // under-delivery
const AW_LIN  = [0,  6, 13, 19, 25, 31, 38, 44, 50, 56, 63, 69,  90]; // linear awarded (90% at W19, contract ends W23)

function genRows(
  category: string, market: string, skuCode: string, skuName: string, ingredient: string,
  supplier: string, categoryManager: string, finalActual: number, finalAwarded: number,
  actualPat: number[], price: number,
): SpendRow[] {
  return CKWKS.map((week, i) => {
    const cumA  = Math.round(finalActual  * actualPat[i] / 100);
    const cumAw = Math.round(finalAwarded * AW_LIN[i]   / 100);
    const prevCumA = i > 0 ? Math.round(finalActual * actualPat[i - 1] / 100) : 0;
    const delta = Math.max(0, cumA - prevCumA);
    const qty   = delta > 0 ? Math.round(delta / price) : 0;
    const diff  = cumAw > 0 ? Math.round((cumA / cumAw - 1) * 100) : 0;
    const adh   = cumAw > 0 ? Math.min(100, Math.round(cumA / cumAw * 100)) : 0;
    return {
      category, market, skuCode, globalIngredient: ingredient, skuName, supplier,
      categoryManager,
      contractWeek: week,
      actualsStatus: 'Historical' as const,
      adherencePct: adh,
      weeklyActualQty: qty,
      avgStaticPriceEur: price,
      cumulativeActualSpendEur: cumA,
      cumulativeAwardedSpendEur: cumAw,
      spendDiffPct: diff,
      budgetRisk: diff >= -10 ? 'High' : diff >= -40 ? 'Medium' : 'Low',
    };
  });
}

const GROCERY_ROWS: SpendRow[] = [
  // DACH – Penne Rigate 500g (61% util — on track) · DRY / dried pastas → Iryna Zender
  ...genRows('Grocery', 'DACH', 'GRC-00-020341-1', 'Penne Rigate 500g',  'Pasta', 'Barilla GmbH',       'Iryna Zender', 62000, 103000, NORMAL,  2.40),
  ...genRows('Grocery', 'DACH', 'GRC-00-020341-1', 'Penne Rigate 500g',  'Pasta', 'TortiPasta GmbH',    'Iryna Zender', 43000,  69000, NORMAL,  2.20),
  // US – Spaghetti 500g (76% util — healthy) · DRY / dried pastas → Iryna Zender
  ...genRows('Grocery', 'US',   'GRC-00-031122-5', 'Spaghetti 500g',     'Pasta', 'Barilla USA Inc',    'Iryna Zender', 92000, 121000, NORMAL,  2.60),
  ...genRows('Grocery', 'US',   'GRC-00-031122-5', 'Spaghetti 500g',     'Pasta', 'American Pasta Co',  'Iryna Zender', 75000, 100000, NORMAL,  2.45),
  // DKSE – Jasmine Rice 1kg (92% util — ⚠ budget watch) · DRY / rice → Gianna Tyrpin
  ...genRows('Grocery', 'DKSE', 'GRC-00-012887-2', 'Jasmine Rice 1kg',   'Rice',  'NordicGrain AB',     'Gianna Tyrpin', 43000,  46000, AT_RISK, 1.85),
  ...genRows('Grocery', 'DKSE', 'GRC-00-012887-2', 'Jasmine Rice 1kg',   'Rice',  'Scandinavian Mills', 'Gianna Tyrpin', 41000,  45000, AT_RISK, 1.90),
];

const PROTEIN_ROWS: SpendRow[] = [
  // DACH – Chicken Breast 200g (77% util — healthy) · PTN / poultry → Nicolas Brosens + Laure Montazel
  ...genRows('Protein', 'DACH',    'PRO-00-044215-8', 'Chicken Breast 200g',   'Poultry', 'Müller Fleisch GmbH',  'Nicolas Brosens + Laure Montazel', 155000, 202000, NORMAL,   5.20),
  ...genRows('Protein', 'DACH',    'PRO-00-044215-8', 'Chicken Breast 200g',   'Poultry', 'Wiesenhof Südwest',    'Nicolas Brosens + Laure Montazel', 128000, 166000, NORMAL,   4.90),
  // US – Atlantic Salmon Fillet (49% util — under-delivery) · PTN / finfish → Denys Lauster + Victoria Radford
  ...genRows('Protein', 'US',      'PRO-00-058334-2', 'Atlantic Salmon Fillet','Fish',    'Pacific Coast Seafood','Denys Lauster + Victoria Radford',  59000, 120000, SLOW,     9.80),
  ...genRows('Protein', 'US',      'PRO-00-058334-2', 'Atlantic Salmon Fillet','Fish',    'Atlantic Fresh Corp',  'Denys Lauster + Victoria Radford',  39000,  80000, SLOW,    10.20),
  // DKSE – Beef Mince 500g (95% util — 🔴 critical risk) · PTN / bovine → Nicolò Godi + Mathilde Vannier
  ...genRows('Protein', 'DKSE',    'PRO-00-037891-6', 'Beef Mince 500g',       'Beef',    'Scandinavian Meats AB','Nicolò Godi + Mathilde Vannier',    68000,  72000, AT_RISK,  4.60),
  ...genRows('Protein', 'DKSE',    'PRO-00-037891-6', 'Beef Mince 500g',       'Beef',    'Nordic Beef AS',       'Nicolò Godi + Mathilde Vannier',    63000,  66000, AT_RISK,  4.80),
  // BENELUX – Chicken Thigh 300g (55% util — under-delivery) · PTN / poultry → Nicolas Brosens + Laure Montazel
  ...genRows('Protein', 'BENELUX', 'PRO-00-029456-3', 'Chicken Thigh 300g',    'Poultry', 'BV ProteinsPlus',      'Nicolas Brosens + Laure Montazel',  26000,  48000, SLOW,     3.90),
  ...genRows('Protein', 'BENELUX', 'PRO-00-029456-3', 'Chicken Thigh 300g',    'Poultry', 'Agri-Fresh BV',        'Nicolas Brosens + Laure Montazel',  22000,  39000, SLOW,     3.70),
];

export const ROWS: SpendRow[] = [...BAKERY_ROWS, ...GROCERY_ROWS, ...PROTEIN_ROWS];

// Unique filter values
export const CATEGORIES = ['Bakery', 'Grocery', 'Protein'];
export const MARKETS    = ['BENELUX', 'DACH', 'DKSE', 'US'];

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic aggregation helpers
// ─────────────────────────────────────────────────────────────────────────────

export function computeMetrics(rows: SpendRow[]): MetricsResult {
  if (rows.length === 0) {
    return { totalActualSpendEur: 0, totalAwardedSpendEur: 0, budgetUtilizationPct: 0,
      supplierCount: 0, contractStart: '—', contractEnd: '—', budgetRisk: '—',
      avgAdherencePct: 0, atRiskSuppliers: 0 };
  }
  const maxPerSup = new Map<string, { actual: number; awarded: number }>();
  for (const r of rows) {
    const cur = maxPerSup.get(r.supplier) ?? { actual: 0, awarded: 0 };
    maxPerSup.set(r.supplier, {
      actual:  Math.max(cur.actual,  r.cumulativeActualSpendEur),
      awarded: Math.max(cur.awarded, r.cumulativeAwardedSpendEur),
    });
  }
  const totalActual  = [...maxPerSup.values()].reduce((s, v) => s + v.actual,  0);
  const totalAwarded = [...maxPerSup.values()].reduce((s, v) => s + v.awarded, 0);
  const utilPct = totalAwarded > 0 ? Math.round(totalActual / totalAwarded * 1000) / 10 : 0;
  const weeks   = [...new Set(rows.map(r => r.contractWeek))].sort();
  const adhRows = rows.filter(r => r.adherencePct > 0);
  const avgAdh  = adhRows.length > 0
    ? Math.round(adhRows.reduce((s, r) => s + r.adherencePct, 0) / adhRows.length) : 0;
  const atRisk  = [...maxPerSup.values()].filter(v => v.awarded > 0 && v.actual / v.awarded >= 0.80).length;
  return {
    totalActualSpendEur: totalActual,
    totalAwardedSpendEur: totalAwarded,
    budgetUtilizationPct: utilPct,
    supplierCount: maxPerSup.size,
    contractStart: weeks[0] ?? '—',
    contractEnd:   weeks[weeks.length - 1] ?? '—',
    budgetRisk:    utilPct >= 90 ? 'High' : utilPct >= 75 ? 'Medium' : 'Low',
    avgAdherencePct: avgAdh,
    atRiskSuppliers: atRisk,
  };
}

export function computeSupplierSplit(rows: SpendRow[]): SupplierSplitEntry[] {
  const map = new Map<string, { actual: number; awarded: number }>();
  for (const r of rows) {
    const cur = map.get(r.supplier) ?? { actual: 0, awarded: 0 };
    map.set(r.supplier, {
      actual:  Math.max(cur.actual,  r.cumulativeActualSpendEur),
      awarded: Math.max(cur.awarded, r.cumulativeAwardedSpendEur),
    });
  }
  const total = [...map.values()].reduce((s, v) => s + v.actual, 0);
  return [...map.entries()]
    .map(([supplier, { actual, awarded }]) => ({
      supplier, actualEur: actual, awardedEur: awarded,
      pct: total > 0 ? Math.round(actual / total * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.actualEur - a.actualEur);
}

export function computeWeeklyChart(rows: SpendRow[]): WeeklySpendPoint[] {
  const weeks     = [...new Set(rows.map(r => r.contractWeek))].sort();
  const suppliers = [...new Set(rows.map(r => r.supplier))];
  const prevCum   = new Map<string, number>();

  return weeks.map(week => {
    const weekRows = rows.filter(r => r.contractWeek === week);
    const point: WeeklySpendPoint = {
      week,
      weekLabel: week.replace('20', '').replace('-', ' '),
      total: 0,
      isForecast: false,
    };
    for (const sup of suppliers) {
      const row = weekRows.find(r => r.supplier === sup);
      const key = supplierKey(sup);
      if (row) {
        const prev  = prevCum.get(sup) ?? 0;
        const delta = Math.max(0, row.cumulativeActualSpendEur - prev);
        point[key]   = delta;
        point.total += delta;
        prevCum.set(sup, row.cumulativeActualSpendEur);
        if (row.actualsStatus === 'Forecast') point.isForecast = true;
      } else {
        point[key] = 0;
      }
    }
    return point;
  });
}

export function supplierKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

// Stable color palette — index matches sorted unique supplier list
export const SUPPLIER_PALETTE = [
  '#067A46', '#1268FF', '#A43700', '#8B5CF6',
  '#0891B2', '#D97706', '#DC2626', '#059669',
  '#7C3AED', '#0369A1', '#B45309', '#047857',
  '#9D174D', '#1D4ED8', '#C2410C', '#15803D',
];

// Assign stable colors to all suppliers (sorted for determinism)
const ALL_SUPPLIER_NAMES = [...new Set(ROWS.map(r => r.supplier))].sort();
export const SUPPLIER_COLOR: Record<string, string> = Object.fromEntries(
  ALL_SUPPLIER_NAMES.map((s, i) => [s, SUPPLIER_PALETTE[i % SUPPLIER_PALETTE.length]]),
);
