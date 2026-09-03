import { LinkSimple, Trash } from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { coursePct, sectionMins } from "../planner/derive";
import { hm, short } from "../lib/format";
import { Button, IconButton, Kicker, ProgressBar, ScreenTitle } from "../components/ui";
import { useApp } from "../store/store";

export function CoursesBoard({ ws }: { ws: Workspace }) {
  const set = useApp((s) => s.set);
  const openCourse = useApp((s) => s.openCourse);
  const deleteCourse = useApp((s) => s.deleteCourse);

  const openImport = () =>
    set({ dialog: "import", draft: null, importNote: "", importErr: false });

  const confirmDelete = (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}” from ${ws.name}? Its notes and cards go too.`)) return;
    deleteCourse(id);
  };

  return (
    <div
      className="scroll"
      style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "28px 34px 150px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <ScreenTitle
          title="Courses"
          sub="One column per course. Click a section to open its lectures."
        />
        <Button onClick={openImport}>
          <LinkSimple size={14} />
          Import from a link
        </Button>
      </div>

      <div style={{ height: 24 }} />

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {ws.courses.map((c) => {
          const all = c.sections.flatMap((s) => s.lectures);
          return (
            <div
              key={c.id}
              style={{
                width: 286,
                flex: "none",
                borderRadius: 11,
                padding: 15,
                background: "var(--surface-sidebar)",
                boxShadow: "var(--hairline)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <button
                  type="button"
                  className="min0"
                  onClick={() => openCourse(c.id)}
                  style={{ flex: 1, cursor: "pointer" }}
                >
                  <Kicker>{short(c.provider, 34)}</Kicker>
                  <div
                    className="pretty"
                    style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3, marginTop: 5 }}
                  >
                    {c.title}
                  </div>
                </button>
                <IconButton
                  danger
                  size={26}
                  title="Delete course"
                  onClick={() => confirmDelete(c.id, c.title)}
                >
                  <Trash size={14} />
                </IconButton>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 10 }}>
                <ProgressBar pct={coursePct(c)} />
                <span
                  className="tnum"
                  style={{ fontSize: 11, color: "rgba(233,233,237,0.44)" }}
                >
                  {all.filter((l) => l.done).length}/{all.length}
                </span>
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {c.sections.map((s) => {
                  const total = s.lectures.length;
                  const done = s.lectures.filter((l) => l.done).length;
                  const complete = total > 0 && done === total;
                  const mark = complete ? "var(--color-accent-700)" : "var(--color-accent)";
                  const thisWeek = s.week === 1;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="card-open"
                      onClick={() => openCourse(c.id, s.id)}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        padding: "10px 11px",
                        cursor: "pointer",
                        background: "var(--color-surface)",
                        boxShadow: `inset 2px 0 0 ${mark}, 0 0 0 1px rgba(233,233,237,0.05)`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          className="pretty"
                          style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}
                        >
                          {s.title}
                        </div>
                        <span
                          style={{
                            flex: "none",
                            fontSize: 10,
                            padding: "2px 7px",
                            borderRadius: 999,
                            color: thisWeek
                              ? "var(--color-accent-300)"
                              : "rgba(233,233,237,0.44)",
                            background: thisWeek
                              ? "rgba(145,132,217,0.18)"
                              : "rgba(233,233,237,0.06)",
                          }}
                        >
                          W{s.week}
                        </span>
                      </div>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8 }}
                      >
                        <ProgressBar
                          pct={total ? Math.round((done / total) * 100) : 0}
                          fill={mark}
                        />
                        <span
                          className="tnum"
                          style={{ fontSize: 10, color: "var(--text-muted)" }}
                        >
                          {done}/{total} · {hm(sectionMins(s))}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="dashed"
          onClick={openImport}
          style={{
            width: 286,
            flex: "none",
            padding: "22px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          <LinkSimple size={19} />
          <div style={{ fontSize: 13.5 }}>Add a course</div>
          <div className="pretty" style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.5 }}>
            Paste a Udemy link and StudyFrame reads the sections, lecture list and runtimes.
          </div>
        </button>
      </div>
    </div>
  );
}
