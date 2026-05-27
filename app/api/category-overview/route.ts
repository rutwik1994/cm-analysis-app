/**
 * GET /api/category-overview
 *
 * Returns aggregated spend (EUR), volume, supplier, SKU and ingredient-family data
 * from purchase_order__enriched JOIN culinary_sku, grouped by category × sub_category.
 *
 * FX conversion is done inline in SQL using ECB rates fetched 2026-05-26.
 *
 * Query params (all optional):
 *   year      — 2026 (default: 2026)
 *   quarter   — 1 | 2 | 3 | 4   (omit for full-year)
 *   category  — PTN | DAI | BAK | PHF | DRY | SPI | CON | PRO  (omit for all)
 *   market    — DACH, US, DKSE, BENELUX, FR, GB, AU, NZ, IE, CA  (comma-separated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryDatabricks } from '@/lib/databricks';

export const dynamic = 'force-dynamic';

// ── Simple in-memory TTL cache (per serverless instance) ──────────────────────
const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes
function cacheGet<T>(key: string): T | null {
  const e = _cache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL ? (e.data as T) : null;
}
function cacheSet(key: string, data: unknown) {
  if (_cache.size > 100) _cache.clear();
  _cache.set(key, { ts: Date.now(), data });
}

const PO_TABLE  = 'public_edw_business_mart_live.purchase_order__enriched';
const SKU_TABLE = 'public_edw_base_grain_live.culinary_sku';

// App-facing market → DB country_group values
const MARKET_TO_DB: Record<string, string[]> = {
  DACH:    ['DACH'],
  US:      ['US'],
  DKSE:    ['DKSE'],
  BENELUX: ['BENELUX', 'BENELUXFR'],
  FR:      ['FR', 'FRANCE'],
  GB:      ['GB', 'UK'],
  AU:      ['AU', 'AUNZ'],
  NZ:      ['NZ', 'AUNZ'],
  IE:      ['IE'],
  CA:      ['CA'],
};

// HF week ranges per quarter — PO week format is 2026-W01
const QUARTER_WEEK_RANGES: Record<number, [string, string]> = {
  1: ['W01', 'W13'],
  2: ['W14', 'W26'],
  3: ['W27', 'W39'],
  4: ['W40', 'W52'],
};

/**
 * ECB FX rates (2026-05-26): 1 unit of local currency → EUR
 * Used as a CASE expression inside SQL to avoid pulling raw local values back.
 */
const FX_CASE = `
  CASE currency
    WHEN 'EUR' THEN 1.0
    WHEN 'USD' THEN 0.85960
    WHEN 'SEK' THEN 0.09238
    WHEN 'GBP' THEN 1.15774
    WHEN 'DKK' THEN 0.13383
    WHEN 'NOK' THEN 0.09283
    WHEN 'AUD' THEN 0.61588
    WHEN 'NZD' THEN 0.50219
    WHEN 'CAD' THEN 0.62232
    ELSE 1.0
  END
`.trim();

export interface CategoryOverviewRow {
  year:        number;
  quarter:     number | null;  // null = full year
  category:    string;
  subCategory: string;
  spendEur:    number;
  units:       number;
  suppliers:   number;
  skus:        number;
  families:    number;
}

// Static fallback — renders page without Databricks
const FALLBACK: CategoryOverviewRow[] = [
  { year: 2026, quarter: null, category: 'PTN', subCategory: 'BOVINE',               spendEur: 52000000, units: 18000000, suppliers: 12, skus: 45,  families: 18 },
  { year: 2026, quarter: null, category: 'PTN', subCategory: 'POULTRY',               spendEur: 38000000, units: 22000000, suppliers: 8,  skus: 30,  families: 12 },
  { year: 2026, quarter: null, category: 'PTN', subCategory: 'FINFISH',               spendEur: 15000000, units:  8000000, suppliers: 10, skus: 25,  families: 10 },
  { year: 2026, quarter: null, category: 'PHF', subCategory: 'LEAFY GREENS & SALADS', spendEur: 22000000, units: 35000000, suppliers: 15, skus: 60,  families: 20 },
  { year: 2026, quarter: null, category: 'PHF', subCategory: 'GREENHOUSE VEGETABLES', spendEur: 18000000, units: 28000000, suppliers: 12, skus: 40,  families: 15 },
  { year: 2026, quarter: null, category: 'DAI', subCategory: 'CHEESE',                spendEur: 12000000, units: 20000000, suppliers: 20, skus: 80,  families: 25 },
  { year: 2026, quarter: null, category: 'BAK', subCategory: 'BREAD',                 spendEur:  5000000, units:  8000000, suppliers: 10, skus: 30,  families: 10 },
  { year: 2026, quarter: null, category: 'SPI', subCategory: 'SPICES',                spendEur:  3000000, units: 12000000, suppliers: 8,  skus: 50,  families: 20 },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year     = parseInt(searchParams.get('year')    ?? '2026');
  const quarter  = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : null;
  const category = searchParams.get('category') ?? '';
  const markets  = searchParams.get('market')?.split(',').filter(Boolean) ?? [];

  const configured =
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_TOKEN &&
    process.env.DATABRICKS_WAREHOUSE_ID;

  if (!configured) {
    let rows = FALLBACK.filter(r => r.year === year);
    if (category) rows = rows.filter(r => r.category === category);
    return NextResponse.json(rows);
  }

  // Build a stable cache key before hitting Databricks
  const cacheKey = `overview:${year}:${quarter}:${category}:${[...markets].sort().join(',')}`;
  const cached = cacheGet<CategoryOverviewRow[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Data-Source': 'databricks-cache', 'X-Row-Count': String(cached.length) },
    });
  }

  try {
    // Range filter beats LIKE for Spark min/max stats (no full scan needed)
    const where: string[] = [
      `p.include_in_analysis = true`,
      `p.week >= '${year}-W01'`,
      `p.week <  '${year + 1}-W01'`,
      `p.sku_category IN ('PTN','DAI','BAK','PHF','DRY','SPI','CON','PRO')`,
    ];

    if (category) where.push(`p.sku_category = '${category}'`);

    if (markets.length) {
      const dbSet  = new Set(markets.flatMap(m => MARKET_TO_DB[m] ?? []));
      const dbList = [...dbSet].map(m => `'${m}'`).join(', ');
      if (dbList) where.push(`p.country_group IN (${dbList})`);
    }

    if (quarter !== null) {
      const [wMin, wMax] = QUARTER_WEEK_RANGES[quarter];
      // Direct string range — lets Spark use min/max file statistics (no per-row SUBSTRING)
      where.push(`p.week >= '${year}-${wMin}'`);
      where.push(`p.week <= '${year}-${wMax}'`);
    }

    // CTE optimisations:
    //  • Filter by culinary_sku_category when a category is selected → much smaller broadcast table
    //  • RLIKE runs once on the small dimension, not per-PO-row
    const cteFilter = category
      ? `AND culinary_sku_category = '${category}'`
      : `AND culinary_sku_category IN ('PTN','DAI','BAK','PHF','DRY','SPI','CON','PRO')`;

    const sql = `
      WITH canonical_skus AS (
        SELECT DISTINCT
          culinary_sku_code,
          culinary_sku_subcategory,
          ingredient_name
        FROM ${SKU_TABLE}
        WHERE culinary_sku_subcategory IS NOT NULL
          AND culinary_sku_subcategory != ''
          AND culinary_sku_subcategory NOT IN ('INVALID','NOT APPLICABLE','NOT_APPLICABLE')
          AND NOT culinary_sku_subcategory RLIKE '^(US|CA|GB|AU|NZ|DACH|DKSE|FR|IE|BENELUX|AUNZ)-.+'
          ${cteFilter}
      )
      SELECT
        p.sku_category                                                 AS category,
        s.culinary_sku_subcategory                                     AS subCategory,
        ROUND(SUM(p.item_total_price * (${FX_CASE})), 0)              AS spendEur,
        ROUND(SUM(p.item_quantity), 0)                                 AS units,
        APPROX_COUNT_DISTINCT(p.supplier_name)                         AS suppliers,
        APPROX_COUNT_DISTINCT(p.sku)                                   AS skus,
        APPROX_COUNT_DISTINCT(s.ingredient_name)                       AS families
      FROM ${PO_TABLE} p
      INNER JOIN canonical_skus s ON p.sku = s.culinary_sku_code
      WHERE ${where.join('\n        AND ')}
      GROUP BY p.sku_category, s.culinary_sku_subcategory
    `;

    const raw = await queryDatabricks<Record<string, string>>(sql);

    const rows: CategoryOverviewRow[] = raw
      .map(r => ({
        year,
        quarter,
        category:    r.category    ?? '',
        subCategory: r.subCategory ?? '',
        spendEur:    parseFloat(r.spendEur)  || 0,
        units:       parseFloat(r.units)     || 0,
        suppliers:   parseInt(r.suppliers)   || 0,
        skus:        parseInt(r.skus)        || 0,
        families:    parseInt(r.families)    || 0,
      }))
      .filter(r => r.category && r.subCategory)
      // Sort in TypeScript — saves a Spark sort pass
      .sort((a, b) => b.spendEur - a.spendEur);

    cacheSet(cacheKey, rows);
    return NextResponse.json(rows, {
      headers: {
        'X-Data-Source': 'databricks-po',
        'X-Row-Count':   String(rows.length),
      },
    });
  } catch (err) {
    console.error('[category-overview] Databricks error:', err);
    return NextResponse.json(FALLBACK, {
      headers: { 'X-Data-Source': 'static-fallback', 'X-Error': String(err) },
    });
  }
}
