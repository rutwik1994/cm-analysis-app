/**
 * GET /api/category-suppliers
 *
 * Returns top 10 suppliers by spend for the given category + filters.
 * Same CTE + INNER JOIN pattern as /api/category-overview for consistency.
 *
 * Query params (all optional):
 *   year        — 2026 (default: 2026)
 *   quarter     — 1|2|3|4  (omit for full-year)
 *   category    — PTN|DAI|BAK|PHF|DRY|SPI|CON|PRO
 *   market      — comma-separated market codes
 *   subCategory — comma-separated sub-category names (canonical, e.g. "POULTRY,BOVINE")
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

const QUARTER_WEEK_RANGES: Record<number, [string, string]> = {
  1: ['W01', 'W13'],
  2: ['W14', 'W26'],
  3: ['W27', 'W39'],
  4: ['W40', 'W52'],
};

const FX_CASE = `CASE p.currency
  WHEN 'EUR' THEN 1.0    WHEN 'USD' THEN 0.85960
  WHEN 'SEK' THEN 0.09238 WHEN 'GBP' THEN 1.15774
  WHEN 'DKK' THEN 0.13383 WHEN 'NOK' THEN 0.09283
  WHEN 'AUD' THEN 0.61588 WHEN 'NZD' THEN 0.50219
  WHEN 'CAD' THEN 0.62232 ELSE 1.0 END`;

export interface CategorySupplierRow {
  supplier: string;
  spendEur: number;
  units:    number;
  skus:     number;
}

const FALLBACK: CategorySupplierRow[] = [
  { supplier: 'Supplier A', spendEur: 18000000, units: 4200000, skus: 12 },
  { supplier: 'Supplier B', spendEur: 14000000, units: 3100000, skus: 8  },
  { supplier: 'Supplier C', spendEur: 11000000, units: 2800000, skus: 15 },
  { supplier: 'Supplier D', spendEur:  9000000, units: 2100000, skus: 6  },
  { supplier: 'Supplier E', spendEur:  7500000, units: 1800000, skus: 9  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year        = parseInt(searchParams.get('year')    ?? '2026');
  const quarter     = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : null;
  const category    = searchParams.get('category') ?? '';
  const markets     = searchParams.get('market')?.split(',').filter(Boolean)      ?? [];
  const subCats     = searchParams.get('subCategory')?.split(',').filter(Boolean) ?? [];

  const configured =
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_TOKEN &&
    process.env.DATABRICKS_WAREHOUSE_ID;

  if (!configured) return NextResponse.json(FALLBACK);

  // Build a stable cache key before hitting Databricks
  const cacheKey = `suppliers:${year}:${quarter}:${category}:${[...markets].sort().join(',')}:${[...subCats].sort().join(',')}`;
  const cached = cacheGet<CategorySupplierRow[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Data-Source': 'databricks-cache', 'X-Row-Count': String(cached.length) },
    });
  }

  try {
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

    // Sub-category filter — escape single quotes
    if (subCats.length) {
      const scList = subCats.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
      where.push(`s.culinary_sku_subcategory IN (${scList})`);
    }

    // Filter CTE to the selected category so the broadcast join table is minimal
    const cteFilter = category
      ? `AND culinary_sku_category = '${category}'`
      : `AND culinary_sku_category IN ('PTN','DAI','BAK','PHF','DRY','SPI','CON','PRO')`;

    const sql = `
      WITH canonical_skus AS (
        SELECT DISTINCT culinary_sku_code, culinary_sku_subcategory
        FROM ${SKU_TABLE}
        WHERE culinary_sku_subcategory IS NOT NULL
          AND culinary_sku_subcategory != ''
          AND culinary_sku_subcategory NOT IN ('INVALID','NOT APPLICABLE','NOT_APPLICABLE')
          AND NOT culinary_sku_subcategory RLIKE '^(US|CA|GB|AU|NZ|DACH|DKSE|FR|IE|BENELUX|AUNZ)-.+'
          ${cteFilter}
      )
      SELECT
        p.supplier_name                                              AS supplier,
        ROUND(SUM(p.item_total_price * (${FX_CASE})), 0)            AS spendEur,
        ROUND(SUM(p.item_quantity), 0)                               AS units,
        APPROX_COUNT_DISTINCT(p.sku)                                 AS skus
      FROM ${PO_TABLE} p
      INNER JOIN canonical_skus s ON p.sku = s.culinary_sku_code
      WHERE ${where.join('\n        AND ')}
      GROUP BY p.supplier_name
      ORDER BY SUM(p.item_total_price) DESC
      LIMIT 10
    `;

    const raw = await queryDatabricks<Record<string, string>>(sql);

    const rows: CategorySupplierRow[] = raw
      .map(r => ({
        supplier: r.supplier ?? '',
        spendEur: parseFloat(r.spendEur) || 0,
        units:    parseFloat(r.units)    || 0,
        skus:     parseInt(r.skus)       || 0,
      }))
      .filter(r => r.supplier);

    cacheSet(cacheKey, rows);
    return NextResponse.json(rows, {
      headers: { 'X-Data-Source': 'databricks-po', 'X-Row-Count': String(rows.length) },
    });
  } catch (err) {
    console.error('[category-suppliers] error:', err);
    return NextResponse.json(FALLBACK, {
      headers: { 'X-Data-Source': 'static-fallback', 'X-Error': String(err) },
    });
  }
}
