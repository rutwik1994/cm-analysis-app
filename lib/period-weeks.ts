/**
 * Returns ISO-week range strings for each named period within a given year.
 * `null` means "no week filter" (i.e. the full year).
 */
export function getPeriodWeeks(
  year: number
): Record<string, [string, string] | null> {
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
