/**
 * GET /api/po-schema
 *
 * Returns column names + types for the PO enriched table.
 * Hit this locally (on HF VPN) to inspect the schema before building the page.
 */

import { NextResponse } from 'next/server';
import { queryDatabricks } from '@/lib/databricks';

export const dynamic = 'force-dynamic';

const TABLE = 'public_edw_business_mart_live.purchase_order__enriched';

export async function GET() {
  const configured =
    process.env.DATABRICKS_HOST &&
    process.env.DATABRICKS_TOKEN &&
    process.env.DATABRICKS_WAREHOUSE_ID;

  if (!configured) {
    return NextResponse.json({ error: 'Databricks not configured' }, { status: 503 });
  }

  try {
    // 1. Column list with types
    const columns = await queryDatabricks<{ col_name: string; data_type: string; comment: string }>(
      `DESCRIBE TABLE ${TABLE}`
    );

    // 2. One sample row so we can see real values
    const sample = await queryDatabricks<Record<string, unknown>>(
      `SELECT * FROM ${TABLE} LIMIT 3`
    );

    // 3. True week range in the table (no year filter — tells us how far back data goes)
    const weekRange = await queryDatabricks<{ min_week: string; max_week: string; total_rows: string }>(
      `SELECT MIN(week) AS min_week, MAX(week) AS max_week, COUNT(*) AS total_rows
       FROM ${TABLE}
       WHERE include_in_analysis = true`
    );

    // 4. Row count per year (to understand coverage)
    const yearBreakdown = await queryDatabricks<{ year: string; row_count: string; po_count: string }>(
      `SELECT SUBSTRING(week, 1, 4) AS year, COUNT(*) AS row_count, COUNT(DISTINCT order_number) AS po_count
       FROM ${TABLE}
       WHERE include_in_analysis = true
       GROUP BY SUBSTRING(week, 1, 4)
       ORDER BY year`
    );

    return NextResponse.json({
      table: TABLE,
      weekRange: weekRange[0] ?? null,
      yearBreakdown,
      columns,
      sample,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
