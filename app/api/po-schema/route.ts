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

    return NextResponse.json({
      table: TABLE,
      columns,
      sample,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
