import { Plus, Trash } from "@phosphor-icons/react";
import { flatten, workspacePct, noteKeys } from "../planner/derive";
import { parseIsoDate } from "../planner/dates";
import { initials, plural } from "../lib/format";
import { IconButton, Kicker, ProgressBar } from "../components/ui";
import { useApp } from "../store/store";

export function Launcher() {
  const spaces = useApp((s) => s.spaces);
  const wsId = useApp((s) => s.wsId);
  const set = useApp((s) => s.set);
  const switchWorkspace = useApp((s) => s.switchWorkspace);
  const newWorkspace = useApp((s) => s.newWorkspace);
  const deleteWorkspace = useApp((s) => s.deleteWorkspace);

  const remove = (id: string, name: string) => {
    // The app always keeps one workspace: there is nowhere for the user to land otherwise.
    if (spaces.length < 2) {
      set({ notice: "Keep at least one workspace." });
      return;
    }
    if (!window.confirm(`Delete “${name}” and everything in it?`)) return;
    deleteWorkspace(id);
  };

  return (
    <div
      className="scroll"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        background: "var(--surface-chrome)",
        padding: "52px 56px 150px",
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 1060 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
          }}
        >
          <div>
            <Kicker>StudyFrame</Kicker>
            <h1 style={{ margin: "8px 0 0", fontSize: 34, letterSpacing: "-0.025em" }}>
              Workspaces
            </h1>
            <div
              className="pretty"
              style={{
                fontSize: 13.5,
                color: "var(--text-secondary)",
                marginTop: 6,
                maxWidth: "54ch",
              }}
            >
              Each workspace is a separate study world — its own courses, roadmap, exam date,
              notes and review deck. Nothing bleeds between them.
            </div>
          </div>
          <button
            type="button"
            className="link-quiet"
            style={{ paddingTop: 8, flex: "none", fontSize: 12.5 }}
            onClick={() => set({ launcher: false })}
          >
            Close
          </button>
        </div>

        <div style={{ height: 34 }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(292px, 1fr))",
            gap: 16,
          }}
        >
          {spaces.map((s) => {
            const flat = flatten(s);
            const pct = workspacePct(s);
            return (
              <div
                key={s.id}
                className="launcher-card"
                style={{
                  borderRadius: 13,
                  padding: "20px 21px",
                  background: "var(--surface-card)",
                  boxShadow:
                    s.id === wsId
                      ? "0 0 0 1px var(--color-accent-700)"
                      : "var(--hairline)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    className="min0"
                    onClick={() => switchWorkspace(s.id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        flex: "none",
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-accent-300)",
                        background: "var(--color-accent-900)",
                      }}
                    >
                      {initials(s.name)}
                    </div>
                    <div className="min0">
                      <div
                        className="trunc"
                        style={{ fontSize: 15.5, fontWeight: 500, letterSpacing: "-0.01em" }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "rgba(233,233,237,0.44)",
                          marginTop: 2,
                        }}
                      >
                        {s.examDate
                          ? parseIsoDate(s.examDate).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "No target date"}
                      </div>
                    </div>
                  </button>
                  <IconButton
                    danger
                    size={26}
                    title="Delete workspace"
                    onClick={() => remove(s.id, s.name)}
                  >
                    <Trash size={14} />
                  </IconButton>
                </div>

                <div style={{ height: 20 }} />

                <button
                  type="button"
                  onClick={() => switchWorkspace(s.id)}
                  style={{ cursor: "pointer", width: "100%" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ProgressBar pct={pct} height={3} />
                    <span
                      className="tnum"
                      style={{ fontSize: 11.5, color: "var(--color-accent-400)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-complete)",
                      marginTop: 10,
                    }}
                  >
                    {plural(s.courses.length, "course")} · {plural(flat.length, "lecture")} ·{" "}
                    {flat.filter((x) => x.l.done).length} done
                  </div>
                  <div
                    style={{ fontSize: 11.5, color: "var(--text-complete)", marginTop: 3 }}
                  >
                    {plural(noteKeys(s).length, "note")} · {plural(s.cards.length, "card")} ·{" "}
                    {s.hoursPerWeek} h/week
                  </div>
                </button>
              </div>
            );
          })}

          <button
            type="button"
            className="dashed"
            onClick={newWorkspace}
            style={{
              borderRadius: 13,
              padding: "20px 21px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
              minHeight: 150,
            }}
          >
            <Plus size={20} />
            <div style={{ fontSize: 13.5 }}>New workspace</div>
            <div style={{ fontSize: 11.5, opacity: 0.7 }}>
              Start a new subject, or import one from a file.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
