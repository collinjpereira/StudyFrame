import { Warning } from "@phosphor-icons/react";
import { useApp } from "../store/store";

/**
 * A dismissible inline banner for errors that would otherwise need
 * window.alert — blocked in some webviews, per CODE-STYLE.md.
 */
export function Notice() {
  const notice = useApp((s) => s.notice);
  const set = useApp((s) => s.set);
  if (!notice) return null;

  return (
    <div
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 18px",
        fontSize: 12.5,
        color: "var(--color-warn-bright)",
        background: "rgba(126,43,53,0.16)",
        boxShadow: "inset 0 -1px 0 rgba(233,233,237,0.07)",
      }}
    >
      <Warning size={16} />
      <span className="min0 pretty" style={{ flex: 1 }}>
        {notice}
      </span>
      <button type="button" className="link-quiet" onClick={() => set({ notice: null })}>
        Dismiss
      </button>
    </div>
  );
}
