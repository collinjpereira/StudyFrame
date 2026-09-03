import {
  CalendarPlus,
  Cards,
  CheckCircle,
  NotePencil,
  Play,
  TrendUp,
  Warning,
} from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { flatten, workspacePct } from "../planner/derive";
import { daysTo } from "../planner/dates";
import { paceVerdict } from "../planner/pacing";
import { todayLine, todayQueue } from "../planner/queue";
import { hm, plural, short } from "../lib/format";
import { Card, Kicker, ProgressBar, IconButton, StatBlock } from "../components/ui";
import { useApp } from "../store/store";
import { Sparkline, dayLog } from "./Sparkline";

const PACE_ICONS = {
  "calendar-plus": CalendarPlus,
  warning: Warning,
  "trend-up": TrendUp,
  "check-circle": CheckCircle,
};

export function Today({ ws }: { ws: Workspace }) {
  const timerLectureId = useApp((s) => s.timer.lectureId);
  const goto = useApp((s) => s.goto);
  const set = useApp((s) => s.set);
  const openNote = useApp((s) => s.openNote);
  const startTimer = useApp((s) => s.startTimer);
  const toggleLecture = useApp((s) => s.toggleLecture);

  const queue = todayQueue(ws, timerLectureId);
  const pace = paceVerdict(ws);
  const PaceIcon = PACE_ICONS[pace.icon];
  const days = ws.examDate ? daysTo(ws.examDate) : 0;

  const log = dayLog(ws);
  const flat = flatten(ws);
  const weekItems = flat.filter((x) => x.s.week === 1);
  const weekDone = weekItems.filter((x) => x.l.done).length;
  const weekMins = weekItems.reduce((a, x) => a + x.l.mins, 0);
  const weekPct = weekItems.length ? Math.round((weekDone / weekItems.length) * 100) : 0;
  const card = ws.cards.length ? ws.cards[0] : null;

  return (
    <div
      className="scroll"
      style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "30px 34px 150px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 32,
          maxWidth: 1180,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Kicker>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Kicker>
          <h1 style={{ margin: "7px 0 0", fontSize: 30, letterSpacing: "-0.02em" }}>
            {log.streak >= 3 ? "Keep the streak" : "Pick up where you left off"}
          </h1>
          <div
            className="pretty"
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              marginTop: 5,
              maxWidth: "48ch",
            }}
          >
            {todayLine(ws, queue)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 26, flex: "none", paddingTop: 6 }}>
          <StatBlock value={log.streak} label="day streak" color="var(--color-accent-400)" />
          <StatBlock value={`${workspacePct(ws)}%`} label="workspace done" />
          <StatBlock
            value={ws.examDate ? (days > 0 ? `${days}d` : "past") : "—"}
            label={ws.examDate ? "until exam" : "no date set"}
            onClick={() => set({ dialog: "plan" })}
          />
        </div>
      </div>

      <div style={{ height: 22 }} />

      <button
        type="button"
        className="row-hover"
        onClick={() => set({ dialog: "plan" })}
        style={{
          width: "100%",
          maxWidth: 1180,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 18px",
          borderRadius: 10,
          cursor: "pointer",
          background: "var(--surface-card)",
          boxShadow: `inset 3px 0 0 ${pace.mark}, 0 0 0 1px rgba(233,233,237,0.06)`,
        }}
      >
        <PaceIcon size={19} color={pace.mark} />
        <div className="min0" style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{pace.title}</div>
          <div
            className="pretty"
            style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}
          >
            {pace.line}
          </div>
        </div>
        <div style={{ flex: "none", fontSize: 12, color: "var(--color-accent)" }}>
          Adjust plan →
        </div>
      </button>

      <div style={{ height: 24 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)",
          gap: 26,
          maxWidth: 1180,
          alignItems: "start",
        }}
      >
        <div className="min0">
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Kicker>
              Today&apos;s target · {plural(queue.items.length, "lecture")} ·{" "}
              {hm(queue.queued)} of {hm(queue.target)}
            </Kicker>
            <button
              type="button"
              className="link"
              style={{ flex: "none" }}
              onClick={() => goto("roadmap")}
            >
              Open roadmap →
            </button>
          </div>

          <div style={{ height: 12 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.items.slice(0, 8).map((it) => {
              const hasNote = (ws.notes[it.l.id] || "").trim().length > 0;
              const onClock = timerLectureId === it.l.id;
              return (
                <div
                  key={it.l.id}
                  className="row-hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "13px 15px",
                    borderRadius: 9,
                    background: "var(--surface-card)",
                    boxShadow: `inset 2px 0 0 ${
                      it.s.week <= 1 ? "var(--color-accent)" : "var(--color-accent-700)"
                    }, 0 0 0 1px rgba(233,233,237,0.06)`,
                  }}
                >
                  <button
                    type="button"
                    className="checkbox"
                    role="checkbox"
                    aria-checked={it.l.done}
                    aria-label={`Mark ${it.l.title} complete`}
                    onClick={() => toggleLecture(it.c.id, it.l.id)}
                    style={{ width: 18, height: 18 }}
                  />
                  <div className="min0" style={{ flex: 1 }}>
                    <div
                      className="pretty"
                      style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3 }}
                    >
                      {it.l.title}
                    </div>
                    <div
                      className="trunc"
                      style={{
                        fontSize: 11.5,
                        color: "rgba(233,233,237,0.44)",
                        marginTop: 3,
                      }}
                    >
                      {short(it.c.title.split(":")[0], 30)} · {it.s.title} · week {it.s.week}
                    </div>
                  </div>
                  <div
                    className="tnum"
                    style={{ fontSize: 11.5, color: "var(--text-muted)", flex: "none" }}
                  >
                    {it.l.mins}m
                  </div>
                  <IconButton
                    title={onClock ? "On the clock now" : "Start studying this"}
                    onClick={() => startTimer(it.l.id)}
                    color={onClock ? "var(--color-accent-400)" : undefined}
                    fontSize={13}
                  >
                    <Play size={13} weight="fill" />
                  </IconButton>
                  <IconButton
                    title="Note"
                    onClick={() => openNote(it.l.id)}
                    color={hasNote ? "var(--color-accent-400)" : undefined}
                  >
                    <NotePencil size={14} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="min0"
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <Card>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <Kicker>This week</Kicker>
              <span
                className="tnum"
                style={{ fontSize: 12.5, color: "var(--color-accent-400)" }}
              >
                {weekPct}%
              </span>
            </div>
            <div style={{ marginTop: 12, display: "flex" }}>
              <ProgressBar pct={weekPct} height={3} />
            </div>
            <div
              style={{ fontSize: 11.5, color: "rgba(233,233,237,0.44)", marginTop: 10 }}
            >
              {weekItems.length
                ? `${weekDone} of ${plural(weekItems.length, "lecture")} · ${hm(weekMins)} scheduled`
                : "Nothing scheduled this week"}
            </div>
            <div style={{ height: 14 }} />
            <Sparkline days={log.days.slice(14)} height={46} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "var(--text-faint)",
                marginTop: 6,
              }}
            >
              <span>14 days ago</span>
              <span>today</span>
            </div>
          </Card>

          <Card>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <Kicker>Review deck</Kicker>
              <span
                className="tnum"
                style={{ fontSize: 12.5, color: "var(--text-secondary)" }}
              >
                {plural(ws.cards.length, "card")}
              </span>
            </div>
            <div
              className="pretty"
              style={{
                fontSize: 13,
                color: "rgba(233,233,237,0.62)",
                marginTop: 11,
                lineHeight: 1.5,
              }}
            >
              {card ? card.q : "No cards in this workspace yet — add them from any lecture note."}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 14 }}
              onClick={() => goto("review")}
            >
              <Cards size={14} />
              Start review
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
