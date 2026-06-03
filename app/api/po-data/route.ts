/**
 * GET /api/po-data
 *
 * Returns PORow[] from public_edw_business_mart_live.purchase_order__enriched
 * netValue is always returned in EUR using FX rates fetched on 2026-05-26 (ECB via Frankfurter).
 *
 * Real column mappings (confirmed via DESCRIBE TABLE 2026-05-26):
 *   order_number            → poNumber
 *   created_at              → poDate
 *   expected_arrival_date   → deliveryDate
 *   supplier_name           → supplier
 *   country_group           → market  (DACH / US / DKSE / BENELUXFR → BENELUX)
 *   sku_category            → category (PRO, PHF, BAK, DAI, CON, SPI, DRY)
 *   SUM(item_total_price)   → netValue  (converted to EUR)
 *   currency                → currency  (original, kept for reference)
 *   status                  → status  (INITIATED / APPROVED / SENT)
 *   week                    → week    (2026-W01)
 *   ordered_by              → hashed, not surfaced
 *
 * Query params (all optional):
 *   market   — DACH, US, DKSE, BENELUX, FR, GB, AU, NZ, IE, CA  (comma-separated)
 *   status   — INITIATED, APPROVED, SENT (comma-separated)
 *   period   — full (default) | h1 | h2 | q1 | q2 | q3 | q4
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryDatabricks } from '@/lib/databricks';
import { PO_ROWS } from '@/lib/po-data';

export const dynamic = 'force-dynamic';

/**
 * FX rates → EUR  (source: ECB via Frankfurter API, fetched 2026-05-26)
 * 1 unit of currency = X EUR
 * EUR itself = 1.0 (no conversion needed)
 */
const FX_TO_EUR: Record<string, number> = {
  EUR: 1.0,
  USD: 1 / 1.1634,   // 1 USD = 0.8596 EUR
  SEK: 1 / 10.8245,  // 1 SEK = 0.0924 EUR
  GBP: 1 / 0.86375,  // 1 GBP = 1.1577 EUR
  DKK: 1 / 7.4721,   // 1 DKK = 0.1338 EUR
  NOK: 1 / 10.772,   // 1 NOK = 0.0928 EUR
  AUD: 1 / 1.6236,   // 1 AUD = 0.6159 EUR
  NZD: 1 / 1.9913,   // 1 NZD = 0.5022 EUR
  CAD: 1 / 1.6069,   // 1 CAD = 0.6223 EUR
};

/** Convert a value in the given currency to EUR. Falls back 1:1 if unknown. */
function toEur(value: number, currency: string): number {
  const rate = FX_TO_EUR[currency.toUpperCase()] ?? 1;
  return Math.round(value * rate * 100) / 100;
}

/**
 * Inline SQL CASE for FX conversion used in market-aggregation query.
 * Matches the rates in FX_TO_EUR above so both paths are consistent.
 */
const FX_CASE_INLINE = `CASE currency
  WHEN 'EUR' THEN 1.0    WHEN 'USD' THEN 0.85960
  WHEN 'SEK' THEN 0.09238 WHEN 'GBP' THEN 1.15774
  WHEN 'DKK' THEN 0.13383 WHEN 'NOK' THEN 0.09283
  WHEN 'AUD' THEN 0.61588 WHEN 'NZD' THEN 0.50219
  WHEN 'CAD' THEN 0.62232 ELSE 1.0 END`;

const TABLE = 'public_edw_business_mart_live.purchase_order__enriched';

// App-facing market name → Databricks country_group value(s)
const MARKET_TO_DB: Record<string, string[]> = {
  DACH:    ['DACH'],
  US:      ['US'],
  DKSE:    ['DKSE'],
  BENELUX: ['BENELUX', 'BENELUXFR'],   // BENELUXFR = legacy combined value
  FR:      ['FR', 'FRANCE'],
  GB:      ['GB', 'UK'],
  AUNZ:    ['AUNZ', 'AU', 'NZ'],       // table uses AUNZ — AU/NZ are legacy values
  EU:      ['EU'],                      // EU hub market (new as of 2025)
  IE:      ['IE'],
  CA:      ['CA'],
  ES:      ['ES'],                      // Spain (small, emerging)
  IT:      ['IT'],                      // Italy (small, emerging)
};

// HF week ranges — built dynamically per year so the API works for any year
function getPeriodWeeks(year: number): Record<string, [string, string] | null> {
  const y = String(year);
  return {
    full: null,
    h1:   [`${y}-W01`, `${y}-W26`],
    h2:   [`${y}-W27`, `${y}-W52`],
    q1:   [`${y}-W01`, `${y}-W13`],
    q2:   [`${y}-W14`, `${y}-W26`],
    q3:   [`${y}-W27`, `${y}-W39`],
    q4:   [`${y}-W40`, `${y}-W52`],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const markets  = searchParams.get('market')?.split(',').filter(Boolean) ?? [];
  const statuses = searchParams.get('status')?.split(',').filter(Boolean) ?? [];
  const period   = (searchParams.get('period') ?? 'full').toLowerCase();
  // year param — defaults to 2026; clamp to known data range (2022–2026)
  const yearRaw  = parseInt(searchParams.get('year') ?? '2026', 10);
  const year     = isNaN(yearRaw) ? 2026 : Math.max(2022, Math.min(2026, yearRaw));

  const configured =
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_TOKEN &&
    process.env.DATABRICKS_WAREHOUSE_ID;

  if (!configured) {
    console.info('[po-data] Databricks not configured — using static fallback');
    // Compute market totals from static data so the shape matches the live path
    const staticMarketTotals: Record<string, number> = {};
    for (const r of PO_ROWS) {
      staticMarketTotals[r.market] = (staticMarketTotals[r.market] ?? 0) + r.netValue;
    }
    return NextResponse.json({ rows: PO_ROWS, marketTotals: staticMarketTotals });
  }

  try {
    const where: string[] = [
      `include_in_analysis = true`,
      `week >= '${year}-W01'`,   // range filter — lets Spark use min/max stats (faster than LIKE)
      `week <  '${year + 1}-W01'`,
      // Restrict to food ingredient categories only — excludes packaging, logistics, etc.
      `sku_category IN ('PTN','DAI','BAK','PHF','DRY','SPI','CON','PRO')`,
    ];

    if (markets.length) {
      const dbMarkets = markets
        .flatMap(m => MARKET_TO_DB[m] ?? [])
        .map(m => `'${m}'`)
        .join(', ');
      if (dbMarkets) where.push(`country_group IN (${dbMarkets})`);
    }

    if (statuses.length) {
      const sList = statuses.map(s => `'${s}'`).join(', ');
      where.push(`status IN (${sList})`);
    }

    const weekRange = getPeriodWeeks(year)[period] ?? null;
    if (weekRange) {
      where.push(`week >= '${weekRange[0]}'`);
      where.push(`week <= '${weekRange[1]}'`);
    }

    const MKT_CASE = `CASE country_group
          WHEN 'BENELUXFR' THEN 'BENELUX' WHEN 'BENELUX' THEN 'BENELUX'
          WHEN 'FR'        THEN 'FR'       WHEN 'FRANCE'  THEN 'FR'
          WHEN 'GB'        THEN 'GB'       WHEN 'UK'      THEN 'GB'
          WHEN 'AU'        THEN 'AUNZ'     WHEN 'NZ'      THEN 'AUNZ'
          WHEN 'AUNZ'      THEN 'AUNZ'
          ELSE country_group END`;

    const W = where.join(' AND ');

    // ── 1. Market totals (for bar chart) ─────────────────────────────────────
    const marketAggrSql = `
      SELECT ${MKT_CASE} AS market,
             ROUND(SUM(item_total_price * ${FX_CASE_INLINE}), 0) AS spendEur
      FROM ${TABLE} WHERE ${W}
      GROUP BY country_group`;

    // ── 2. Top 10 supplier totals (for supplier chart) ────────────────────────
    const supplierAggrSql = `
      SELECT supplier_name AS supplier,
             ROUND(SUM(item_total_price * ${FX_CASE_INLINE}), 0) AS spendEur
      FROM ${TABLE} WHERE ${W}
      GROUP BY supplier_name
      ORDER BY SUM(item_total_price) DESC
      LIMIT 10`;

    // ── 3. Monthly trend (for line chart) ─────────────────────────────────────
    const monthlyAggrSql = `
      SELECT DATE_FORMAT(MIN(created_at), 'yyyy-MM') AS month,
             ROUND(SUM(item_total_price * ${FX_CASE_INLINE}), 0) AS spendEur,
             COUNT(DISTINCT order_number) AS poCount
      FROM ${TABLE} WHERE ${W}
      GROUP BY DATE_FORMAT(created_at, 'yyyy-MM')
      ORDER BY month`;

    // ── 4. KPI totals (spend, PO count, by status) ────────────────────────────
    const kpiSql = `
      SELECT status,
             ROUND(SUM(item_total_price * ${FX_CASE_INLINE}), 0) AS spendEur,
             COUNT(DISTINCT order_number) AS poCount
      FROM ${TABLE} WHERE ${W}
      GROUP BY status`;

    // ── 5. Table rows — top 200 by value only (table shows top 50) ───────────
    const tableSql = `
      SELECT order_number AS poNumber,
             DATE_FORMAT(MIN(created_at), 'yyyy-MM-dd') AS poDate,
             DATE_FORMAT(MIN(expected_arrival_date), 'yyyy-MM-dd') AS deliveryDate,
             supplier_name AS supplier,
             ${MKT_CASE} AS market,
             sku_category AS category,
             ROUND(SUM(item_total_price * ${FX_CASE_INLINE}), 2) AS netValue,
             MAX(currency) AS currency,
             MAX(status) AS status,
             COUNT(*) AS lineItems,
             MAX(week) AS week
      FROM ${TABLE} WHERE ${W}
      GROUP BY order_number, supplier_name, country_group, sku_category
      ORDER BY SUM(item_total_price) DESC
      LIMIT 200`;

    const [rawMarkets, rawSuppliers, rawMonthly, rawKpis, rawRows] = await Promise.all([
      queryDatabricks<Record<string, string>>(marketAggrSql),
      queryDatabricks<Record<string, string>>(supplierAggrSql),
      queryDatabricks<Record<string, string>>(monthlyAggrSql),
      queryDatabricks<Record<string, string>>(kpiSql),
      queryDatabricks<Record<string, string>>(tableSql),
    ]);

    // Parse aggregations
    const marketTotals: Record<string, number> = {};
    for (const m of rawMarkets) {
      if (m.market) marketTotals[m.market] = parseFloat(m.spendEur) || 0;
    }

    const supplierTotals = rawSuppliers.map(r => ({
      supplier: r.supplier ?? '',
      spendEur: parseFloat(r.spendEur) || 0,
    }));

    const monthlyTotals = rawMonthly.map(r => ({
      month:   r.month ?? '',
      spendEur: parseFloat(r.spendEur) || 0,
      poCount: parseInt(r.poCount) || 0,
    }));

    const kpis: Record<string, number> = {};
    let totalSpend = 0, totalPOs = 0;
    for (const r of rawKpis) {
      const s = parseFloat(r.spendEur) || 0;
      const c = parseInt(r.poCount) || 0;
      kpis[`${r.status}_spend`] = s;
      kpis[`${r.status}_count`] = c;
      totalSpend += s;
      totalPOs   += c;
    }
    kpis['total_spend'] = totalSpend;
    kpis['total_pos']   = totalPOs;

    const rows = rawRows.map(r => ({
      poNumber:     r.poNumber     ?? '',
      poDate:       r.poDate       ?? '',
      deliveryDate: r.deliveryDate ?? '',
      supplier:     r.supplier     ?? '',
      market:       r.market       ?? '',
      category:     r.category     ?? '',
      netValue:     parseFloat(r.netValue) || 0,
      currency:     r.currency     ?? 'EUR',
      status:       (r.status as import('@/lib/po-data').POStatus) ?? 'INITIATED',
      lineItems:    parseInt(r.lineItems)   || 0,
      week:         r.week         ?? '',
    }));

    return NextResponse.json({ rows, marketTotals, supplierTotals, monthlyTotals, kpis }, {
      headers: {
        'X-Data-Source': 'databricks',
        'X-Row-Count':   String(rows.length),
      },
    });
  } catch (err) {
    console.error('[po-data] Databricks error — falling back to static data:', err);
    const staticMarketTotals: Record<string, number> = {};
    for (const r of PO_ROWS) {
      staticMarketTotals[r.market] = (staticMarketTotals[r.market] ?? 0) + r.netValue;
    }
    return NextResponse.json({ rows: PO_ROWS, marketTotals: staticMarketTotals }, {
      // Strip non-ASCII chars (e.g. em-dash) from error string — HTTP headers are ASCII-only
      headers: { 'X-Data-Source': 'static-fallback', 'X-Error': String(err).replace(/[^\x00-\x7F]/g, '-') },
    });
  }
}
