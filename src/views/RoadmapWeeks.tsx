import { useRef } from "react";
import type { Workspace } from "../store/types";
import { sectionMins, weekCount, weekLoads } from "../planner/derive";
import { addDays, mondayOf } from "../planner/dates";
import { dateRange, hm, short } from "../lib/format";
import { ProgressBar } from "../components/ui";
import { useApp } from "../store/store";

const CELL_MIN = 118;
const GUTTER = 190;

export function RoadmapWeeks({ ws }: { ws: Workspace }) {
  const set = useApp((s) => s.set);
  const openCourse = useApp((s) => s.openCourse);
  const mutate = useApp((s) => s.mutate);
  /** The section being dragged. A ref, not state: nothing re-renders mid-drag. */
  const dragged = useRef<{ courseId: string; sectionId: string } | null>(null);

  const count = weekCount(ws);
  const loads = weekLoads(ws);
  const weeks = Array.from({ length: count }, (_, i) => i + 1);
  const budget = ws.hoursPerWeek * 60;

  const reassign = (weekNo: number) => {
    const d = dragged.current;
    dragged.current = null;
    if (!d) return;
    mutate((w) => {
      const section = w.courses
        .find((c) => c.id === d.courseId)
        ?.sections.find((s) => s.id === d.sectionId);
      if (section) section.week = weekNo;
    });
  };

  return (
    <>
      <div style={{ height: 18 }} />

      <div style={{ display: "flex", paddingLeft: GUTTER, paddingRight: 34 }}>
        {weeks.map((n) => {
          const start = mondayOf(n);
          const load = loads[n] || 0;
          return (
            <button
              key={n}
              type="button"
              className="week-head"
              title="Open this week day by day"
              onClick={() => set({ roadmapMode: "days", dayWeek: n })}
              style={{
                flex: 1,
                minWidth: CELL_MIN,
                padding: "4px 6px 8px",
                cursor: "pointer",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: n === 1 ? "var(--color-accent-400)" : "rgba(233,233,237,0.6)",
                }}
              >
                {n === 1 ? "This week" : `Week ${n}`}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 1 }}>
                {dateRange(start, addDays(start, 6))}
              </div>
              <div
                className="tnum"
                style={{
                  fontSize: 10,
                  marginTop: 3,
                  // Over a quarter past budget is worth flagging, not hiding.
                  color: load > budget * 1.25 ? "var(--color-warn-text)" : "rgba(233,233,237,0.34)",
                }}
              >
                {load ? hm(load) : "—"}
              </div>
            </button>
          );
        })}
      </div>

      {ws.courses.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            alignItems: "stretch",
            paddingRight: 34,
            boxShadow: "inset 0 1px 0 rgba(233,233,237,0.07)",
          }}
        >
          <button
            type="button"
            onClick={() => openCourse(c.id)}
            style={{
              width: GUTTER,
              flex: "none",
              padding: "16px 18px 16px 0",
              cursor: "pointer",
            }}
          >
            <div className="pretty" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>
              {short(c.title, 30)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
              {short(c.provider, 30)}
            </div>
          </button>

          {weeks.map((n) => (
            <div
              key={n}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                reassign(n);
              }}
              style={{
                flex: 1,
                minWidth: CELL_MIN,
                padding: "11px 6px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: n === 1 ? "rgba(145,132,217,0.05)" : "transparent",
                boxShadow: "inset 1px 0 0 rgba(233,233,237,0.05)",
              }}
            >
              {c.sections
                .filter((s) => s.week === n)
                .map((s) => {
                  const total = s.lectures.length;
                  const done = s.lectures.filter((l) => l.done).length;
                  const complete = total > 0 && done === total;
                  const mark = complete ? "var(--color-accent-700)" : "var(--color-accent)";
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => {
                        dragged.current = { courseId: c.id, sectionId: s.id };
                      }}
                      onClick={() => openCourse(c.id, s.id)}
                      className="sec-block"
                      style={{
                        boxShadow: `inset 2px 0 0 ${mark}, 0 0 0 1px rgba(233,233,237,0.06)`,
                      }}
                    >
                      <div
                        className="pretty"
                        style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.25 }}
                      >
                        {s.title}
                      </div>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}
                      >
                        <ProgressBar
                          pct={total ? Math.round((done / total) * 100) : 0}
                          fill={mark}
                        />
                        <span
                          className="tnum"
                          style={{ fontSize: 9.5, color: "var(--text-muted)" }}
                        >
                          {done}/{total} · {hm(sectionMins(s))}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
