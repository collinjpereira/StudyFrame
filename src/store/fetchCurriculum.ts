import { invoke, isDesktop } from "./tauri";
import type { ExpectedTotals, ParsedSection } from "./curriculum";

export interface FetchedCurriculum {
  secs: ParsedSection[];
  title: string;
  expected: ExpectedTotals | null;
}

export class NotDesktopError extends Error {}

/**
 * A browser refuses this request: udemy.com sends no CORS headers for another
 * origin, so the fetch fails before it starts. The packaged app makes it from
 * its own process, where that restriction does not apply — so this always runs
 * in Rust and never from the webview.
 */
export async function fetchCurriculum(url: string): Promise<FetchedCurriculum> {
  if (!isDesktop()) throw new NotDesktopError();
  return invoke<FetchedCurriculum>("fetch_curriculum", { url });
}
