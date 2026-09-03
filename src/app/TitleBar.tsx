import { Timer } from "@phosphor-icons/react";
import { clock as fmtClock } from "../lib/format";
import { elapsed } from "../store/timer";
import { useApp } from "../store/store";
import { isDesktop } from "../store/tauri";

async function windowAction(action: "minimize" | "toggleMaximize" | "close") {
  if (!isDesktop()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  if (action === "minimize") await win.minimize();
  else if (action === "toggleMaximize") await win.toggleMaximize();
  else await win.close();
}

export function TitleBar({ workspaceName }: { workspaceName: string }) {
  const timer = useApp((s) => s.timer);
  const now = useApp((s) => s.now);
  const active = timer.running || timer.onBreak;
  const e = elapsed(timer, now);

  return (
    <div
      // The bar is the window's drag handle; the shell draws no chrome of its own.
      data-tauri-drag-region
      style={{
        height: 34,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 12,
        background: "var(--surface-chrome)",
        boxShadow: "inset 0 -1px 0 rgba(233,233,237,0.07)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }} data-tauri-drag-region>
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: 4,
            background: "linear-gradient(140deg, var(--color-accent), var(--color-accent-700))",
          }}
        />
        <span style={{ fontSize: 12, color: "rgba(233,233,237,0.66)" }}>
          StudyFrame — {workspaceName}
        </span>
        {active ? (
          <span
            className="tnum"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 9px",
              borderRadius: 999,
              fontSize: 11,
              color: timer.onBreak ? "rgba(233,233,237,0.6)" : "var(--color-accent-400)",
              background: "var(--color-accent-900)",
            }}
          >
            <Timer size={11} weight="fill" />
            {timer.onBreak ? `Break ${fmtClock(e.breaks)}` : fmtClock(e.focus)}
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <button
          type="button"
          className="titlebar-btn"
          title="Minimize"
          onClick={() => void windowAction("minimize")}
        >
          <div style={{ width: 10, height: 1, background: "currentColor" }} />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          title="Maximize"
          onClick={() => void windowAction("toggleMaximize")}
        >
          <div
            style={{ width: 9, height: 9, border: "1px solid currentColor", borderRadius: 2 }}
          />
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-close"
          title="Close"
          onClick={() => void windowAction("close")}
          style={{ fontSize: 13 }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
