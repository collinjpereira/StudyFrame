import type { Workspace } from "../store/types";
import { addDays, daysTo } from "./dates";
import { bufferDays, remainingMins, studyWeeks } from "./derive";
import { hm, plural } from "../lib/format";

export interface PaceNumbers {
  remaining: number;
  days: number;
  buffer: number;
  studyW: number;
  have: number;
  /** Hours a week the material needs to land with the buffer intact. */
  need: number;
  /** Weeks to finish at the current budget. */
  finishWeeks: number;
  finishDate: string;
}

export function paceNumbers(ws: Workspace): PaceNumbers {
  const remaining = remainingMins(ws);
  const studyW = studyWeeks(ws);
  const have = ws.hoursPerWeek;
  const finishWeeks = remaining / 60 / have;
  return {
    remaining,
    days: ws.examDate ? daysTo(ws.examDate) : 0,
    buffer: bufferDays(ws),
    studyW,
    have,
    need: studyW > 0 ? remaining / 60 / studyW : 0,
    finishWeeks,
    finishDate: dateAfterWeeks(finishWeeks),
  };
}

/** "12 Oct" for a point that many weeks from today. */
export function dateAfterWeeks(weeks: number): string {
  return addDays(new Date(), Math.round(weeks * 7)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export interface Verdict {
  title: string;
  detail: string;
  /** One line for the Today banner, where there is no room for the full detail. */
  line: string;
  mark: string;
  icon: "calendar-plus" | "warning" | "trend-up" | "check-circle";
}

/**
 * The Today pace banner. Never shows a green light on a plan that cannot
 * happen — the two failing cases come first and are named plainly.
 */
export function paceVerdict(ws: Workspace): Verdict {
  const n = paceNumbers(ws);
  const bufferPhrase = `${plural(n.buffer, "day")} of revision`;
  const line = ws.examDate
    ? `${hm(n.remaining)} left · ${n.need.toFixed(1)} h/week needed · ${n.have} h/week budgeted`
    : `${hm(n.remaining)} left · ${n.have} h/week budgeted`;

  if (!ws.examDate) {
    return {
      title: "No target date set",
      detail: `${hm(n.remaining)} of material left. At ${n.have} h/week you'd finish around ${n.finishDate} — set a date and StudyFrame paces it to land ${bufferPhrase} early.`,
      line,
      mark: "var(--color-neutral-600)",
      icon: "calendar-plus",
    };
  }
  if (n.days <= 0) {
    return {
      title: "Target date has passed",
      detail: "Move the date forward to get a fresh plan.",
      line,
      mark: "var(--color-warn-text)",
      icon: "warning",
    };
  }
  if (n.studyW <= 0) {
    return {
      title: "Inside the revision window",
      detail: `Only ${plural(n.days, "day")} left and the last ${plural(n.buffer, "day")} are reserved for revision, but ${hm(n.remaining)} of material is still unwatched. Cut scope or move the date.`,
      line,
      mark: "var(--color-warn-text)",
      icon: "warning",
    };
  }

  const ratio = n.need / n.have;
  if (ratio > 1.15) {
    return {
      title: "Behind pace",
      detail: `Finishing ${hm(n.remaining)} with ${bufferPhrase} left before the exam needs ${n.need.toFixed(1)} h/week, but you've budgeted ${n.have}. Add ${(n.need - n.have).toFixed(1)} h/week, push the date, or cut a course.`,
      line,
      mark: "var(--color-warn-text)",
      icon: "trend-up",
    };
  }
  if (ratio > 0.85) {
    return {
      title: "On pace",
      detail: `${n.need.toFixed(1)} h/week needed against ${n.have} budgeted — the material lands with ${bufferPhrase} to spare, and not much more.`,
      line,
      mark: "var(--color-accent)",
      icon: "check-circle",
    };
  }
  const spare = Math.max(0, Math.floor(n.studyW - n.finishWeeks));
  return {
    title: "Comfortably ahead",
    detail: `At ${n.have} h/week you finish around ${n.finishDate} — ${
      spare > 0 ? `${plural(spare, "week")} clear on top of the ${bufferPhrase}` : bufferPhrase
    } before the exam.`,
    line,
    mark: "var(--color-accent)",
    icon: "check-circle",
  };
}
