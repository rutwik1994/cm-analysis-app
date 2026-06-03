/**
 * GET /api/gdrive-ptn-data
 *
 * Serves pre-processed GDrive PTN data (OT_export_PTN_20260503) as PORow[].
 * Data covers markets: AUNZ · BENELUX · DACH · DKSE · EU · FR · GB · IE
 * Category: PTN only | FX: Lucanet weekly rates | Period: 2026
 *
 * Query params:
 *   period  — full | h1 | h2 | q1 | q2 | q3 | q4  (default: full)
 *   market  — comma-separated market filter
 *   sub     — subcategory filter (poultry | bovine | finfish | swine | sheep | crustacea | plant based | game)
 */
import { NextRequest, NextResponse } from 'next/server';
import type { PORow } from '@/lib/po-data';

export const dynamic = 'force-dynamic';

// HF week → period mapping
function inPeriod(week: string, period: string): boolean {
  const w = parseInt(week.split('-W')[1]);
  switch (period) {
    case 'h1': return w >= 1  && w <= 26;
    case 'h2': return w >= 27 && w <= 52;
    case 'q1': return w >= 1  && w <= 13;
    case 'q2': return w >= 14 && w <= 26;
    case 'q3': return w >= 27 && w <= 39;
    case 'q4': return w >= 40 && w <= 52;
    default:   return true; // full
  }
}

// Subcategory → app display label (for category field mapping)
const SUB_TO_LABEL: Record<string, string> = {
  poultry:      'PTN', bovine:       'PTN', finfish:    'PTN',
  swine:        'PTN', sheep:        'PTN', crustacea:  'PTN',
  'plant based':'PTN', game:         'PTN', other:      'PTN',
};

// Subcategory → friendly label for display
export const SUB_LABEL: Record<string, string> = {
  poultry:      'Poultry',
  bovine:       'Bovine',
  finfish:      'Finfish',
  swine:        'Swine',
  sheep:        'Sheep',
  crustacea:    'Seafood / Crustacean',
  'plant based':'Plant Based',
  game:         'Game',
  other:        'Other',
};

type GDriveRow = {
  market: string; week: string; supplier: string;
  sub: string; eur: number; qty: number; lines: number;
};

let cached: GDriveRow[] | null = null;

async function loadData(): Promise<GDriveRow[]> {
  if (cached) return cached;
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/data/gdrive-ptn-2026.json`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  cached = await res.json();
  return cached!;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period  = searchParams.get('period') ?? 'full';
  const markets = searchParams.get('market')?.split(',').filter(Boolean) ?? [];
  const subFilter = searchParams.get('sub') ?? '';

  try {
    const raw = await loadData();

    const filtered = raw.filter(r => {
      if (!inPeriod(r.week, period)) return false;
      if (markets.length && !markets.includes(r.market)) return false;
      if (subFilter && r.sub !== subFilter) return false;
      return true;
    });

    // Aggregate by supplier × market × week → synthetic PORow
    const agg = new Map<string, {
      market: string; week: string; supplier: string; sub: string;
      spend: number; qty: number; lines: number;
    }>();

    for (const r of filtered) {
      const key = `${r.supplier}|${r.market}|${r.week}|${r.sub}`;
      const existing = agg.get(key);
      if (existing) {
        existing.spend += r.eur;
        existing.qty   += r.qty;
        existing.lines += r.lines;
      } else {
        agg.set(key, { market: r.market, week: r.week, supplier: r.supplier,
          sub: r.sub, spend: r.eur, qty: r.qty, lines: r.lines });
      }
    }

    // Convert to PORow format
    let idx = 1;
    const rows: PORow[] = Array.from(agg.values())
      .sort((a, b) => b.spend - a.spend)
      .map(r => ({
        poNumber:     `GD-${r.market}-${r.week}-${String(idx++).padStart(5,'0')}`,
        poDate:       weekToDate(r.week),
        deliveryDate: weekToDate(r.week, 7),
        supplier:     r.supplier,
        market:       r.market,
        category:     'PTN',
        netValue:     Math.round(r.spend * 100) / 100,
        currency:     'EUR',
        status:       'SENT' as const,
        lineItems:    r.lines,
        week:         r.week,
      }));

    // Market totals for bar chart
    const marketTotals: Record<string, number> = {};
    for (const r of rows) {
      marketTotals[r.market] = (marketTotals[r.market] ?? 0) + r.netValue;
    }

    return NextResponse.json({ rows, marketTotals }, {
      headers: {
        'X-Data-Source': 'gdrive',
        'X-Row-Count':   String(rows.length),
        'X-Category':    'PTN',
        'X-Period':      period,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** Convert HF week string (2026-W14) to approximate YYYY-MM-DD */
function weekToDate(week: string, offsetDays = 0): string {
  const [year, w] = week.split('-W').map(Number);
  // ISO week 1 = week containing Jan 4
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (w - 1) * 7 + offsetDays);
  return monday.toISOString().slice(0, 10);
}
