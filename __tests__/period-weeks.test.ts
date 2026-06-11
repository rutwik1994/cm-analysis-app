import { describe, it, expect } from 'vitest';
import { getPeriodWeeks } from '../lib/period-weeks';

describe('getPeriodWeeks', () => {
  // ── Year prefix ────────────────────────────────────────────────────────────
  it('uses the correct year prefix for every period', () => {
    const result = getPeriodWeeks(2025);
    expect(result.h1![0]).toMatch(/^2025-/);
    expect(result.h1![1]).toMatch(/^2025-/);
    expect(result.q3![0]).toMatch(/^2025-/);
  });

  it('changes prefix when year changes', () => {
    expect(getPeriodWeeks(2022).q1![0]).toBe('2022-W01');
    expect(getPeriodWeeks(2024).q1![0]).toBe('2024-W01');
    expect(getPeriodWeeks(2026).q1![0]).toBe('2026-W01');
  });

  // ── full ───────────────────────────────────────────────────────────────────
  it('returns null for "full" (meaning no week filter)', () => {
    expect(getPeriodWeeks(2026).full).toBeNull();
  });

  // ── H1 / H2 — no gap, no overlap ──────────────────────────────────────────
  it('H1 spans W01–W26', () => {
    const { h1 } = getPeriodWeeks(2026);
    expect(h1).toEqual(['2026-W01', '2026-W26']);
  });

  it('H2 spans W27–W52', () => {
    const { h2 } = getPeriodWeeks(2026);
    expect(h2).toEqual(['2026-W27', '2026-W52']);
  });

  it('H1 end week + 1 = H2 start week (no gap)', () => {
    const { h1, h2 } = getPeriodWeeks(2026);
    const h1End   = parseInt(h1![1].split('-W')[1]);
    const h2Start = parseInt(h2![0].split('-W')[1]);
    expect(h2Start).toBe(h1End + 1);
  });

  // ── Quarters — contiguous and non-overlapping ─────────────────────────────
  it('Q1 spans W01–W13', () => {
    expect(getPeriodWeeks(2026).q1).toEqual(['2026-W01', '2026-W13']);
  });

  it('Q2 spans W14–W26', () => {
    expect(getPeriodWeeks(2026).q2).toEqual(['2026-W14', '2026-W26']);
  });

  it('Q3 spans W27–W39', () => {
    expect(getPeriodWeeks(2026).q3).toEqual(['2026-W27', '2026-W39']);
  });

  it('Q4 spans W40–W52', () => {
    expect(getPeriodWeeks(2026).q4).toEqual(['2026-W40', '2026-W52']);
  });

  it('quarters are contiguous (no gaps between them)', () => {
    const { q1, q2, q3, q4 } = getPeriodWeeks(2026);
    const endOf   = (r: [string, string]) => parseInt(r[1].split('-W')[1]);
    const startOf = (r: [string, string]) => parseInt(r[0].split('-W')[1]);
    expect(startOf(q2!)).toBe(endOf(q1!) + 1);
    expect(startOf(q3!)).toBe(endOf(q2!) + 1);
    expect(startOf(q4!)).toBe(endOf(q3!) + 1);
  });

  it('Q1+Q2 together equal H1', () => {
    const { q1, q2, h1 } = getPeriodWeeks(2026);
    expect(q1![0]).toBe(h1![0]);   // same start
    expect(q2![1]).toBe(h1![1]);   // same end
  });

  it('Q3+Q4 together equal H2', () => {
    const { q3, q4, h2 } = getPeriodWeeks(2026);
    expect(q3![0]).toBe(h2![0]);
    expect(q4![1]).toBe(h2![1]);
  });

  // ── Shape ─────────────────────────────────────────────────────────────────
  it('returns all 7 keys', () => {
    const keys = Object.keys(getPeriodWeeks(2026));
    expect(keys.sort()).toEqual(['full', 'h1', 'h2', 'q1', 'q2', 'q3', 'q4'].sort());
  });
});
