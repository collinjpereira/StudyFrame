import type { Course, Lecture, Section, Workspace } from "../store/types";
import { addDays, mondayOf, startOfDay } from "./dates";
import { flatten, studyDays } from "./derive";
import { DOW_SHORT } from "../lib/format";

export interface DayItem {
  l: Lecture;
  s: Section;
  c: Course;
  /** Anchored to this day by a completion stamp or the running clock — never moved. */
  fixed: boolean;
  /** On the clock right now. */
  live?: boolean;
  /** The day this slipped from, e.g. "Mon". Always the original, not the last hop. */
  carried?: string;
}

export interface DayCell {
  date: Date;
  dow: number;
  study: boolean;
  items: DayItem[];
}

export interface DayPlan {
  cells: DayCell[];
  perDay: number;
  monday: Date;
  /** Distinct lectures carried forward, not the number of hops they made. */
  rolled: number;
}

/**
 * The day grid is a record of what happened, not a fixed plan: finished work
 * sticks to the day it was finished, and anything left on a past day rolls
 * forward onto the next study day.
 */
export function buildDayPlan(
  ws: Workspace,
  weekNo: number,
  liveLectureId: string | null = null,
  today = new Date(),
): DayPlan {
  const days = studyDays(ws);
  const monday = mondayOf(weekNo, today);
  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    cells.push({ date, dow: date.getDay(), study: days.includes(date.getDay()), items: [] });
  }

  const byDay = new Map<string, DayCell>();
  for (const c of cells) byDay.set(c.date.toDateString(), c);
  const todayKey = today.toDateString();

  // Completed work anchors to the day it was finished, even if its section
  // belongs to another week. The lecture on the clock anchors to today.
  const anchored = new Set<string>();
  for (const x of flatten(ws)) {
    const stamp = ws.doneAt[x.l.id];
    const key = stamp ? new Date(stamp).toDateString() : x.l.id === liveLectureId ? todayKey : null;
    if (!key) continue;
    const cell = byDay.get(key);
    if (!cell) continue;
    cell.items.push({
      l: x.l,
      s: x.s,
      c: x.c,
      fixed: true,
      live: x.l.id === liveLectureId && !x.l.done,
    });
    anchored.add(x.l.id);
  }

  const outstanding: DayItem[] = [];
  const doneUnstamped: DayItem[] = [];
  for (const c of ws.courses) {
    for (const s of c.sections) {
      if (s.week !== weekNo) continue;
      for (const l of s.lectures) {
        if (anchored.has(l.id)) continue;
        (l.done ? doneUnstamped : outstanding).push({ l, s, c, fixed: l.done });
      }
    }
  }

  const perDay = (ws.hoursPerWeek * 60) / Math.max(1, days.length);
  const studyCells = cells.filter((c) => c.study);
  const load = (c: DayCell) => c.items.reduce((a, it) => a + it.l.mins, 0);

  // Lectures ticked off before StudyFrame tracked dates still belong on the
  // calendar — show them on this week's first study day.
  if (doneUnstamped.length && studyCells.length) {
    studyCells[0].items.push(...doneUnstamped);
  }

  // Outstanding work keeps its own planned day — finishing Tuesday's lectures
  // early moves those to Monday, it doesn't drag the rest of Tuesday forward.
  // Anchored minutes count toward the load, so a day already worked isn't piled on.
  let i = 0;
  let used = studyCells.length ? load(studyCells[0]) : 0;
  for (const it of outstanding) {
    if (!studyCells.length) break;
    if (used > 0 && used + it.l.mins > perDay * 1.2 && i < studyCells.length - 1) {
      i++;
      used = load(studyCells[i]);
    }
    studyCells[i].items.push(it);
    used += it.l.mins;
  }

  // A day that has been and gone can't hold unfinished work. Keep sweeping
  // forward so a Monday leftover can reach Wednesday.
  const carried = new Set<string>();
  const midnight = startOfDay(today);
  for (let k = 0; k < studyCells.length - 1; k++) {
    const cell = studyCells[k];
    if (cell.date.getTime() >= midnight.getTime()) break;
    const left = cell.items.filter((it) => !it.fixed);
    if (!left.length) continue;
    cell.items = cell.items.filter((it) => it.fixed);
    const from = DOW_SHORT[cell.dow];
    for (const it of left) {
      it.carried = it.carried || from;
      carried.add(it.l.id);
    }
    // Carried work goes to the front of the next study day, not the back.
    studyCells[k + 1].items = left.concat(studyCells[k + 1].items);
  }

  return { cells, perDay, monday, rolled: carried.size };
}

export function todayCell(plan: DayPlan, today = new Date()): DayCell | undefined {
  return plan.cells.find((c) => c.date.toDateString() === today.toDateString());
}
