/**
 * The app runs in two places: the packaged desktop shell, and `vite dev` in a
 * plain browser. Everything that needs the shell goes through here so a missing
 * Tauri runtime degrades instead of throwing.
 */
export const isDesktop = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const api = await import("@tauri-apps/api/core");
  return api.invoke<T>(cmd, args);
}
