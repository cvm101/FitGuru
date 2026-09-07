/**
 * Calendar dates (food logs, workout dates, heatmap cells) are stored as
 * YYYY-MM-DD and must be formatted in the user's own timezone.
 *
 * `toISOString()` converts to UTC first, which lands on the previous day for any
 * zone ahead of UTC — 00:00 IST is 18:30 UTC the day before — so it shifted the
 * whole activity heatmap and mis-dated anything logged before 05:30 IST.
 */
export function toLocalISODate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's calendar date in the user's timezone. */
export function todayDate(): string {
  return toLocalISODate();
}
