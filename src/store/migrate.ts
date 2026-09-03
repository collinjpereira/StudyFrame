import type { Store, Workspace } from "./types";
import { addDays } from "../planner/dates";

const DEFAULTS = {
  examDate: "",
  hoursPerWeek: 5,
  bufferDays: 7,
  studyDays: [1, 2, 3, 4, 5],
  startTime: "19:00",
};

function emptyLog(): { mins: number }[] {
  return Array.from({ length: 28 }, () => ({ mins: 0 }));
}

/**
 * Migrate on read: a workspace written by an older version is filled in rather
 * than rejected. A newer schema must always be able to open an older file.
 */
export function migrateWorkspace(raw: Partial<Workspace>): Workspace {
  const ws: Workspace = {
    id: raw.id || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: raw.name || "Untitled workspace",
    examDate: raw.examDate ?? DEFAULTS.examDate,
    hoursPerWeek: raw.hoursPerWeek ?? DEFAULTS.hoursPerWeek,
    bufferDays: raw.bufferDays ?? DEFAULTS.bufferDays,
    studyDays:
      raw.studyDays && raw.studyDays.length ? raw.studyDays.slice().sort() : DEFAULTS.studyDays,
    startTime: raw.startTime || DEFAULTS.startTime,
    courses: raw.courses || [],
    notes: raw.notes || {},
    cards: raw.cards || [],
    actuals: raw.actuals || {},
    doneAt: raw.doneAt || {},
    sessions: (raw.sessions || []).slice(-60),
    log: raw.log && raw.log.length === 28 ? raw.log : emptyLog(),
  };
  stampLegacyCompletions(ws);
  return ws;
}

/**
 * Lectures ticked off before StudyFrame recorded dates get a plausible recent
 * stamp, spread over the last few days, so the day calendar can place them.
 */
function stampLegacyCompletions(ws: Workspace): void {
  const missing: string[] = [];
  for (const c of ws.courses) {
    for (const s of c.sections) {
      for (const l of s.lectures) {
        if (l.done && !ws.doneAt[l.id]) missing.push(l.id);
      }
    }
  }
  missing.forEach((id, i) => {
    const back = missing.length > 1 ? Math.round((1 - i / (missing.length - 1)) * 5) : 1;
    const day = addDays(new Date(), -back);
    day.setHours(19, 30, 0, 0);
    ws.doneAt[id] = day.toISOString();
  });
}

export function migrateStore(raw: unknown): Store | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<Store>;
  if (!Array.isArray(obj.spaces) || !obj.spaces.length) return null;
  return {
    schema: 1,
    spaces: obj.spaces.map(migrateWorkspace),
    savedAt: obj.savedAt || new Date().toISOString(),
  };
}

/**
 * `log` is a rolling 28 days. On the first launch of a new day the array
 * shifts left and a fresh entry is pushed, so index 27 is always today.
 */
export function rollLog(ws: Workspace, lastSavedAt: string): void {
  if (!lastSavedAt) return;
  const last = new Date(lastSavedAt);
  const today = new Date();
  const dayMs = 86400000;
  const elapsed = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime()) /
      dayMs,
  );
  if (elapsed <= 0) return;
  const shift = Math.min(elapsed, 28);
  ws.log = ws.log.slice(shift).concat(Array.from({ length: shift }, () => ({ mins: 0 })));
}
