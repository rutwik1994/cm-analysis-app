/**
 * GET /api/gdrive-ptn-data
 *
 * Serves pre-processed GDrive data (all 8 food categories, 2026) as PORow[].
 * Source: OT_export_*_20260503 folder, aggregated at market×week×supplier×subcat grain.
 * Markets: AUNZ · BENELUX · DACH · DKSE · EU · FR · GB · IE
 * FX: Lucanet weekly rates (ops_dap_cogs_lucanet_exchange_rate_enriched_ow)
 *
 * Query params (all optional):
 *   period   — full | h1 | h2 | q1 | q2 | q3 | q4
 *   market   — comma-separated market filter
 *   category — PTN | DAI | BAK | PHF | DRY | SPI | CON | PRO
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PORow, POStatus } from '@/lib/po-data';

export const dynamic = 'force-dynamic';

function inPeriod(week: string, period: string): boolean {
  const w = parseInt(week.split('-W')[1]);
  switch (period) {
    case 'h1': return w >= 1  && w <= 26;
    case 'h2': return w >= 27 && w <= 52;
    case 'q1': return w >= 1  && w <= 13;
    case 'q2': return w >= 14 && w <= 26;
    case 'q3': return w >= 27 && w <= 39;
    case 'q4': return w >= 40 && w <= 52;
    default:   return true;
  }
}

type GDRow = {
  yr: string; mkt: string; wk: string; sup: string;
  sub: string; cat: string;
  eur: number; qty: number; l: number;
};

let _cache: GDRow[] | null = null;

function load(): GDRow[] {
  if (_cache) return _cache;
  // Read directly from the filesystem — avoids self-HTTP-fetch that fails on Vercel
  const filePath = join(process.cwd(), 'public', 'data', 'gdrive-all-2026.json');
  _cache = JSON.parse(readFileSync(filePath, 'utf8'));
  return _cache!;
}

function weekToDate(week: string, offsetDays = 0): string {
  const [yr, w] = week.split('-W').map(Number);
  const jan4     = new Date(yr, 0, 4);
  const dow      = jan4.getDay() || 7;
  const monday   = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (w - 1) * 7 + offsetDays);
  return monday.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const sp        = new URL(req.url).searchParams;
  const period    = sp.get('period') ?? 'full';
  const markets   = sp.get('market')?.split(',').filter(Boolean) ?? [];
  const catFilter = sp.get('category') ?? '';
  const yearParam = sp.get('year') ?? '2026';

  try {
    const raw = load();

    const filtered = raw.filter(r => {
      if (r.yr !== yearParam) return false;
      if (!inPeriod(r.wk, period)) return false;
      if (markets.length && !markets.includes(r.mkt)) return false;
      if (catFilter && r.cat !== catFilter) return false;
      return true;
    });

    // Aggregate by supplier × market × week × category (already pre-aggregated)
    let idx = 1;
    const rows: PORow[] = filtered
      .sort((a, b) => b.eur - a.eur)
      .map(r => ({
        poNumber:     `GD-${r.mkt}-${r.wk}-${String(idx++).padStart(5,'0')}`,
        poDate:       weekToDate(r.wk),
        deliveryDate: weekToDate(r.wk, 7),
        supplier:     r.sup,
        market:       r.mkt,
        category:     r.cat,
        netValue:     Math.round(r.eur * 100) / 100,
        currency:     'EUR',
        status:       'SENT' as POStatus,
        lineItems:    r.l,
        week:         r.wk,
      }));

    // Server-side market totals
    const marketTotals: Record<string, number> = {};
    for (const r of rows) {
      marketTotals[r.market] = (marketTotals[r.market] ?? 0) + r.netValue;
    }

    return NextResponse.json({ rows, marketTotals }, {
      headers: {
        'X-Data-Source': 'gdrive',
        'X-Row-Count':   String(rows.length),
        'X-Period':      period,
        'X-Categories':  '8',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
