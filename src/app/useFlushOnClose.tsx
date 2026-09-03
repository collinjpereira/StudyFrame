import { useEffect } from "react";
import { flushStore } from "../store/persist";
import { invoke, isDesktop } from "../store/tauri";

/**
 * `beforeunload` is not guaranteed when the shell closes a window, so the close
 * request is intercepted, the library flushed, and the close then allowed.
 *
 * The flush is followed by an explicit `quit_app`, not `window.destroy()`:
 * the single-instance plugin keeps listening for a relaunch for as long as
 * the process is alive, so destroying the window alone leaves the app
 * resident — visible only as needing an End Task to actually go away.
 */
export function useFlushOnClose(): void {
  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    let closing = false;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      unlisten = await win.onCloseRequested(async (event) => {
        if (closing) return;
        event.preventDefault();
        closing = true;
        await flushStore();
        await invoke("quit_app");
      });
    })();

    return () => unlisten?.();
  }, []);
}
