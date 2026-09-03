import { Warning } from "@phosphor-icons/react";
import { useApp } from "../store/store";

/**
 * If the live library could not be read, the user is told which file was
 * recovered. Starting empty in silence would look like the data was lost.
 */
export function RecoveryNotice() {
  const recovered = useApp((s) => s.recovered);
  const set = useApp((s) => s.set);
  if (!recovered) return null;

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
        {recovered}
      </span>
      <button type="button" className="link-quiet" onClick={() => set({ recovered: null })}>
        Dismiss
      </button>
    </div>
  );
}
