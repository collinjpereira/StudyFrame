import { Play } from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { todayQueue } from "../planner/queue";
import { clock as fmtClock, plural, short } from "../lib/format";
import { elapsed } from "../store/timer";
import { useApp } from "../store/store";

/** After this long without a break, the dock asks for one. */
const NUDGE_MS = 50 * 60000;

export function TimerDock({ ws }: { ws: Workspace }) {
  const timer = useApp((s) => s.timer);
  const now = useApp((s) => s.now);
  const spaces = useApp((s) => s.spaces);
  const wsId = useApp((s) => s.wsId);
  const startTimer = useApp((s) => s.startTimer);
  const pauseTimer = useApp((s) => s.pauseTimer);
  const resumeTimer = useApp((s) => s.resumeTimer);
  const startBreak = useApp((s) => s.startBreak);
  const endBreak = useApp((s) => s.endBreak);
  const stopTimer = useApp((s) => s.stopTimer);
  const cancelTimer = useApp((s) => s.cancelTimer);
  const toggleLecture = useApp((s) => s.toggleLecture);
  const switchWorkspace = useApp((s) => s.switchWorkspace);

  const queue = todayQueue(ws, timer.lectureId);
  const focus = queue.focus;
  const e = elapsed(timer, now);
  const active = timer.running || timer.onBreak;
  const idle = !active;
  const paused = !timer.running && !timer.onBreak && timer.focusMs > 0;
  const elsewhere = !!timer.wsId && timer.wsId !== wsId;
  const homeName = spaces.find((s) => s.id === timer.wsId)?.name || "";

  const cancel = () => {
    if (e.focus > 60000 && !window.confirm(`Throw away this session? ${fmtClock(e.focus)} won't be recorded.`))
      return;
    cancelTimer();
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 45,
        width: 300,
        borderRadius: 12,
        padding: "15px 16px",
        background: active ? "var(--surface-dock-active)" : "var(--surface-card)",
        boxShadow: active
          ? "0 0 0 1px var(--color-accent-700), var(--shadow-dock)"
          : "0 0 0 1px rgba(233,233,237,0.09), var(--shadow-dock)",
      }}
    >
      {idle ? (
        <div>
          <button
            type="button"
            onClick={() => (paused ? resumeTimer() : focus && startTimer(focus.l.id))}
            disabled={!focus && !paused}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "9px 11px",
              margin: "-4px -5px 0",
              borderRadius: 10,
              cursor: focus || paused ? "pointer" : "not-allowed",
              background: "rgba(145,132,217,0.14)",
              width: "calc(100% + 10px)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                flex: "none",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: "var(--color-bg)",
                background: "var(--color-accent)",
              }}
            >
              <Play size={15} weight="fill" />
            </div>
            <div className="min0" style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "var(--color-accent-300)",
                }}
              >
                {paused ? "Resume studying" : "Start studying"}
              </div>
              <div className="trunc" style={{ fontSize: 11.5, marginTop: 2 }}>
                {focus ? short(focus.l.title, 34) : "Nothing pending"}
              </div>
            </div>
          </button>

          <div
            className="trunc"
            style={{ fontSize: 11, color: "var(--text-complete)", marginTop: 10 }}
          >
            {focus
              ? `${short(focus.s.title, 26)} · est ${focus.l.mins}m`
              : "Import a course to get started"}
          </div>
          {focus ? (
            <div
              className="pretty"
              style={{
                fontSize: 10.5,
                color: "rgba(233,233,237,0.34)",
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              {queue.todayFirst?.carried
                ? `Carried over from ${queue.todayFirst.carried} — clear this first`
                : queue.focusFromToday
                  ? "First on today's plan · press ▸ on any lecture to pick another"
                  : "Nothing scheduled today — next on the roadmap. Press ▸ on any lecture to pick another."}
            </div>
          ) : null}
          {paused ? (
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "7px 0" }} onClick={stopTimer}>
                End studying
              </button>
              <button type="button" className="btn btn-secondary btn-danger" style={{ fontSize: 12, padding: "7px 12px" }} onClick={cancel}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {timer.running && !timer.onBreak ? (
        <div>
          <div
            style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}
          >
            <div
              className="tnum"
              style={{
                fontSize: 27,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--color-accent-400)",
              }}
            >
              {fmtClock(e.focus)}
            </div>
            <div
              className="tnum"
              style={{
                fontSize: 11,
                // Past 1.2× the runtime, this lecture is taking noticeably longer than billed.
                color:
                  focus && e.lecture / 60000 > focus.l.mins * 1.2
                    ? "var(--color-warn-text)"
                    : "var(--text-complete)",
              }}
            >
              {fmtClock(e.lecture)} on this one
            </div>
          </div>

          <div
            className="trunc"
            style={{ fontSize: 12.5, fontWeight: 500, marginTop: 7 }}
          >
            {focus ? short(focus.l.title, 34) : "Nothing pending"}
          </div>
          <div
            className="trunc"
            style={{ fontSize: 11, color: "var(--text-complete)", marginTop: 2 }}
          >
            {focus ? short(focus.s.title, 26) : ""} ·{" "}
            {timer.breakCount
              ? `${plural(timer.breakCount, "break")} · ${fmtClock(e.breaks)}`
              : "no breaks yet"}
          </div>

          {e.sinceBreak > NUDGE_MS ? (
            <div
              className="pretty"
              style={{
                fontSize: 11.5,
                color: "var(--color-warn-bright)",
                marginTop: 9,
                lineHeight: 1.45,
              }}
            >
              You&apos;ve been at it {Math.round(e.sinceBreak / 60000)} minutes — take five?
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              title="Mark done and move to the next lecture"
              disabled={!focus}
              onClick={() => focus && toggleLecture(focus.c.id, focus.l.id)}
              style={{ flex: 1, minWidth: 74, justifyContent: "center", fontSize: 12, padding: "7px 0" }}
            >
              Done
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={startBreak}
              style={{ flex: "none", fontSize: 12, padding: "7px 11px" }}
            >
              Break
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={pauseTimer}
              style={{ flex: "none", fontSize: 12, padding: "7px 11px" }}
            >
              Pause
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button
              type="button"
              className="btn btn-secondary"
              title="Save this session to your stats"
              onClick={stopTimer}
              style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "7px 0" }}
            >
              End studying
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-danger"
              title="Discard — nothing is recorded"
              onClick={cancel}
              style={{ flex: "none", fontSize: 12, padding: "7px 12px" }}
            >
              Cancel
            </button>
          </div>

          {elsewhere ? (
            <button
              type="button"
              onClick={() => timer.wsId && switchWorkspace(timer.wsId)}
              style={{
                fontSize: 10.5,
                color: "var(--color-accent-300)",
                marginTop: 9,
                cursor: "pointer",
              }}
            >
              Running in {homeName} — jump back →
            </button>
          ) : null}
        </div>
      ) : null}

      {timer.onBreak ? (
        <div>
          <div className="kicker">On a break</div>
          <div
            className="tnum"
            style={{ fontSize: 27, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 4 }}
          >
            {fmtClock(e.breaks)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-complete)", marginTop: 5 }}>
            {fmtClock(e.focus)} studied so far
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={endBreak}
              style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "7px 0" }}
            >
              Back to it
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={stopTimer}
              style={{ flex: "none", fontSize: 12, padding: "7px 11px" }}
            >
              End studying
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-danger"
              title="Discard — nothing is recorded"
              onClick={cancel}
              style={{ flex: "none", fontSize: 12, padding: "7px 11px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
