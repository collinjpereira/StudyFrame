/**
 * Calendar arithmetic, not +n*86400000 — adding milliseconds shifts an hour
 * across a DST boundary and puts one date in two weeks.
 */
export function addDays(date: Date, k: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + k);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** The Monday of week `weekNo`, counting week 1 as the week containing today. */
export function mondayOf(weekNo: number, today = new Date()): Date {
  const thisMonday = addDays(startOfDay(today), -((today.getDay() + 6) % 7));
  return addDays(thisMonday, (weekNo - 1) * 7);
}

/** Whole calendar days from today to an ISO date, rounded up. */
export function daysTo(isoDate: string, today = new Date()): number {
  if (!isoDate) return 0;
  const target = startOfDay(parseIsoDate(isoDate));
  const diff = target.getTime() - startOfDay(today).getTime();
  return Math.ceil(diff / 86400000);
}

/** Midday avoids an ISO date landing on the previous day in western timezones. */
export function parseIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}

export function toIsoDate(date: Date): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`;
}

/** Shorthand for the seed data and tests: an ISO date n days from today. */
export function isoIn(days: number): string {
  return toIsoDate(addDays(new Date(), days));
}

export function addMinutesToClock(hhmm: string, mins: number): string {
  const parts = (hhmm || "19:00").split(":");
  const total = (Number(parts[0]) || 19) * 60 + (Number(parts[1]) || 0) + Math.round(mins);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${z(Math.floor(total / 60) % 24)}:${z(total % 60)}`;
}
