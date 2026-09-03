export interface TimerState {
  running: boolean;
  onBreak: boolean;
  /** Wall-clock instant the current run began. A delta, not a tick count, so
   *  sleeping or suspending the machine does not lose time. */
  startedAt: number;
  focusMs: number;
  lectureMs: number;
  sinceBreakMs: number;
  breakMs: number;
  breakStartedAt: number;
  breakCount: number;
  lectureId: string | null;
  /** The workspace the session belongs to; it is credited there whatever the user switches to. */
  wsId: string | null;
  logged: { id: string; mins: number }[];
}

export interface TimerElapsed {
  focus: number;
  lecture: number;
  breaks: number;
  sinceBreak: number;
}

export function blankTimer(): TimerState {
  return {
    running: false,
    onBreak: false,
    startedAt: 0,
    focusMs: 0,
    lectureMs: 0,
    sinceBreakMs: 0,
    breakMs: 0,
    breakStartedAt: 0,
    breakCount: 0,
    lectureId: null,
    wsId: null,
    logged: [],
  };
}

/** Banked accumulators plus whatever has elapsed since the current run started. */
export function elapsed(t: TimerState, now: number): TimerElapsed {
  const live = t.running && !t.onBreak ? now - t.startedAt : 0;
  const breakLive = t.onBreak ? now - t.breakStartedAt : 0;
  return {
    focus: t.focusMs + live,
    lecture: t.lectureMs + live,
    breaks: t.breakMs + breakLive,
    sinceBreak: t.sinceBreakMs + live,
  };
}

/** Folds the live delta into the accumulators and restarts the run from now. */
export function bank(t: TimerState): TimerState {
  const live = t.running && !t.onBreak ? Date.now() - t.startedAt : 0;
  return {
    ...t,
    focusMs: t.focusMs + live,
    lectureMs: t.lectureMs + live,
    sinceBreakMs: t.sinceBreakMs + live,
    startedAt: Date.now(),
  };
}
