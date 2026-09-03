import { useEffect } from "react";
import { flushStore } from "../store/persist";
import { isDesktop } from "../store/tauri";

/**
 * `beforeunload` is not guaranteed when the shell closes a window, so the close
 * request is intercepted, the library flushed, and the close then allowed.
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
        await win.destroy();
      });
    })();

    return () => unlisten?.();
  }, []);
}
