import type { Course, FlatLecture, Section, Workspace } from "../store/types";
import { daysTo } from "./dates";

export function flatten(ws: Workspace): FlatLecture[] {
  const out: FlatLecture[] = [];
  for (const c of ws.courses) {
    for (const s of c.sections) {
      for (const l of s.lectures) out.push({ l, s, c });
    }
  }
  return out;
}

export function sectionMins(s: Section): number {
  return s.lectures.reduce((a, l) => a + l.mins, 0);
}

export function sectionRemaining(s: Section): number {
  return s.lectures.filter((l) => !l.done).reduce((a, l) => a + l.mins, 0);
}

/** Progress is derived from lecture completion; storing it invites drift. */
export function coursePct(c: Course): number {
  const all = c.sections.flatMap((s) => s.lectures);
  return all.length ? Math.round((all.filter((l) => l.done).length / all.length) * 100) : 0;
}

export function workspacePct(ws: Workspace): number {
  const all = flatten(ws);
  return all.length ? Math.round((all.filter((x) => x.l.done).length / all.length) * 100) : 0;
}

export function remainingMins(ws: Workspace): number {
  return flatten(ws)
    .filter((x) => !x.l.done)
    .reduce((a, x) => a + x.l.mins, 0);
}

export function studyDays(ws: Workspace): number[] {
  return ws.studyDays && ws.studyDays.length ? ws.studyDays : [1, 2, 3, 4, 5];
}

export function bufferDays(ws: Workspace): number {
  return ws.bufferDays == null ? 7 : ws.bufferDays;
}

/** Weeks of real study time before the buffer starts. Pacing targets this, not the exam date. */
export function studyWeeks(ws: Workspace): number {
  if (!ws.examDate) return 0;
  const effective = daysTo(ws.examDate) - bufferDays(ws);
  return effective > 0 ? effective / 7 : 0;
}

export function dailyTarget(ws: Workspace): number {
  return (ws.hoursPerWeek * 60) / Math.max(1, studyDays(ws).length);
}

/** How many week columns the roadmap shows: enough for the sections and the exam, clamped. */
export function weekCount(ws: Workspace): number {
  const sections = ws.courses.flatMap((c) => c.sections);
  const fromSections = sections.reduce((a, s) => Math.max(a, s.week), 0);
  const fromExam = ws.examDate ? Math.ceil(daysTo(ws.examDate) / 7) + 1 : 0;
  return Math.max(6, Math.min(14, Math.max(fromSections, fromExam)));
}

export function weekLoads(ws: Workspace): Record<number, number> {
  const loads: Record<number, number> = {};
  for (const c of ws.courses) {
    for (const s of c.sections) loads[s.week] = (loads[s.week] || 0) + sectionMins(s);
  }
  return loads;
}

export function noteKeys(ws: Workspace): string[] {
  const ids = new Set(flatten(ws).map((x) => x.l.id));
  return Object.keys(ws.notes).filter((k) => (ws.notes[k] || "").trim() && ids.has(k));
}
