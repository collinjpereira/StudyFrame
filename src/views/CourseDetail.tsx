import {
  ArrowLeft,
  CaretRight,
  Check,
  Minus,
  NotePencil,
  PencilSimple,
  Play,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { coursePct, sectionMins } from "../planner/derive";
import { hm, plural } from "../lib/format";
import { Button, IconButton, Kicker, ProgressBar } from "../components/ui";
import { useApp } from "../store/store";

export function CourseDetail({ ws }: { ws: Workspace }) {
  const courseId = useApp((s) => s.courseId);
  const openSection = useApp((s) => s.openSection);
  const editMode = useApp((s) => s.editMode);
  const timerLectureId = useApp((s) => s.timer.lectureId);
  const set = useApp((s) => s.set);
  const goto = useApp((s) => s.goto);
  const mutate = useApp((s) => s.mutate);
  const openNote = useApp((s) => s.openNote);
  const startTimer = useApp((s) => s.startTimer);
  const toggleLecture = useApp((s) => s.toggleLecture);
  const deleteCourse = useApp((s) => s.deleteCourse);
  const deleteSection = useApp((s) => s.deleteSection);
  const deleteLecture = useApp((s) => s.deleteLecture);

  const course = ws.courses.find((c) => c.id === courseId) || ws.courses[0];
  if (!course) return null;
  const cid = course.id;
  const all = course.sections.flatMap((s) => s.lectures);

  const editSection = (sectionId: string, fn: (s: NonNullable<typeof course>["sections"][number]) => void) =>
    mutate((w) => {
      const section = w.courses.find((c) => c.id === cid)?.sections.find((s) => s.id === sectionId);
      if (section) fn(section);
    });

  const removeCourse = () => {
    if (!window.confirm(`Delete “${course.title}” from ${ws.name}? Its notes and cards go too.`))
      return;
    deleteCourse(cid);
  };

  return (
    <div
      className="scroll"
      style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "26px 34px 150px" }}
    >
      <button
        type="button"
        className="link-quiet"
        onClick={() => goto("board")}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={13} />
        Courses
      </button>

      <div style={{ maxWidth: 800, marginTop: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div className="min0" style={{ flex: 1 }}>
            {editMode ? (
              <>
                <input
                  className="input input-sm"
                  value={course.provider}
                  placeholder="Provider / instructor"
                  onChange={(e) => {
                    const v = e.target.value;
                    mutate((w) => {
                      const c = w.courses.find((x) => x.id === cid);
                      if (c) c.provider = v;
                    });
                  }}
                  style={{
                    maxWidth: 340,
                    fontSize: 11.5,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(233,233,237,0.6)",
                  }}
                />
                <input
                  className="input"
                  value={course.title}
                  placeholder="Course title"
                  onChange={(e) => {
                    const v = e.target.value;
                    mutate((w) => {
                      const c = w.courses.find((x) => x.id === cid);
                      if (c) c.title = v;
                    });
                  }}
                  style={{
                    marginTop: 8,
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                  }}
                />
              </>
            ) : (
              <>
                <Kicker>{course.provider}</Kicker>
                <h1
                  className="pretty"
                  style={{
                    margin: "6px 0 0",
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.15,
                  }}
                >
                  {course.title}
                </h1>
              </>
            )}
          </div>

          <div style={{ flex: "none", display: "flex", gap: 9 }}>
            <Button
              size="sm"
              variant={editMode ? "primary" : "secondary"}
              title="Edit sections and lectures"
              onClick={() => set({ editMode: !editMode })}
              style={editMode ? { background: "rgba(145,132,217,0.14)" } : undefined}
            >
              {editMode ? <Check size={13} /> : <PencilSimple size={13} />}
              {editMode ? "Done editing" : "Edit"}
            </Button>
            <Button size="sm" variant="secondary" danger title="Delete this course" onClick={removeCourse}>
              <Trash size={13} />
              Delete
            </Button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
          <ProgressBar pct={coursePct(course)} height={3} />
          <div
            className="tnum"
            style={{ fontSize: 12.5, color: "rgba(233,233,237,0.52)" }}
          >
            {all.filter((l) => l.done).length} of {all.length} lectures ·{" "}
            {hm(all.filter((l) => !l.done).reduce((a, l) => a + l.mins, 0))} left
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "rgba(233,233,237,0.36)", marginTop: 10 }}>
          {course.source}
        </div>

        <div style={{ height: 24 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {course.sections.map((s) => {
            const total = s.lectures.length;
            const done = s.lectures.filter((l) => l.done).length;
            // Everything expands while editing, so nothing hides behind a caret.
            const open = editMode || openSection === s.id;
            return (
              <div
                key={s.id}
                style={{
                  borderRadius: 10,
                  background: "var(--surface-card)",
                  boxShadow: "var(--hairline)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}
                >
                  <button
                    type="button"
                    onClick={() => set({ openSection: open && !editMode ? null : s.id })}
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${s.title}`}
                    style={{
                      cursor: "pointer",
                      color: "rgba(233,233,237,0.38)",
                      display: "grid",
                      placeItems: "center",
                      transform: open ? "rotate(90deg)" : "none",
                    }}
                  >
                    <CaretRight size={12} />
                  </button>

                  {editMode ? (
                    <div
                      className="min0"
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        className="input"
                        value={s.title}
                        onChange={(e) => {
                          const v = e.target.value;
                          editSection(s.id, (x) => {
                            x.title = v;
                          });
                        }}
                        style={{
                          flex: 1,
                          minWidth: 180,
                          padding: "7px 10px",
                          fontSize: 13.5,
                          fontWeight: 500,
                        }}
                      />
                      <div
                        style={{
                          flex: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          borderRadius: 6,
                          boxShadow: "inset 0 0 0 1px rgba(233,233,237,0.12)",
                        }}
                      >
                        <button
                          type="button"
                          title="Earlier week"
                          onClick={() =>
                            editSection(s.id, (x) => {
                              x.week = Math.max(1, x.week - 1);
                            })
                          }
                          style={{
                            width: 26,
                            height: 30,
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            color: "rgba(233,233,237,0.55)",
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <div
                          className="tnum"
                          style={{
                            minWidth: 52,
                            textAlign: "center",
                            fontSize: 11.5,
                            color: "var(--color-accent-300)",
                          }}
                        >
                          Wk {s.week}
                        </div>
                        <button
                          type="button"
                          title="Later week"
                          onClick={() =>
                            editSection(s.id, (x) => {
                              x.week = Math.min(14, x.week + 1);
                            })
                          }
                          style={{
                            width: 26,
                            height: 30,
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            color: "rgba(233,233,237,0.55)",
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <IconButton
                        danger
                        size={30}
                        title="Delete section"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete section “${s.title}” and its ${total} lectures? Their notes and cards go too.`,
                            )
                          )
                            return;
                          deleteSection(cid, s.id);
                        }}
                      >
                        <Trash size={14} />
                      </IconButton>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="min0"
                        onClick={() => set({ openSection: open ? null : s.id })}
                        style={{ flex: 1, cursor: "pointer" }}
                      >
                        <div className="pretty" style={{ fontSize: 14, fontWeight: 500 }}>
                          {s.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-complete)",
                            marginTop: 2,
                          }}
                        >
                          {done} of {plural(total, "lecture")} done · {hm(sectionMins(s))}
                        </div>
                      </button>
                      <div
                        style={{
                          flex: "none",
                          fontSize: 10.5,
                          padding: "3px 9px",
                          borderRadius: 999,
                          color: "var(--color-accent-300)",
                          background: "rgba(145,132,217,0.16)",
                        }}
                      >
                        Week {s.week}
                      </div>
                    </>
                  )}
                </div>

                {open ? (
                  <div style={{ padding: "0 16px 9px" }}>
                    {s.lectures.map((l) => {
                      const actual = ws.actuals[l.id] || 0;
                      const onClock = timerLectureId === l.id;
                      const hasNote = (ws.notes[l.id] || "").trim().length > 0;
                      return (
                        <div
                          key={l.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "9px 0",
                            boxShadow: "inset 0 1px 0 rgba(233,233,237,0.06)",
                          }}
                        >
                          <button
                            type="button"
                            className="checkbox"
                            role="checkbox"
                            aria-checked={l.done}
                            aria-label={`Mark ${l.title} complete`}
                            onClick={() => toggleLecture(cid, l.id)}
                            style={{ width: 17, height: 17 }}
                          />

                          {editMode ? (
                            <>
                              <input
                                className="input"
                                value={l.title}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  editSection(s.id, (x) => {
                                    const target = x.lectures.find((y) => y.id === l.id);
                                    if (target) target.title = v;
                                  });
                                }}
                                style={{ flex: 1, minWidth: 0, padding: "6px 9px", fontSize: 13 }}
                              />
                              <input
                                className="input tnum"
                                type="number"
                                min={1}
                                max={600}
                                value={l.mins}
                                title="Minutes"
                                onChange={(e) => {
                                  const v = Math.max(
                                    1,
                                    Math.min(600, parseInt(e.target.value, 10) || 1),
                                  );
                                  editSection(s.id, (x) => {
                                    const target = x.lectures.find((y) => y.id === l.id);
                                    if (target) target.mins = v;
                                  });
                                }}
                                style={{
                                  width: 66,
                                  flex: "none",
                                  padding: "6px 8px",
                                  fontSize: 12.5,
                                  textAlign: "right",
                                }}
                              />
                              <IconButton
                                danger
                                size={26}
                                title="Delete lecture"
                                onClick={() => deleteLecture(cid, s.id, l.id)}
                              >
                                <Trash size={13} />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <div
                                className="trunc"
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  fontSize: 13.5,
                                  color: l.done ? "var(--text-complete)" : "var(--color-text)",
                                  textDecoration: l.done ? "line-through" : "none",
                                }}
                              >
                                {l.title}
                              </div>
                              <div
                                className="tnum"
                                title={
                                  actual > 0
                                    ? `You took ${actual} min; the video runs ${l.mins}`
                                    : "Runtime"
                                }
                                style={{
                                  fontSize: 11.5,
                                  color:
                                    actual > l.mins * 1.2
                                      ? "var(--color-warn-text)"
                                      : actual > 0
                                        ? "var(--color-accent-400)"
                                        : "rgba(233,233,237,0.36)",
                                }}
                              >
                                {actual > 0 ? `${actual}m / ${l.mins}m` : `${l.mins}m`}
                              </div>
                              <IconButton
                                size={26}
                                fontSize={12}
                                title={onClock ? "On the clock now" : "Start studying this"}
                                onClick={() => startTimer(l.id)}
                                color={onClock ? "var(--color-accent-400)" : undefined}
                              >
                                <Play size={12} weight="fill" />
                              </IconButton>
                              <IconButton
                                size={26}
                                title="Open note"
                                onClick={() => openNote(l.id)}
                                color={hasNote ? "var(--color-accent-400)" : undefined}
                              >
                                <NotePencil size={14} />
                              </IconButton>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {editMode ? (
                      <button
                        type="button"
                        className="link-quiet"
                        onClick={() =>
                          editSection(s.id, (x) => {
                            x.lectures.push({
                              id: `${s.id}-l${Date.now()}`,
                              title: "New lecture",
                              mins: 10,
                              done: false,
                            });
                          })
                        }
                        style={{
                          marginTop: 9,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <Plus size={12} />
                        Add lecture
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          {editMode ? (
            <button
              type="button"
              className="dashed"
              onClick={() =>
                mutate((w) => {
                  const c = w.courses.find((x) => x.id === cid);
                  if (!c) return;
                  const base = `s${Date.now()}`;
                  const lastWeek = c.sections.length ? c.sections[c.sections.length - 1].week : 1;
                  c.sections.push({
                    id: base,
                    title: "New section",
                    week: lastWeek,
                    lectures: [
                      { id: `${base}-l0`, title: "New lecture", mins: 10, done: false },
                    ],
                  });
                })
              }
              style={{
                borderRadius: 10,
                padding: "13px 16px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              <Plus size={14} />
              Add section
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
