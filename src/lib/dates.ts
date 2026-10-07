/** ISO 8601 calendar date (YYYY-MM-DD), the site's one date format. Dates are taken in UTC. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
