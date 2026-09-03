import type { Store } from "./types";
import { invoke, isDesktop } from "./tauri";
import { migrateStore } from "./migrate";

const BROWSER_KEY = "studyframe.store.v1";
const SCHEMA = 1;
const LAST_WS_KEY = "studyframe.lastWorkspace";
const DEBOUNCE_MS = 400;

export interface LoadResult {
  store: Store | null;
  /**
   * Set when library.json could not be read and something else was used.
   * Never start empty silently — the shell tells the user what it recovered.
   */
  recovered: string | null;
}

interface RustLoad {
  json: string | null;
  recovered: string | null;
}

export async function loadStore(): Promise<LoadResult> {
  if (!isDesktop()) {
    try {
      const raw = localStorage.getItem(BROWSER_KEY);
      return { store: raw ? migrateStore(JSON.parse(raw)) : null, recovered: null };
    } catch {
      return { store: null, recovered: null };
    }
  }
  try {
    const res = await invoke<RustLoad>("load_library");
    if (!res.json) return { store: null, recovered: res.recovered };
    const raw = JSON.parse(res.json) as { schema?: number };
    // Never destroy on upgrade: the original is copied aside before a newer
    // schema migrates and rewrites it.
    if (raw.schema !== SCHEMA) {
      try {
        await invoke("snapshot_before_upgrade", { version: String(raw.schema ?? "unknown") });
      } catch {
        // A missing snapshot must not block the user from opening their library.
      }
    }
    return { store: migrateStore(raw), recovered: res.recovered };
  } catch (err) {
    return { store: null, recovered: `Storage could not be read: ${String(err)}` };
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: Store | null = null;
/** Set when the user deleted something, so the truncation guard lets the write through. */
let shrinkAllowed = false;

/** Every mutation marks the store dirty; the write lands 400ms later. */
export function scheduleSave(store: Store): void {
  pending = store;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushStore();
  }, DEBOUNCE_MS);
}

/** Called before a delete so a legitimately smaller library isn't refused. */
export function allowShrink(): void {
  shrinkAllowed = true;
}

/** Flush now: window close, app quit, session end, workspace import. */
export async function flushStore(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const store = pending;
  if (!store) return;
  pending = null;
  const allow = shrinkAllowed;
  shrinkAllowed = false;
  const json = JSON.stringify(store);

  if (!isDesktop()) {
    try {
      localStorage.setItem(BROWSER_KEY, json);
    } catch {
      // A full or blocked storage quota must not take the session down.
    }
    return;
  }
  try {
    await invoke("save_library", { json, allowShrink: allow });
  } catch (err) {
    console.error("StudyFrame could not save the library", err);
  }
}

export function storeBytes(store: Store): number {
  return JSON.stringify(store).length;
}

export interface DesktopSettings {
  lastWorkspace?: string;
}

/** The workspace the user left, so the app reopens where they were. */
export async function loadLastWorkspace(): Promise<string | null> {
  if (!isDesktop()) return localStorage.getItem(LAST_WS_KEY);
  try {
    const settings = await invoke<DesktopSettings>("load_settings");
    return settings.lastWorkspace ?? null;
  } catch {
    return null;
  }
}

export async function rememberLastWorkspace(id: string): Promise<void> {
  if (!isDesktop()) {
    try {
      localStorage.setItem(LAST_WS_KEY, id);
    } catch {
      // Not worth failing a workspace switch over.
    }
    return;
  }
  try {
    await invoke("set_last_workspace", { id });
  } catch {
    // Same: losing the last-opened workspace is a cosmetic loss.
  }
}
