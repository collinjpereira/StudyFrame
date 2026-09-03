import type { Workspace } from "../store/types";
import { sectionMins, sectionRemaining, studyWeeks } from "./derive";

/**
 * Assigns every section a week. Mutates the workspace, so call it inside a store
 * mutation. Auto-schedule overwrites any hand-dragged week, which is why it is
 * an explicit button rather than something that runs on its own.
 */
export function autoSchedule(ws: Workspace): void {
  const sections = ws.courses.flatMap((c) => c.sections);
  const total = sections.reduce((a, s) => a + (sectionRemaining(s) || sectionMins(s)), 0);
  const budget = Math.max(1, ws.hoursPerWeek) * 60;
  const avail = Math.floor(studyWeeks(ws));
  // Taking the larger of the two is what makes a tight deadline compress the
  // weeks rather than silently overrun the date.
  const cap = avail > 0 ? Math.max(budget, Math.ceil(total / avail)) : budget;

  let week = 1;
  let used = 0;
  for (const s of sections) {
    const mins = sectionRemaining(s) || sectionMins(s);
    // The 1.25 tolerance keeps one long section from being pushed onto its own week.
    if (used > 0 && used + mins > cap * 1.25) {
      week++;
      used = 0;
    }
    s.week = week;
    used += mins;
    if (used >= cap) {
      week++;
      used = 0;
    }
  }
}

/** The same rule applied to an import draft, before the course exists. */
export function assignDraftWeeks<T extends { mins: number }>(
  items: T[],
  hoursPerWeek: number,
): (T & { week: number })[] {
  const cap = hoursPerWeek * 60;
  let week = 1;
  let used = 0;
  return items.map((item) => {
    if (used > 0 && used + item.mins > cap * 1.25) {
      week++;
      used = 0;
    }
    const assigned = week;
    used += item.mins;
    if (used >= cap) {
      week++;
      used = 0;
    }
    return { ...item, week: assigned };
  });
}
