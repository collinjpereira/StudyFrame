import { useEffect } from "react";
import { currentWorkspace, useApp } from "../store/store";
import { flushStore } from "../store/persist";
import { usePendingImport } from "./usePendingImport";
import { useFlushOnClose } from "./useFlushOnClose";
import { TitleBar } from "./TitleBar";
import { WorkspaceRail } from "./WorkspaceRail";
import { Sidebar } from "./Sidebar";
import { RecoveryNotice } from "./RecoveryNotice";
import { Notice } from "./Notice";
import { Today } from "../views/Today";
import { Roadmap } from "../views/Roadmap";
import { CoursesBoard } from "../views/CoursesBoard";
import { CourseDetail } from "../views/CourseDetail";
import { Notes } from "../views/Notes";
import { Review } from "../views/Review";
import { Stats } from "../views/Stats";
import { Launcher } from "../views/Launcher";
import { TimerDock } from "../timer/TimerDock";
import { StudyPlanDialog } from "../dialogs/StudyPlanDialog";
import { ImportCourseDialog } from "../dialogs/ImportCourseDialog";
import { TransferDialog } from "../dialogs/TransferDialog";

export function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  const view = useApp((s) => s.view);
  const launcher = useApp((s) => s.launcher);
  const dialog = useApp((s) => s.dialog);
  const spaces = useApp((s) => s.spaces);
  const wsId = useApp((s) => s.wsId);
  const tick = useApp((s) => s.tick);
  const timerActive = useApp((s) => s.timer.running || s.timer.onBreak);

  useEffect(() => {
    void init();
  }, [init]);

  // One interval, and it only runs while the clock does.
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerActive, tick]);

  // Pending writes must land before the window goes away.
  useEffect(() => {
    const flush = () => void flushStore();
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);

  useFlushOnClose();
  usePendingImport(ready);

  if (!ready || !spaces.length) return null;
  const ws = currentWorkspace({ spaces, wsId } as never);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontSize: 15,
        lineHeight: 1.55,
        overflow: "hidden",
      }}
    >
      <TitleBar workspaceName={ws.name} />
      <RecoveryNotice />
      <Notice />

      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        <WorkspaceRail />
        <Sidebar ws={ws} />

        <div className="min0" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {view === "today" ? <Today ws={ws} /> : null}
          {view === "roadmap" ? <Roadmap ws={ws} /> : null}
          {view === "board" ? <CoursesBoard ws={ws} /> : null}
          {view === "course" ? <CourseDetail ws={ws} /> : null}
          {view === "notes" ? <Notes ws={ws} /> : null}
          {view === "review" ? <Review ws={ws} /> : null}
          {view === "stats" ? <Stats ws={ws} /> : null}
        </div>

        {launcher ? <Launcher /> : null}
      </div>

      <TimerDock ws={ws} />

      {dialog === "plan" ? <StudyPlanDialog ws={ws} /> : null}
      {dialog === "import" ? <ImportCourseDialog ws={ws} /> : null}
      {dialog === "transfer" ? <TransferDialog ws={ws} /> : null}
    </div>
  );
}
