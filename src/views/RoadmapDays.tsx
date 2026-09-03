import {
  CalendarPlus,
  CaretLeft,
  CaretRight,
  CheckCircle,
  GoogleLogo,
  Play,
} from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { buildDayPlan } from "../planner/dayPlan";
import { studyDays, weekCount } from "../planner/derive";
import { buildIcs, googleCalendarUrl } from "../planner/calendar";
import { mondayOf, addDays, startOfDay } from "../planner/dates";
import { DOW_SHORT, dateRange, hm, plural, short, slug } from "../lib/format";
import { openExternal, saveTextFile } from "../lib/files";
import { Button, IconButton, Kicker } from "../components/ui";
import { useApp } from "../store/store";

export function RoadmapDays({ ws }: { ws: Workspace }) {
  const dayWeek = useApp((s) => s.dayWeek);
  const timerLectureId = useApp((s) => s.timer.lectureId);
  const set = useApp((s) => s.set);
  const mutate = useApp((s) => s.mutate);
  const startTimer = useApp((s) => s.startTimer);
  const openCourse = useApp((s) => s.openCourse);

  const count = weekCount(ws);
  const week = Math.max(1, Math.min(count, dayWeek));
  const plan = buildDayPlan(ws, week, timerLectureId);
  const openDays = plan.cells.filter((c) => c.study);
  const items = plan.cells.flatMap((c) => c.items);
  const mins = items.reduce((a, it) => a + it.l.mins, 0);
  const monday = mondayOf(week);
  const today = startOfDay(new Date());

  const meta = items.length
    ? `${plural(items.length, "lecture")} · ${hm(mins)}${
        plan.rolled > 0
          ? ` · ${plural(plan.rolled, "leftover")} pushed to the next study day`
          : ` across ${plural(openDays.length, "day")}`
      }`
    : "Nothing scheduled — drag sections here in the week view";

  const exportIcs = async () => {
    await saveTextFile(`${slug(ws.name)}.ics`, buildIcs(ws, timerLectureId), [
      { name: "Calendar", extensions: ["ics"] },
    ]);
  };

  const sendToGoogle = async () => {
    const cell = plan.cells.find((c) => c.items.length);
    if (!cell) return;
    await openExternal(
      googleCalendarUrl(
        ws,
        cell.date,
        cell.items.map((it) => ({ title: it.l.title, mins: it.l.mins, course: it.c.title })),
      ),
    );
  };

  const toggleStudyDay = (dow: number) => {
    mutate((w) => {
      const days = studyDays(w).slice();
      const at = days.indexOf(dow);
      // At least one study day must stay on, or there is no plan to make.
      if (at >= 0) {
        if (days.length > 1) days.splice(at, 1);
      } else {
        days.push(dow);
      }
      w.studyDays = days.sort();
    });
  };

  return (
    <div style={{ paddingRight: 34 }}>
      <div style={{ height: 18 }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconButton
            ring
            size={30}
            fontSize={13}
            title="Previous week"
            onClick={() => set({ dayWeek: Math.max(1, week - 1) })}
          >
            <CaretLeft size={13} />
          </IconButton>
          <div style={{ minWidth: 210 }}>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {week === 1 ? "This week" : `Week ${week}`} ·{" "}
              {dateRange(monday, addDays(monday, 6))}
            </div>
            <div
              style={{ fontSize: 11.5, color: "rgba(233,233,237,0.44)", marginTop: 1 }}
            >
              {meta}
            </div>
          </div>
          <IconButton
            ring
            size={30}
            fontSize={13}
            title="Next week"
            onClick={() => set({ dayWeek: Math.min(count, week + 1) })}
          >
            <CaretRight size={13} />
          </IconButton>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <Button
            size="sm"
            title="Download .ics — import into Google Calendar, Outlook or Apple Calendar"
            onClick={() => void exportIcs()}
          >
            <CalendarPlus size={14} />
            Export to calendar (.ics)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            title="Open this week's first session as a prefilled Google Calendar event"
            disabled={!items.length}
            onClick={() => void sendToGoogle()}
          >
            <GoogleLogo size={14} />
            Send to Google Calendar
          </Button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Kicker>Study days</Kicker>
        <div style={{ display: "flex", gap: 6 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
            const dow = (i + 1) % 7;
            const on = studyDays(ws).includes(dow);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStudyDay(dow)}
                style={{
                  minWidth: 34,
                  textAlign: "center",
                  padding: "5px 8px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  cursor: "pointer",
                  color: on ? "var(--color-accent-300)" : "var(--text-muted)",
                  background: on ? "var(--color-accent-900)" : "transparent",
                  boxShadow: on
                    ? "inset 0 0 0 1px var(--color-accent-700)"
                    : "inset 0 0 0 1px rgba(233,233,237,0.09)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          {openDays.length ? `≈ ${hm(plan.perDay)} a day` : "pick at least one study day"}
        </span>
      </div>

      <div style={{ height: 18 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 9,
        }}
      >
        {plan.cells.map((cell) => {
          const load = cell.items.reduce((a, it) => a + it.l.mins, 0);
          const isToday = cell.date.getTime() === today.getTime();
          const past = cell.date.getTime() < today.getTime();
          return (
            <div
              key={cell.date.toDateString()}
              className="min0"
              style={{
                borderRadius: 10,
                padding: 12,
                minHeight: 190,
                background: cell.study ? "var(--surface-inset)" : "transparent",
                boxShadow: isToday
                  ? "0 0 0 1px var(--color-accent)"
                  : cell.study
                    ? "var(--hairline)"
                    : "inset 0 0 0 1px rgba(233,233,237,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <div>
                  <div
                    className="kicker"
                    style={{ color: isToday ? "var(--color-accent-400)" : undefined }}
                  >
                    {DOW_SHORT[cell.dow]}
                  </div>
                  <div
                    className="tnum"
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      marginTop: 2,
                      color: cell.study ? "var(--color-text)" : "rgba(233,233,237,0.3)",
                    }}
                  >
                    {cell.date.getDate()}
                  </div>
                </div>
                <div
                  className="tnum"
                  style={{
                    fontSize: 10.5,
                    color:
                      load > plan.perDay * 1.3
                        ? "var(--color-warn-text)"
                        : "var(--text-muted)",
                  }}
                >
                  {load ? hm(load) : ""}
                </div>
              </div>

              <div style={{ height: 11 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cell.items.map((it) => {
                  const onClock = timerLectureId === it.l.id;
                  const mark = it.l.done
                    ? "var(--color-accent-700)"
                    : it.carried
                      ? "var(--color-warn-text)"
                      : it.live
                        ? "var(--color-accent-400)"
                        : "var(--color-accent)";
                  const prefix = it.l.done
                    ? "done · "
                    : it.live
                      ? "on the clock · "
                      : it.carried
                        ? `from ${it.carried} · `
                        : "";
                  return (
                    <div
                      key={it.l.id}
                      className="day-item"
                      style={{
                        borderRadius: 7,
                        padding: "8px 9px",
                        opacity: it.l.done ? 0.7 : 1,
                        background: it.l.done ? "var(--surface-done)" : "var(--color-surface)",
                        boxShadow: `inset 2px 0 0 ${mark}, 0 0 0 1px rgba(233,233,237,0.05)`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                        <button
                          type="button"
                          className="min0"
                          onClick={() => openCourse(it.c.id, it.s.id)}
                          style={{ flex: 1, cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                            {it.l.done ? (
                              <CheckCircle
                                size={11}
                                weight="fill"
                                color="var(--color-accent-400)"
                                style={{ flex: "none", marginTop: 2 }}
                              />
                            ) : null}
                            <div
                              className="min0 pretty"
                              style={{
                                fontSize: 11.5,
                                fontWeight: 500,
                                lineHeight: 1.3,
                                color: it.l.done ? "var(--text-complete)" : "var(--color-text)",
                                textDecoration: it.l.done ? "line-through" : "none",
                                textDecorationColor: "var(--color-accent-700)",
                              }}
                            >
                              {it.l.title}
                            </div>
                          </div>
                          <div
                            className="trunc"
                            style={{
                              fontSize: 10,
                              color: "var(--text-muted)",
                              marginTop: 4,
                              textDecoration: it.l.done ? "line-through" : "none",
                            }}
                          >
                            {prefix}
                            {it.l.mins}m · {short(it.s.title, 20)}
                          </div>
                        </button>
                        <IconButton
                          size={22}
                          fontSize={11}
                          title={onClock ? "On the clock now" : "Start studying this"}
                          onClick={() => startTimer(it.l.id)}
                          color={onClock ? "var(--color-accent-400)" : "rgba(233,233,237,0.3)"}
                        >
                          <Play size={11} weight="fill" />
                        </IconButton>
                      </div>
                    </div>
                  );
                })}

                {!cell.items.length ? (
                  <div
                    style={{ fontSize: 11, color: "rgba(233,233,237,0.28)", lineHeight: 1.5 }}
                  >
                    {!cell.study ? "Rest day" : past ? "Nothing logged" : "Free"}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
