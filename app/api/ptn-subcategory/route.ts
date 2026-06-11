import { NextResponse } from 'next/server';
import { queryDatabricks } from '@/lib/databricks';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await queryDatabricks<{
      hellofresh_week: string;
      currency_name: string;
      weekly_to_eur: string;
    }>(
      `SELECT hellofresh_week, currency_name, weekly_to_eur
       FROM private_ops_dap_intermediate_live.ops_dap_cogs_lucanet_exchange_rate_enriched_ow
       WHERE hellofresh_week >= '2026-W14'
         AND hellofresh_week <= '2026-W26'
         AND currency_name IN ('GBP','SEK','AUD','NZD','DKK','NOK','CHF','USD','EUR')
       ORDER BY currency_name, hellofresh_week`
    );
    return NextResponse.json({ rows, rowCount: rows.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
