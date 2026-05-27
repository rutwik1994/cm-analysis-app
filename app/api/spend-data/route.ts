/**
 * GET /api/spend-data
 *
 * Returns live SpendRow[] from Databricks volume tracker.
 * Falls back to hardcoded static data if Databricks is not configured.
 *
 * Query params (all optional, comma-separated):
 *   market    — DACH, US, DKSE, BENELUX, FR, GB, AU, NZ, IE, CA
 *   category  — Grocery, Proteins, Bakery, Dairy, Convenience, Spices
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryDatabricks } from '@/lib/databricks';
import { ROWS, type SpendRow } from '@/lib/data';
import { lookupCategoryManager } from '@/lib/category-managers';

export const dynamic = 'force-dynamic';

// ── Simple in-memory TTL cache ────────────────────────────────────────────────
const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 5 * 60_000;
function cacheGet<T>(key: string): T | null {
  const e = _cache.get(key);
  return e && Date.now() - e.ts < CACHE_TTL ? (e.data as T) : null;
}
function cacheSet(key: string, data: unknown) {
  if (_cache.size > 100) _cache.clear();
  _cache.set(key, { ts: Date.now(), data });
}

const TABLE = 'public_scm_pr_tech_analytics.scm_procurement_tech_volume_tracker';

// App-facing market name → Databricks market column value(s)
// BENELUX and FR were historically combined as 'beneluxfr'; FR may also appear as 'fr'
const MARKET_TO_DB: Record<string, string[]> = {
  DACH:    ['dach'],
  US:      ['us'],
  DKSE:    ['dkse'],
  BENELUX: ['benelux', 'beneluxfr'],   // 'beneluxfr' = legacy combined value
  FR:      ['fr', 'france'],
  GB:      ['gb', 'uk'],
  AU:      ['au'],
  NZ:      ['nz'],
  IE:      ['ie'],
  CA:      ['ca'],
};

// Map app-facing category names → Databricks category codes
const CATEGORY_TO_DB: Record<string, string[]> = {
  Grocery:     ['PHF', 'PRO', 'DRY'],
  Proteins:    ['PTN'],
  Bakery:      ['BAK'],
  Dairy:       ['DAI'],
  Convenience: ['CON'],
  Spices:      ['SPI'],
};

// HF week ranges for period filtering (format: 2026W01 … 2026W52)
const PERIOD_WEEKS: Record<string, [string, string] | null> = {
  full: null,
  h1:   ['2026W01', '2026W26'],
  h2:   ['2026W27', '2026W52'],
  q1:   ['2026W01', '2026W13'],
  q2:   ['2026W14', '2026W26'],
  q3:   ['2026W27', '2026W39'],
  q4:   ['2026W40', '2026W52'],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const markets  = searchParams.get('market')?.split(',').filter(Boolean) ?? [];
  const category = searchParams.get('category') ?? '';
  const period   = (searchParams.get('period') ?? 'full').toLowerCase();

  const configured =
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_TOKEN &&
    process.env.DATABRICKS_WAREHOUSE_ID;

  if (!configured) {
    console.info('[spend-data] Databricks not configured — using static data');
    const staticSupplierTotals: Record<string, { actualSpend: number; awardedSpend: number }> = {};
    let filteredStatic = ROWS;
    if (markets.length) filteredStatic = filteredStatic.filter(r => markets.includes(r.market));
    if (category && CATEGORY_TO_DB[category]) filteredStatic = filteredStatic.filter(r => r.category === category);
    for (const r of filteredStatic) {
      if (!staticSupplierTotals[r.supplier]) staticSupplierTotals[r.supplier] = { actualSpend: 0, awardedSpend: 0 };
      staticSupplierTotals[r.supplier].actualSpend  = Math.max(staticSupplierTotals[r.supplier].actualSpend,  r.cumulativeActualSpendEur);
      staticSupplierTotals[r.supplier].awardedSpend = Math.max(staticSupplierTotals[r.supplier].awardedSpend, r.cumulativeAwardedSpendEur);
    }
    return NextResponse.json({ rows: filteredStatic, supplierTotals: staticSupplierTotals });
  }

  type SpendCachePayload = { rows: SpendRow[]; supplierTotals: Record<string, { actualSpend: number; awardedSpend: number }> };
  const cacheKey = `spend:${period}:${markets.sort().join(',')}:${category}`;
  const cached = cacheGet<SpendCachePayload>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Data-Source': 'databricks-cache', 'X-Row-Count': String(cached.rows?.length ?? 0) },
    });
  }

  try {
    // Build WHERE clauses using Databricks column values
    const where: string[] = [
      `hellofresh_year = 2026`,   // current contract year
    ];

    if (markets.length) {
      const dbMarkets = markets
        .flatMap((m) => MARKET_TO_DB[m] ?? [])
        .map((m) => `'${m}'`)
        .join(', ');
      if (dbMarkets) where.push(`market IN (${dbMarkets})`);
    }

    // Period filter — narrow to specific HF week range
    const weekRange = PERIOD_WEEKS[period] ?? null;
    if (weekRange) {
      where.push(`hellofresh_week >= '${weekRange[0]}'`);
      where.push(`hellofresh_week <= '${weekRange[1]}'`);
    }

    if (category && CATEGORY_TO_DB[category]) {
      const codes = CATEGORY_TO_DB[category].map((c) => `'${c}'`).join(', ');
      where.push(`category IN (${codes})`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const sql = `
      SELECT
        -- Market: map DB values → app-facing labels
        -- beneluxfr is the legacy combined value; fr/france are France-only
        CASE market
          WHEN 'beneluxfr' THEN 'BENELUX'
          WHEN 'benelux'   THEN 'BENELUX'
          WHEN 'fr'        THEN 'FR'
          WHEN 'france'    THEN 'FR'
          WHEN 'gb'        THEN 'GB'
          WHEN 'uk'        THEN 'GB'
          WHEN 'dach'      THEN 'DACH'
          WHEN 'us'        THEN 'US'
          WHEN 'dkse'      THEN 'DKSE'
          WHEN 'au'        THEN 'AU'
          WHEN 'nz'        THEN 'NZ'
          WHEN 'ie'        THEN 'IE'
          WHEN 'ca'        THEN 'CA'
          ELSE UPPER(market)
        END AS market,

        -- Category: map codes to friendly names
        CASE category
          WHEN 'PTN' THEN 'Proteins'
          WHEN 'BAK' THEN 'Bakery'
          WHEN 'DAI' THEN 'Dairy'
          WHEN 'CON' THEN 'Convenience'
          WHEN 'SPI' THEN 'Spices'
          ELSE 'Grocery'
        END AS category,

        sub_category                                    AS subCategory,
        sku                                             AS skuCode,
        sku_name                                        AS skuName,
        global_ingredient_name                          AS globalIngredient,
        supplier,
        tender_start                                    AS contractStart,
        tender_end                                      AS contractEnd,
        MAX(hellofresh_week)                            AS contractWeek,
        MAX(actuals_status)                             AS actualsStatus,

        -- Adherence: use RT version where available
        ROUND(AVG(COALESCE(
          actual_vs_awarded_units_rt_perc,
          actual_vs_awarded_units_perc
        )) * 100, 1)                                    AS adherencePct,

        ROUND(AVG(ordered_units), 0)                    AS weeklyActualQty,
        ROUND(AVG(avg_static_price_eur), 4)             AS avgStaticPriceEur,

        -- Cumulative spend across all weeks in tender
        ROUND(SUM(actual_spend_eur), 0)                 AS cumulativeActualSpendEur,
        ROUND(SUM(budget_spend_eur), 0)                 AS cumulativeAwardedSpendEur,

        -- Final contract value: budget spend paced to full tender length
        ROUND(
          SUM(budget_spend_eur) * MAX(weeks_tender) / NULLIF(COUNT(*), 0)
        , 0)                                            AS finalContractValueEur,

        ROUND(AVG(spend_difference_percentage), 1)      AS spendDiffPct,
        MAX(budget_risk)                                AS budgetRisk

      FROM ${TABLE}
      ${whereClause}
      GROUP BY
        market, category, sub_category,
        sku, sku_name, global_ingredient_name,
        supplier, tender_start, tender_end
      ORDER BY cumulativeActualSpendEur DESC
      LIMIT 5000
    `;

    const supplierAggrSql = `
      SELECT
        supplier,
        ROUND(SUM(actual_spend_eur), 0)  AS totalActualSpendEur,
        ROUND(SUM(budget_spend_eur), 0)  AS totalAwardedSpendEur
      FROM ${TABLE}
      ${whereClause}
      GROUP BY supplier
      ORDER BY SUM(actual_spend_eur) DESC
    `;

    const [rawRows, rawSuppliers] = await Promise.all([
      queryDatabricks<Record<string, string>>(sql),
      queryDatabricks<Record<string, string>>(supplierAggrSql),
    ]);

    // Parse numeric fields (Databricks returns everything as strings via JSON_ARRAY)
    const rows = rawRows.map((r) => ({
      category:                  r.category               ?? '',
      subCategory:               r.subCategory            ?? '',
      market:                    r.market                 ?? '',
      skuCode:                   r.skuCode                ?? '',
      globalIngredient:          r.globalIngredient       ?? '',
      skuName:                   r.skuName                ?? '',
      supplier:                  r.supplier               ?? '',
      categoryManager:           lookupCategoryManager(r.subCategory ?? ''),
      contractStart:             r.contractStart          ?? '',
      contractEnd:               r.contractEnd            ?? '',
      contractWeek:              r.contractWeek           ?? '',
      actualsStatus:             (r.actualsStatus as 'Historical' | 'Forecast') ?? 'Historical',
      adherencePct:              parseFloat(r.adherencePct)              || 0,
      weeklyActualQty:           parseFloat(r.weeklyActualQty)           || 0,
      avgStaticPriceEur:         parseFloat(r.avgStaticPriceEur)         || 0,
      cumulativeActualSpendEur:  parseFloat(r.cumulativeActualSpendEur)  || 0,
      cumulativeAwardedSpendEur: parseFloat(r.cumulativeAwardedSpendEur) || 0,
      finalContractValueEur:     parseFloat(r.finalContractValueEur)     || 0,
      spendDiffPct:              parseFloat(r.spendDiffPct)              || 0,
      budgetRisk:                r.budgetRisk             ?? 'Low',
    }));

    const supplierTotals: Record<string, { actualSpend: number; awardedSpend: number }> = {};
    for (const s of rawSuppliers) {
      if (s.supplier) {
        supplierTotals[s.supplier] = {
          actualSpend:  parseFloat(s.totalActualSpendEur)  || 0,
          awardedSpend: parseFloat(s.totalAwardedSpendEur) || 0,
        };
      }
    }

    cacheSet(cacheKey, { rows, supplierTotals });
    return NextResponse.json({ rows, supplierTotals }, {
      headers: {
        'X-Data-Source': 'databricks',
        'X-Row-Count':   String(rows.length),
      },
    });
  } catch (err) {
    console.error('[spend-data] Databricks error — falling back to static data:', err);
    const errorSupplierTotals: Record<string, { actualSpend: number; awardedSpend: number }> = {};
    for (const r of ROWS) {
      if (!errorSupplierTotals[r.supplier]) errorSupplierTotals[r.supplier] = { actualSpend: 0, awardedSpend: 0 };
      errorSupplierTotals[r.supplier].actualSpend  = Math.max(errorSupplierTotals[r.supplier].actualSpend,  r.cumulativeActualSpendEur);
      errorSupplierTotals[r.supplier].awardedSpend = Math.max(errorSupplierTotals[r.supplier].awardedSpend, r.cumulativeAwardedSpendEur);
    }
    return NextResponse.json({ rows: ROWS, supplierTotals: errorSupplierTotals }, {
      headers: {
        'X-Data-Source': 'static-fallback',
        'X-Error':       String(err),
      },
    });
  }
}
