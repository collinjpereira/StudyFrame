/** Every count that can be 1 goes through here — "1 lectures" is a bug. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Durations in minutes, as shown throughout: 45m, 1.4h. */
export function hm(mins: number): string {
  return mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${Math.round(mins)}m`;
}

/** Session durations, which are stored in seconds: 45s, 12m, 1.4h. */
export function dur(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

/** Running clocks: 4:12, or 1:04:12 once past an hour. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const z = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${z(m)}:${z(sec)}` : `${m}:${z(sec)}`;
}

export function initials(name: string): string {
  return name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function short(text: string, max = 32): string {
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthDay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** "Aug 31–Sep 6" — the month is repeated only when the range crosses one. */
export function dateRange(start: Date, end: Date): string {
  const tail = start.getMonth() === end.getMonth() ? String(end.getDate()) : monthDay(end);
  return `${monthDay(start)}–${tail}`;
}

export const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
