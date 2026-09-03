import { create } from "zustand";
import type { Card, Course, Store, Workspace } from "./types";
import { blankTimer, bank, elapsed, type TimerState } from "./timer";
import {
  allowShrink,
  flushStore,
  loadLastWorkspace,
  loadStore,
  rememberLastWorkspace,
  scheduleSave,
} from "./persist";
import { firstRunWorkspace } from "./seed";
import { migrateWorkspace, rollLog } from "./migrate";
import { autoSchedule } from "../planner/schedule";

export type View = "today" | "roadmap" | "board" | "course" | "notes" | "review" | "stats";
export type Dialog = null | "plan" | "import" | "transfer";
export type RoadmapMode = "weeks" | "days";
export type NoteTab = "note" | "cards";

export interface ImportDraft {
  title: string;
  provider: string;
  source: string;
  hours: number;
  fromUrl: boolean;
  expected: { sections: number; lectures: number; length: string } | null;
  sections: { title: string; week: number; mins: number; lectures: { title: string; mins: number }[] }[];
}

interface AppState {
  ready: boolean;
  /** Set when the library came from a backup rather than library.json. */
  recovered: string | null;
  /** A dismissible inline notice, in place of window.alert. */
  notice: string | null;
  spaces: Workspace[];
  savedAt: string;

  wsId: string;
  view: View;
  courseId: string | null;
  openSection: string | null;
  lectureId: string | null;
  query: string;
  tab: NoteTab;
  revealed: Record<string, boolean>;
  editingCard: string | null;
  composer: boolean;
  newCardQ: string;
  newCardA: string;
  reviewIdx: number;
  reviewShown: boolean;
  roadmapMode: RoadmapMode;
  dayWeek: number;
  editMode: boolean;
  launcher: boolean;
  dialog: Dialog;

  importUrl: string;
  importText: string;
  importNote: string;
  importErr: boolean;
  importBusy: boolean;
  draft: ImportDraft | null;

  timer: TimerState;
  /** Bumped once a second while the clock runs, so only the dock re-renders. */
  now: number;
}

interface AppActions {
  init: () => Promise<void>;
  mutate: (fn: (ws: Workspace) => void) => void;
  mutateWs: (id: string, fn: (ws: Workspace) => void) => void;
  set: <K extends keyof AppState>(patch: Pick<AppState, K> | Partial<AppState>) => void;

  goto: (view: View) => void;
  switchWorkspace: (id: string) => void;
  openCourse: (courseId: string, sectionId?: string) => void;
  openNote: (lectureId: string) => void;

  newWorkspace: () => void;
  deleteWorkspace: (id: string) => void;
  newCourse: () => void;
  deleteCourse: (courseId: string) => void;
  deleteSection: (courseId: string, sectionId: string) => void;
  deleteLecture: (courseId: string, sectionId: string, lectureId: string) => void;
  toggleLecture: (courseId: string, lectureId: string) => void;
  addCard: (card: Omit<Card, "id">) => void;
  addCards: (cards: Omit<Card, "id">[]) => void;
  replan: () => void;

  startTimer: (lectureId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  startBreak: () => void;
  endBreak: () => void;
  stopTimer: () => void;
  cancelTimer: () => void;
  tick: () => void;

  importWorkspaces: (spaces: Workspace[]) => void;
  commitDraft: () => void;
}

export type App = AppState & AppActions;

/**
 * One workspace is cloned per mutation and the rest are shared, so a note
 * keystroke does not copy the whole library.
 */
function cloneOne(spaces: Workspace[], id: string, fn: (ws: Workspace) => void): Workspace[] {
  return spaces.map((w) => {
    if (w.id !== id) return w;
    const copy = structuredClone(w);
    fn(copy);
    return copy;
  });
}

function lectureIdsOf(course: Course): string[] {
  return course.sections.flatMap((s) => s.lectures.map((l) => l.id));
}

/** Deleting anything takes its notes and cards with it. */
function dropLectureData(ws: Workspace, ids: string[]): void {
  const gone = new Set(ids);
  for (const id of gone) {
    delete ws.notes[id];
    delete ws.actuals[id];
    delete ws.doneAt[id];
  }
  ws.cards = ws.cards.filter((c) => !gone.has(c.lectureId));
}

export const useApp = create<App>((setState, getState) => {
  const persist = () => {
    const s = getState();
    const store: Store = { schema: 1, spaces: s.spaces, savedAt: new Date().toISOString() };
    setState({ savedAt: store.savedAt });
    scheduleSave(store);
  };

  const mutateWs = (id: string, fn: (ws: Workspace) => void) => {
    setState((s) => ({ spaces: cloneOne(s.spaces, id, fn) }));
    persist();
  };

  return {
    ready: false,
    recovered: null,
    notice: null,
    spaces: [],
    savedAt: new Date().toISOString(),

    wsId: "",
    view: "today",
    courseId: null,
    openSection: null,
    lectureId: null,
    query: "",
    tab: "note",
    revealed: {},
    editingCard: null,
    composer: false,
    newCardQ: "",
    newCardA: "",
    reviewIdx: 0,
    reviewShown: false,
    roadmapMode: "weeks",
    dayWeek: 1,
    editMode: false,
    launcher: false,
    dialog: null,

    importUrl: "",
    importText: "",
    importNote: "",
    importErr: false,
    importBusy: false,
    draft: null,

    timer: blankTimer(),
    now: Date.now(),

    async init() {
      const [{ store, recovered }, lastWorkspace] = await Promise.all([
        loadStore(),
        loadLastWorkspace(),
      ]);
      const spaces = store ? store.spaces : [firstRunWorkspace()];
      const lastSaved = store ? store.savedAt : "";
      for (const ws of spaces) rollLog(ws, lastSaved);
      // Reopen where the user left off, unless that workspace is gone.
      const opening = spaces.find((w) => w.id === lastWorkspace) ?? spaces[0];
      setState({
        ready: true,
        recovered,
        spaces,
        savedAt: new Date().toISOString(),
        wsId: opening.id,
        // A brand new library opens on its plan — a date and the hours come first.
        dialog: store ? null : "plan",
      });
      if (!store) persist();
    },

    set(patch) {
      setState(patch as Partial<AppState>);
    },

    mutate(fn) {
      mutateWs(getState().wsId, fn);
    },
    mutateWs,

    goto(view) {
      setState({ view, launcher: false, dialog: null });
    },

    switchWorkspace(id) {
      void rememberLastWorkspace(id);
      // Switching workspaces changes everything on screen: nothing is shared.
      setState({
        wsId: id,
        view: "today",
        courseId: null,
        openSection: null,
        lectureId: null,
        query: "",
        reviewIdx: 0,
        reviewShown: false,
        editMode: false,
        launcher: false,
        dialog: null,
      });
    },

    openCourse(courseId, sectionId) {
      const ws = currentWorkspace(getState());
      const course = ws.courses.find((c) => c.id === courseId);
      setState({
        view: "course",
        courseId,
        openSection: sectionId ?? course?.sections[0]?.id ?? null,
        launcher: false,
        dialog: null,
      });
    },

    openNote(lectureId) {
      setState({ view: "notes", lectureId, tab: "note", launcher: false, dialog: null });
    },

    newWorkspace() {
      const ws = firstRunWorkspace();
      ws.name = "New workspace";
      setState((s) => ({
        spaces: s.spaces.concat([ws]),
        wsId: ws.id,
        view: "board",
        courseId: null,
        launcher: false,
        dialog: "plan",
      }));
      persist();
    },

    deleteWorkspace(id) {
      allowShrink();
      setState((s) => {
        const left = s.spaces.filter((w) => w.id !== id);
        if (!left.length) return s;
        return {
          spaces: left,
          wsId: s.wsId === id ? left[0].id : s.wsId,
          courseId: null,
          lectureId: null,
          view: "today",
        };
      });
      persist();
    },

    newCourse() {
      const base = `c${Date.now()}`;
      const week = 1;
      getState().mutate((ws) => {
        ws.courses.push({
          id: base,
          title: "New course",
          provider: "Written by hand",
          source: "Created in StudyFrame",
          sections: [
            {
              id: `${base}-s1`,
              title: "Section 1",
              week,
              lectures: [{ id: `${base}-s1-l0`, title: "First lecture", mins: 15, done: false }],
            },
          ],
        });
      });
      setState({ view: "course", courseId: base, openSection: `${base}-s1`, editMode: true });
    },

    deleteCourse(courseId) {
      allowShrink();
      getState().mutate((ws) => {
        const course = ws.courses.find((c) => c.id === courseId);
        if (!course) return;
        dropLectureData(ws, lectureIdsOf(course));
        ws.courses = ws.courses.filter((c) => c.id !== courseId);
      });
      setState({ view: "board", courseId: null, lectureId: null, editMode: false });
    },

    deleteSection(courseId, sectionId) {
      allowShrink();
      getState().mutate((ws) => {
        const course = ws.courses.find((c) => c.id === courseId);
        if (!course) return;
        const section = course.sections.find((s) => s.id === sectionId);
        if (!section) return;
        dropLectureData(ws, section.lectures.map((l) => l.id));
        course.sections = course.sections.filter((s) => s.id !== sectionId);
      });
    },

    deleteLecture(courseId, sectionId, lectureId) {
      allowShrink();
      getState().mutate((ws) => {
        const section = ws.courses
          .find((c) => c.id === courseId)
          ?.sections.find((s) => s.id === sectionId);
        if (!section) return;
        section.lectures = section.lectures.filter((l) => l.id !== lectureId);
        dropLectureData(ws, [lectureId]);
      });
    },

    /**
     * Toggling completion stamps the date. Done while the clock runs, it also
     * records how long the lecture actually took and moves the clock on to the
     * next pending lecture without stopping.
     */
    toggleLecture(courseId, lectureId) {
      const s = getState();
      const t = s.timer;
      const timing = (t.running || t.onBreak) && t.lectureId === lectureId;
      const actualMins = timing ? Math.round(elapsed(t, Date.now()).lecture / 60000) : 0;
      let nowDone = false;

      mutateWs(s.wsId, (ws) => {
        const lecture = ws.courses
          .find((c) => c.id === courseId)
          ?.sections.flatMap((sec) => sec.lectures)
          .find((l) => l.id === lectureId);
        if (!lecture) return;
        lecture.done = !lecture.done;
        nowDone = lecture.done;
        if (lecture.done) {
          ws.doneAt[lectureId] = new Date().toISOString();
          if (actualMins > 0) ws.actuals[lectureId] = actualMins;
        } else {
          delete ws.doneAt[lectureId];
        }
      });

      if (!timing || !nowDone) return;
      const after = getState();
      const next = nextPending(after, lectureId);
      setState((prev) => ({
        timer: {
          ...bank(prev.timer),
          lectureMs: 0,
          lectureId: next ? next : null,
          logged: prev.timer.logged.concat([{ id: lectureId, mins: actualMins }]),
        },
      }));
    },

    addCard(card) {
      getState().mutate((ws) => {
        ws.cards.push({ ...card, id: `c${Date.now()}` });
      });
      setState({ composer: false, newCardQ: "", newCardA: "" });
    },

    addCards(cards) {
      const stamp = Date.now();
      getState().mutate((ws) => {
        ws.cards = ws.cards.concat(cards.map((c, i) => ({ ...c, id: `c${stamp}-${i}` })));
      });
    },

    replan() {
      getState().mutate((ws) => autoSchedule(ws));
      setState({ view: "roadmap", dialog: null, launcher: false });
    },

    startTimer(lectureId) {
      const s = getState();
      setState({
        now: Date.now(),
        timer: { ...blankTimer(), running: true, startedAt: Date.now(), lectureId, wsId: s.wsId },
      });
    },

    pauseTimer() {
      setState((s) => ({ timer: { ...bank(s.timer), running: false } }));
    },

    resumeTimer() {
      setState((s) => ({
        now: Date.now(),
        timer: { ...s.timer, running: true, onBreak: false, startedAt: Date.now() },
      }));
    },

    startBreak() {
      setState((s) => ({
        timer: {
          ...bank(s.timer),
          onBreak: true,
          running: true,
          breakStartedAt: Date.now(),
          sinceBreakMs: 0,
          breakCount: s.timer.breakCount + 1,
        },
      }));
    },

    endBreak() {
      setState((s) => ({
        now: Date.now(),
        timer: {
          ...s.timer,
          onBreak: false,
          running: true,
          startedAt: Date.now(),
          breakMs: s.timer.breakMs + (Date.now() - s.timer.breakStartedAt),
          breakStartedAt: 0,
        },
      }));
    },

    stopTimer() {
      const s = getState();
      const t = s.timer;
      const e = elapsed(t, Date.now());
      const focusSecs = Math.round(e.focus / 1000);
      const breakSecs = Math.round(e.breaks / 1000);
      const focusMins = Math.round(focusSecs / 60);
      // The session is credited to the workspace it started in, not the one on screen.
      mutateWs(t.wsId || s.wsId, (ws) => {
        ws.sessions = ws.sessions
          .concat([
            {
              at: new Date().toISOString(),
              focusSecs,
              breakSecs,
              focusMins,
              breaks: t.breakCount,
              lectures: t.logged.slice(),
            },
          ])
          .slice(-60);
        if (focusMins >= 1 && ws.log.length) {
          ws.log[ws.log.length - 1] = { mins: ws.log[ws.log.length - 1].mins + focusMins };
        }
      });
      setState({ timer: blankTimer() });
      void flushStore();
    },

    cancelTimer() {
      setState({ timer: blankTimer() });
    },

    tick() {
      setState({ now: Date.now() });
    },

    importWorkspaces(spaces) {
      setState((s) => ({
        spaces: s.spaces.concat(spaces),
        wsId: spaces[0].id,
        view: "today",
        courseId: null,
        lectureId: null,
        dialog: null,
        launcher: false,
      }));
      persist();
      void flushStore();
    },

    commitDraft() {
      const s = getState();
      const draft = s.draft;
      if (!draft) return;
      // Ids are prefixed per import so importing the same course twice cannot
      // collide on notes or cards.
      const base = `im${Date.now()}`;
      getState().mutate((ws) => {
        ws.courses.push({
          id: base,
          title: draft.title,
          provider: draft.provider,
          source: draft.source,
          sections: draft.sections.map((sec, si) => ({
            id: `${base}-s${si}`,
            title: sec.title,
            week: sec.week,
            lectures: sec.lectures.map((l, li) => ({
              id: `${base}-s${si}-l${li}`,
              title: l.title,
              mins: l.mins,
              done: false,
            })),
          })),
        });
      });
      setState({
        dialog: null,
        draft: null,
        importUrl: "",
        importText: "",
        importNote: "",
        importErr: false,
        view: "board",
        courseId: base,
      });
    },
  };
});

export function currentWorkspace(s: AppState): Workspace {
  return s.spaces.find((w) => w.id === s.wsId) || s.spaces[0];
}

/** The next unfinished lecture by week order, skipping the one just completed. */
function nextPending(s: AppState, exclude: string): string | null {
  const ws = currentWorkspace(s);
  const pending = ws.courses
    .flatMap((c) => c.sections.map((sec) => ({ sec, c })))
    .flatMap(({ sec }) => sec.lectures.map((l) => ({ l, week: sec.week })))
    .filter((x) => !x.l.done && x.l.id !== exclude)
    .sort((a, b) => a.week - b.week);
  return pending.length ? pending[0].l.id : null;
}

/** Import validates the envelope before touching the library. */
export function prepareImport(raw: unknown, existing: Workspace[]): Workspace[] {
  const data = raw as { app?: string; version?: number; spaces?: Partial<Workspace>[] };
  if (data?.app !== "studyframe" || data?.version !== 1) {
    throw new Error("That file isn't a StudyFrame export.");
  }
  if (!Array.isArray(data.spaces) || !data.spaces.length) {
    throw new Error("No workspaces in that file.");
  }
  const names = new Set(existing.map((w) => w.name));
  // Merge, never overwrite: a fresh id, and a name clash arrives alongside.
  return data.spaces.map((raw, i) => {
    const ws = migrateWorkspace(raw);
    ws.id = `${ws.id}-i${Date.now()}-${i}`;
    if (names.has(ws.name)) ws.name = `${ws.name} (imported)`;
    return ws;
  });
}
