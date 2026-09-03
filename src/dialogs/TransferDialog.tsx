import { Export, Stack, TrayArrowDown } from "@phosphor-icons/react";
import type { ExportFile, Workspace } from "../store/types";
import { flatten, noteKeys } from "../planner/derive";
import { plural, short, slug } from "../lib/format";
import { openTextFile, saveTextFile } from "../lib/files";
import { Button, DialogIntro, DialogTitle, Modal } from "../components/ui";
import { prepareImport, useApp } from "../store/store";
import { storeBytes } from "../store/persist";

const FILTERS = [{ name: "StudyFrame workspace", extensions: ["json"] }];

export function TransferDialog({ ws }: { ws: Workspace }) {
  const spaces = useApp((s) => s.spaces);
  const set = useApp((s) => s.set);
  const importWorkspaces = useApp((s) => s.importWorkspaces);

  const close = () => set({ dialog: null });
  const flat = flatten(ws);

  const envelope = (payload: Workspace[]): ExportFile => ({
    app: "studyframe",
    version: 1,
    exportedAt: new Date().toISOString(),
    spaces: payload,
  });

  const exportOne = () =>
    saveTextFile(
      `${slug(ws.name)}.studyframe.json`,
      JSON.stringify(envelope([ws]), null, 2),
      FILTERS,
    );

  const exportAll = () =>
    saveTextFile(
      "all-workspaces.studyframe.json",
      JSON.stringify(envelope(spaces), null, 2),
      FILTERS,
    );

  const importFile = async () => {
    const text = await openTextFile(FILTERS);
    if (text == null) return;
    try {
      // Validate the envelope before anything touches the library.
      const incoming = prepareImport(JSON.parse(text), spaces);
      importWorkspaces(incoming);
    } catch (err) {
      set({ notice: err instanceof Error ? err.message : "That file isn't a StudyFrame export." });
    }
  };

  const actions = [
    {
      icon: Export,
      title: `Export “${short(ws.name, 26)}”`,
      sub: `${plural(ws.courses.length, "course")} · ${plural(flat.length, "lecture")} · ${plural(
        noteKeys(ws).length,
        "note",
      )} · ${plural(ws.cards.length, "card")}`,
      go: () => void exportOne(),
    },
    {
      icon: Stack,
      title: "Export all workspaces",
      sub: `${plural(spaces.length, "workspace")} · one backup file`,
      go: () => void exportAll(),
    },
    {
      icon: TrayArrowDown,
      title: "Import from file…",
      sub: "Merges into this library — nothing is overwritten",
      go: () => void importFile(),
    },
  ];

  const kb = (
    storeBytes({ schema: 1, spaces, savedAt: new Date().toISOString() }) / 1024
  ).toFixed(1);

  return (
    <Modal width={530} onClose={close}>
      <DialogTitle>Transfer workspaces</DialogTitle>
      <DialogIntro>
        One portable{" "}
        <code style={{ fontSize: 12.5, color: "var(--color-accent-300)" }}>
          .studyframe.json
        </code>{" "}
        file carries the planner, sections, lecture progress, notes and cards for the workspaces
        you pick. Import merges — a workspace with the same name arrives alongside, never over the
        top.
      </DialogIntro>

      <div style={{ height: 19 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map(({ icon: Icon, title, sub, go }) => (
          <button
            key={title}
            type="button"
            className="row-hover"
            onClick={go}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "13px 15px",
              borderRadius: 9,
              cursor: "pointer",
              background: "var(--color-surface)",
              boxShadow: "0 0 0 1px rgba(233,233,237,0.07)",
            }}
          >
            <Icon size={18} color="var(--color-accent-400)" />
            <div className="min0">
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{title}</div>
              <div
                style={{ fontSize: 11.5, color: "rgba(233,233,237,0.45)", marginTop: 2 }}
              >
                {sub}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 19,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: "rgba(233,233,237,0.34)" }}>
          Saved locally · {kb} KB · no account, no cloud
        </span>
        <Button onClick={close} style={{ padding: "7px 16px" }}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
