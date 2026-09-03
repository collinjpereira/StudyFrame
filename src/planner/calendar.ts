import type { Workspace } from "../store/types";
import { buildDayPlan } from "./dayPlan";
import { weekCount } from "./derive";
import { addMinutesToClock, parseIsoDate } from "./dates";
import { hm } from "../lib/format";

/** Floating local time — no Z, no TZID — so events land at the same wall-clock hour anywhere. */
function stamp(date: Date, hhmm: string): string {
  const parts = hhmm.split(":");
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(parts[0]) || 19,
    Number(parts[1]) || 0,
  );
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}T${z(d.getHours())}${z(d.getMinutes())}00`;
}

function esc(text: string): string {
  return String(text).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/**
 * One VEVENT per scheduled study day plus an all-day event on the exam date.
 * Deliberately free of any API: this imports into Google Calendar, Outlook and
 * Apple Calendar without an account.
 */
export function buildIcs(ws: Workspace, liveLectureId: string | null = null): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudyFrame//Study plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(ws.name)}`,
  ];
  const now = stamp(new Date(), "09:00");
  const start = ws.startTime || "19:00";
  let n = 0;

  for (let week = 1; week <= weekCount(ws); week++) {
    const plan = buildDayPlan(ws, week, liveLectureId);
    for (const cell of plan.cells) {
      if (!cell.items.length) continue;
      const mins = cell.items.reduce((a, it) => a + it.l.mins, 0);
      n++;
      lines.push(
        "BEGIN:VEVENT",
        `UID:sf-${ws.id}-w${week}-${cell.dow}-${n}@studyframe`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(cell.date, start)}`,
        `DTEND:${stamp(cell.date, addMinutesToClock(start, mins))}`,
        `SUMMARY:${esc(`${ws.name} · ${hm(mins)}`)}`,
        `DESCRIPTION:${esc(
          cell.items.map((it) => `• ${it.l.title} (${it.l.mins}m) — ${it.c.title}`).join("\n"),
        )}`,
        "END:VEVENT",
      );
    }
  }

  if (ws.examDate) {
    const d = parseIsoDate(ws.examDate);
    const z = (x: number) => String(x).padStart(2, "0");
    lines.push(
      "BEGIN:VEVENT",
      `UID:sf-${ws.id}-exam@studyframe`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}`,
      `SUMMARY:${esc(`${ws.name} — exam day`)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * A prefilled Google Calendar event for one day. Also free and keyless — the
 * Calendar API is free too, but it needs an OAuth app and a sign-in, which is
 * only worth it if two-way sync is added later.
 */
export function googleCalendarUrl(
  ws: Workspace,
  date: Date,
  items: { title: string; mins: number; course: string }[],
): string {
  const mins = items.reduce((a, it) => a + it.mins, 0);
  const start = ws.startTime || "19:00";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${ws.name} · ${hm(mins)}`,
    dates: `${stamp(date, start)}/${stamp(date, addMinutesToClock(start, mins))}`,
    ctz: tz,
    details: items.map((it) => `• ${it.title} (${it.mins}m) — ${it.course}`).join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
