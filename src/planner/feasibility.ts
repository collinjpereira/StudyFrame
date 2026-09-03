import type { Workspace } from "../store/types";
import { bufferDays, studyDays, studyWeeks } from "./derive";
import { daysTo } from "./dates";
import { dateAfterWeeks } from "./pacing";
import { hm, plural } from "../lib/format";

/** 10 h/day is the planning cap — past it, no schedule is honest. */
const MAX_PER_DAY = 10;

export interface Fix {
  label: string;
  icon: string;
  apply: (ws: Workspace) => void;
}

export interface Feasibility {
  title: string;
  line: string;
  mark: string;
  icon: string;
  bg: string;
  fixes: Fix[];
  /** The even-pace recommendation, phrased concretely. */
  best: string;
  bestApply: ((ws: Workspace) => void) | null;
  bestAction: string;
}

/**
 * Checks an hours-a-week / finish-early pair against the calendar and against
 * what a person can physically sit through, then names it honestly. If someone
 * asks to study a minute a day and finish three weeks early, this says it
 * cannot be done and why.
 */
export function feasibility(ws: Workspace, remaining: number): Feasibility {
  const have = ws.hoursPerWeek;
  const buffer = bufferDays(ws);
  const dayCount = studyDays(ws).length;
  const ceiling = dayCount * MAX_PER_DAY;
  const days = ws.examDate ? daysTo(ws.examDate) : 0;
  const studyW = studyWeeks(ws);
  const totalW = days > 0 ? days / 7 : 0;
  const finishWeeks = remaining / 60 / have;
  const quarter = (h: number) => Math.ceil(h * 4) / 4;
  const need = studyW > 0 ? remaining / 60 / studyW : Infinity;
  const setHours = (h: number) => (w: Workspace) => {
    w.hoursPerWeek = h;
  };

  // Best achievable buffer at the current budget, and the leanest hours that still fit.
  const maxEarlyDays = Math.floor((totalW - finishWeeks) * 7);
  const leanHours = quarter(need);

  const out: Feasibility = {
    title: "",
    line: "",
    mark: "var(--color-accent)",
    icon: "info",
    bg: "var(--color-bg)",
    fixes: [],
    best: "",
    bestApply: null,
    bestAction: "Use this plan and re-schedule",
  };

  if (!ws.examDate || remaining <= 0) {
    out.title = "Nothing to check";
    out.line = "Set a target date and StudyFrame will check the numbers.";
    out.mark = "var(--color-neutral-600)";
    out.best = "Add a date first.";
    return out;
  }

  if (studyW <= 0) {
    const maxBuffer = Math.max(0, days - Math.ceil(finishWeeks * 7));
    out.title = "Not possible";
    out.line =
      `Finishing ${plural(buffer, "day")} early leaves no study time at all — the exam is only ${plural(days, "day")} away. ` +
      (maxBuffer > 0
        ? `At ${have} h/week the most you could finish early is ${plural(maxBuffer, "day")}.`
        : `Even studying right up to exam day, ${hm(remaining)} won't fit at ${have} h/week.`);
    out.mark = "var(--color-warn-text)";
    out.icon = "x-circle";
    out.bg = "rgba(126,43,53,0.14)";
    if (maxBuffer > 0) {
      out.fixes.push({
        label: `Finish ${maxBuffer}d early instead`,
        icon: "calendar-check",
        apply: (w) => {
          w.bufferDays = maxBuffer;
        },
      });
    }
    out.fixes.push({
      label: "Drop the buffer",
      icon: "arrow-counter-clockwise",
      apply: (w) => {
        w.bufferDays = 0;
      },
    });
  } else if (need > ceiling) {
    out.title = "Not possible";
    out.line = `This would take ${need.toFixed(1)} h/week. Across ${plural(dayCount, "study day")} that's ${(need / dayCount).toFixed(1)} h every single one — past the ${MAX_PER_DAY} h/day ceiling StudyFrame will plan for. Add study days, move the date, or cut a course.`;
    out.mark = "var(--color-warn-text)";
    out.icon = "x-circle";
    out.bg = "rgba(126,43,53,0.14)";
    if (dayCount < 7) {
      out.fixes.push({
        label: "Study all 7 days",
        icon: "calendar-dots",
        apply: (w) => {
          w.studyDays = [0, 1, 2, 3, 4, 5, 6];
        },
      });
    }
    out.fixes.push({
      label: "Cut the buffer to 0",
      icon: "arrow-counter-clockwise",
      apply: (w) => {
        w.bufferDays = 0;
      },
    });
  } else if (finishWeeks > studyW) {
    const late = Math.ceil((finishWeeks - studyW) * 7);
    out.title = `Doesn't fit at ${have} h/week`;
    out.line = `At ${have} h/week you'd finish around ${dateAfterWeeks(finishWeeks)} — ${plural(late, "day")} past your deadline. ${leanHours} h/week is the minimum that lands ${plural(buffer, "day")} early, and it's within reach.`;
    out.mark = "var(--color-warn-text)";
    out.icon = "warning";
    out.bg = "rgba(126,43,53,0.1)";
    out.fixes.push({ label: `Set ${leanHours} h/week`, icon: "trend-up", apply: setHours(leanHours) });
    if (maxEarlyDays >= 0 && maxEarlyDays < buffer) {
      out.fixes.push({
        label: `Keep ${have} h and finish ${Math.max(0, maxEarlyDays)}d early`,
        icon: "calendar-check",
        apply: (w) => {
          w.bufferDays = Math.max(0, maxEarlyDays);
        },
      });
    }
  } else {
    out.title = "This works";
    out.line = `At ${have} h/week you finish around ${dateAfterWeeks(finishWeeks)} — ${plural(Math.max(buffer, maxEarlyDays), "day")} before the exam. Minimum to still make it: ${leanHours} h/week.`;
    out.mark = "var(--color-accent)";
    out.icon = "check-circle";
    if (maxEarlyDays > buffer) {
      out.fixes.push({
        label: `Bank the extra: finish ${maxEarlyDays}d early`,
        icon: "calendar-check",
        apply: (w) => {
          w.bufferDays = maxEarlyDays;
        },
      });
    }
    if (leanHours < have) {
      out.fixes.push({
        label: `Ease off to ${leanHours} h/week`,
        icon: "trend-down",
        apply: setHours(leanHours),
      });
    }
  }

  // Flexible schedules want the load spread evenly, not front-loaded.
  if (need <= ceiling && studyW > 0) {
    const evenHours = Math.max(0.25, quarter(need));
    const perDay = evenHours / dayCount;
    out.best =
      `${plural(dayCount, "study day")} × ${perDay.toFixed(1)} h ≈ ${evenHours} h/week spreads ${hm(remaining)} evenly to ${dateAfterWeeks(remaining / 60 / evenHours)}, ${plural(buffer, "day")} before the exam. ` +
      (evenHours > have
        ? `That's ${(evenHours - have).toFixed(2)} h/week more than you have budgeted.`
        : evenHours < have
          ? `Lighter than your current ${have} h/week.`
          : "Matches what you've budgeted.");
    out.bestApply = (w) => {
      w.hoursPerWeek = evenHours;
    };
  } else {
    out.best =
      "No even-pace plan fits these dates. Change the date, the buffer or the study days and this will update.";
    out.bestAction = "Re-schedule anyway";
  }

  return out;
}
