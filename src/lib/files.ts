import { invoke, isDesktop } from "../store/tauri";

/**
 * Writes a file the user chose the location for. The desktop build pairs a
 * native save dialog with a Rust write, so the app needs no broad filesystem
 * scope; a browser gets an anchor download so `vite dev` still works.
 */
export async function saveTextFile(
  suggestedName: string,
  contents: string,
  filters: { name: string; extensions: string[] }[],
): Promise<boolean> {
  if (isDesktop()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({ defaultPath: suggestedName, filters });
    if (!path) return false;
    await invoke("write_text_file", { path, contents });
    return true;
  }

  const blob = new Blob([contents], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return true;
}

/** Reads a file the user picked. Returns null if they cancelled. */
export async function openTextFile(
  filters: { name: string; extensions: string[] }[],
): Promise<string | null> {
  if (isDesktop()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({ multiple: false, filters });
    if (!path || Array.isArray(path)) return null;
    return invoke<string>("read_text_file", { path });
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

/** Reads a path the shell handed us, e.g. a file the app was launched with. */
export async function readPath(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function openExternal(url: string): Promise<void> {
  if (isDesktop()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}
