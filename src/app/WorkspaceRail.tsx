import { ArrowsLeftRight, LinkSimple, SquaresFour } from "@phosphor-icons/react";
import { initials } from "../lib/format";
import { useApp } from "../store/store";

const TILE = {
  width: 34,
  height: 34,
  flex: "none" as const,
  borderRadius: 9,
  display: "grid" as const,
  placeItems: "center" as const,
  cursor: "pointer" as const,
};

export function WorkspaceRail() {
  const spaces = useApp((s) => s.spaces);
  const wsId = useApp((s) => s.wsId);
  const switchWorkspace = useApp((s) => s.switchWorkspace);
  const set = useApp((s) => s.set);

  return (
    <div
      style={{
        width: 54,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        padding: "11px 0",
        background: "var(--surface-chrome)",
        boxShadow: "inset -1px 0 0 rgba(233,233,237,0.07)",
      }}
    >
      {spaces.map((s) => {
        const active = s.id === wsId;
        return (
          <button
            key={s.id}
            type="button"
            className="tile"
            title={s.name}
            onClick={() => switchWorkspace(s.id)}
            style={{
              ...TILE,
              fontSize: 11.5,
              fontWeight: 500,
              color: active ? "var(--color-accent-300)" : "rgba(233,233,237,0.55)",
              background: active ? "var(--color-accent-900)" : "var(--surface-card)",
              boxShadow: active
                ? "inset 0 0 0 1px var(--color-accent)"
                : "inset 0 0 0 1px rgba(233,233,237,0.07)",
            }}
          >
            {initials(s.name)}
          </button>
        );
      })}

      <button
        type="button"
        className="tile"
        title="All workspaces"
        onClick={() => set({ launcher: true })}
        style={{
          ...TILE,
          color: "rgba(233,233,237,0.38)",
          boxShadow: "inset 0 0 0 1px rgba(233,233,237,0.09)",
        }}
      >
        <SquaresFour size={15} />
      </button>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        className="tile"
        title="Import a course from a link"
        onClick={() => set({ dialog: "import", draft: null, importNote: "", importErr: false })}
        style={{ ...TILE, color: "var(--text-complete)" }}
      >
        <LinkSimple size={16} />
      </button>
      <button
        type="button"
        className="tile"
        title="Import / export workspaces"
        onClick={() => set({ dialog: "transfer" })}
        style={{ ...TILE, color: "var(--text-complete)" }}
      >
        <ArrowsLeftRight size={16} />
      </button>
    </div>
  );
}
