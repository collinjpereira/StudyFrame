import { useCallback, useEffect } from "react";
import { readPath } from "../lib/files";
import { invoke, isDesktop } from "../store/tauri";
import { prepareImport, useApp } from "../store/store";

/**
 * Double-clicking a `.studyframe.json` launches the app with that path. The
 * shell holds it until the UI is ready, then it goes straight into the import
 * flow — the same merge as the transfer dialog, so nothing is overwritten.
 */
export function usePendingImport(ready: boolean): void {
  const spaces = useApp((s) => s.spaces);
  const importWorkspaces = useApp((s) => s.importWorkspaces);
  const set = useApp((s) => s.set);

  const adopt = useCallback(async () => {
    if (!isDesktop()) return;
    const path = await invoke<string | null>("take_pending_import");
    if (!path) return;
    try {
      const incoming = prepareImport(JSON.parse(await readPath(path)), spaces);
      importWorkspaces(incoming);
    } catch (err) {
      set({
        notice: err instanceof Error ? err.message : "That file isn't a StudyFrame export.",
      });
    }
  }, [spaces, importWorkspaces, set]);

  useEffect(() => {
    if (!ready) return;
    void adopt();
  }, [ready, adopt]);

  // A second launch carrying a file wakes the window that is already open.
  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("studyframe://pending-import", () => void adopt());
    })();
    return () => unlisten?.();
  }, [adopt]);
}
