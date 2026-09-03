import {
  CalendarDots,
  Cards,
  ChartLineUp,
  Columns,
  LinkSimple,
  Note,
  Plus,
  SunHorizon,
} from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { coursePct, noteKeys, remainingMins } from "../planner/derive";
import { daysTo } from "../planner/dates";
import { hm, plural, short } from "../lib/format";
import { ProgressBar } from "../components/ui";
import { useApp, type View } from "../store/store";

const NAV: { view: View; label: string; icon: typeof SunHorizon }[] = [
  { view: "today", label: "Today", icon: SunHorizon },
  { view: "roadmap", label: "Roadmap", icon: CalendarDots },
  { view: "board", label: "Courses", icon: Columns },
  { view: "notes", label: "Notes", icon: Note },
  { view: "review", label: "Review", icon: Cards },
  { view: "stats", label: "Stats", icon: ChartLineUp },
];

export function Sidebar({ ws }: { ws: Workspace }) {
  const view = useApp((s) => s.view);
  const courseId = useApp((s) => s.courseId);
  const goto = useApp((s) => s.goto);
  const openCourse = useApp((s) => s.openCourse);
  const newCourse = useApp((s) => s.newCourse);
  const set = useApp((s) => s.set);

  const days = ws.examDate ? daysTo(ws.examDate) : 0;
  const goal = ws.examDate
    ? days > 0
      ? `${plural(days, "day")} to the exam`
      : "Target date passed"
    : `${hm(remainingMins(ws))} of material left`;

  const counts: Partial<Record<View, string>> = {
    board: String(ws.courses.length),
    notes: String(noteKeys(ws).length),
    review: String(ws.cards.length),
  };
  // Course detail is reached from Courses, so that row stays lit while it is open.
  const active: View = view === "course" ? "board" : view;

  return (
    <div
      className="scroll"
      style={{
        width: 222,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "16px 12px",
        background: "var(--surface-sidebar)",
        boxShadow: "inset -1px 0 0 rgba(233,233,237,0.07)",
        overflowY: "auto",
      }}
    >
      <button
        type="button"
        className="nav-row"
        onClick={() => set({ dialog: "plan" })}
        style={{ padding: 8, borderRadius: 8, cursor: "pointer", width: "100%" }}
      >
        <div className="kicker">Workspace</div>
        <div
          style={{
            fontSize: 16.5,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            marginTop: 3,
            lineHeight: 1.2,
          }}
        >
          {ws.name}
        </div>
        <div style={{ fontSize: 11.5, color: "rgba(233,233,237,0.46)", marginTop: 3 }}>{goal}</div>
      </button>

      <div style={{ height: 14 }} />

      {NAV.map(({ view: v, label, icon: Icon }) => {
        const on = active === v;
        return (
          <button
            key={v}
            type="button"
            className="nav-row"
            onClick={() => goto(v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 8px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13.5,
              color: on ? "var(--color-accent-300)" : "rgba(233,233,237,0.72)",
              background: on ? "var(--color-accent-900)" : "transparent",
              boxShadow: on ? "inset 2px 0 0 var(--color-accent)" : "none",
            }}
          >
            <Icon size={16} />
            {label}
            <span
              className="tnum"
              style={{
                marginLeft: "auto",
                fontSize: 10.5,
                color: "rgba(233,233,237,0.38)",
              }}
            >
              {counts[v] ?? ""}
            </span>
          </button>
        );
      })}

      <div style={{ height: 18 }} />
      <div className="kicker" style={{ padding: "0 8px 6px" }}>
        Courses
      </div>

      {ws.courses.map((c) => {
        const on = view === "course" && c.id === courseId;
        const pct = coursePct(c);
        return (
          <button
            key={c.id}
            type="button"
            className="nav-row"
            onClick={() => openCourse(c.id)}
            style={{
              padding: "7px 8px",
              borderRadius: 6,
              cursor: "pointer",
              width: "100%",
              background: on ? "var(--color-accent-900)" : "transparent",
            }}
          >
            <div
              className="trunc"
              style={{
                fontSize: 12.5,
                color: on ? "var(--color-accent-300)" : "rgba(233,233,237,0.78)",
              }}
            >
              {short(c.title, 26)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
              <ProgressBar pct={pct} />
              <div className="tnum" style={{ fontSize: 10, color: "rgba(233,233,237,0.38)" }}>
                {pct}%
              </div>
            </div>
          </button>
        );
      })}

      <button
        type="button"
        className="sidebar-action"
        style={{ marginTop: 5 }}
        onClick={() => set({ dialog: "import", draft: null, importNote: "", importErr: false })}
      >
        <LinkSimple size={14} />
        Import from a link
      </button>
      <button type="button" className="sidebar-action" onClick={newCourse}>
        <Plus size={14} />
        Blank course
      </button>
    </div>
  );
}
