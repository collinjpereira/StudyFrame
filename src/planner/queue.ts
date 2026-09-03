import type { Workspace } from "../store/types";
import { buildDayPlan, todayCell, type DayItem } from "./dayPlan";
import { dailyTarget, flatten } from "./derive";
import { hm, plural } from "../lib/format";

export interface TodayQueue {
  items: DayItem[];
  /** Minutes actually queued, which can exceed the target by one lecture. */
  queued: number;
  target: number;
  overTarget: boolean;
  /** First unfinished item scheduled for today, if there is one. */
  todayFirst: DayItem | null;
  /** Where the timer points when nothing has been picked by hand. */
  focus: DayItem | null;
  focusFromToday: boolean;
}

/**
 * Today's list and the timer's focus come from one ordering: what the day plan
 * scheduled for today, then the rest of the roadmap by week.
 */
export function todayQueue(
  ws: Workspace,
  timerLectureId: string | null,
  today = new Date(),
): TodayQueue {
  const plan = buildDayPlan(ws, 1, timerLectureId, today);
  const cell = todayCell(plan, today);
  const scheduled = cell ? cell.items.filter((it) => !it.l.done) : [];

  const byWeek: DayItem[] = flatten(ws)
    .filter((x) => !x.l.done)
    .sort((a, b) => a.s.week - b.s.week)
    .map((x) => ({ ...x, fixed: false }));

  const scheduledIds = new Set((cell ? cell.items : []).map((it) => it.l.id));
  const pending = scheduled.concat(byWeek.filter((x) => !scheduledIds.has(x.l.id)));

  const target = dailyTarget(ws);
  const items: DayItem[] = [];
  let queued = 0;
  for (const it of pending) {
    if (queued >= target) break;
    items.push(it);
    queued += it.l.mins;
  }
  // A first lecture longer than the whole target is still shown, alone.
  if (!items.length && pending.length) {
    items.push(pending[0]);
    queued = pending[0].l.mins;
  }

  const todayFirst = scheduled[0] ?? null;
  const picked = timerLectureId
    ? (flatten(ws)
        .filter((x) => x.l.id === timerLectureId)
        .map((x) => ({ ...x, fixed: false }))[0] ?? null)
    : null;
  const focus = picked ?? todayFirst ?? byWeek[0] ?? null;

  return {
    items,
    queued,
    target,
    overTarget: queued > target,
    todayFirst,
    focus,
    focusFromToday: !!(todayFirst && focus && focus.l.id === todayFirst.l.id),
  };
}

/**
 * The subline under Today's heading. It must agree with the figures beside it:
 * when the queue rounds up past the target, say that, rather than blaming one
 * long lecture for what the sum did.
 */
export function todayLine(ws: Workspace, q: TodayQueue): string {
  if (!q.items.length) return "Nothing left in this workspace — import a course or switch workspaces.";
  if (q.overTarget) {
    return `${hm(q.queued)} queued against a ${hm(q.target)} target — rounded up to finish the lecture.`;
  }
  const days = ws.studyDays.length;
  return `${ws.hoursPerWeek} h a week over ${plural(days, "study day")} puts ${hm(q.target)} on today.`;
}
