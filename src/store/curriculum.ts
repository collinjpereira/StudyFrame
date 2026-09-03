export interface ParsedLecture {
  title: string;
  mins: number;
}

export interface ParsedSection {
  title: string;
  lectures: ParsedLecture[];
}

/** What the page's own header claims, so the UI can report coverage honestly. */
export interface ExpectedTotals {
  sections: number;
  lectures: number;
  length: string;
}

export interface ParsedCurriculum {
  secs: ParsedSection[];
  title: string;
  expected: ExpectedTotals | null;
}

const OBJECTIVE_TAG = /\(OBJ\.[^)]*\)?/gi;
const SUMMARY_ROW = /(\d+)\s*sections?\s*[•·]\s*([\d,]+)\s*lectures?(?:\s*[•·]\s*([^•·\n<]+?)\s*total)?/i;

function cleanTitle(text: string): string {
  return text
    .replace(OBJECTIVE_TAG, "")
    .replace(/\bpreview\b/gi, "")
    .replace(/^[-•*▶▼‹›]+\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function minutesFrom(mm: string, ss: string): number {
  return Math.max(1, Math.round(Number(mm) + Number(ss) / 60));
}

export function readSummaryRow(text: string): ExpectedTotals | null {
  const m = text.match(SUMMARY_ROW);
  if (!m) return null;
  return {
    sections: Number(m[1]),
    lectures: Number(m[2].replace(/,/g, "")),
    length: (m[3] || "").trim(),
  };
}

/**
 * Reads a copied curriculum element. Keeping the markup keeps each runtime
 * attached to the right lecture, which the plain-text copy tends to lose.
 */
export function parseCurriculumHtml(html: string): ParsedCurriculum {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const pick = (root: ParentNode, selectors: string[]): string => {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
    }
    return "";
  };

  let panels: Element[] = [];
  for (const sel of [
    '[class*="section--section--"]',
    '[data-purpose^="section-"]',
    ".ud-accordion-panel",
    '[class*="curriculum-section"]',
  ]) {
    if (panels.length) break;
    panels = Array.from(doc.querySelectorAll(sel));
  }

  const secs: ParsedSection[] = [];
  for (const panel of panels) {
    let title = pick(panel, [
      '[class*="section--section-title"]',
      '[class*="section-title"]',
      ".ud-accordion-panel-title",
      "h3",
      "h4",
      "button span",
    ]);
    title = cleanTitle(title.replace(/\s*\d+\s*lectures?\s*[•·|].*$/i, ""));
    if (!title) continue;

    let rows: Element[] = [];
    for (const sel of [
      '[class*="curriculum-item-link"]',
      '[class*="section--curriculum-item"]',
      "li",
      '[class*="item--"]',
    ]) {
      if (rows.length) break;
      rows = Array.from(panel.querySelectorAll(sel));
    }

    const lectures: ParsedLecture[] = [];
    for (const row of rows) {
      const text = (row.textContent || "").replace(/\s+/g, " ").trim();
      const time = text.match(/(\d{1,3}):(\d{2})\s*$/);
      if (!time) continue;
      let lt =
        pick(row, [
          '[class*="item-title"]',
          '[class*="section--item-title"]',
          ".ud-block-list-item-content span",
          "span",
        ]) || text;
      lt = cleanTitle(lt.replace(/\s*\d{1,3}:\d{2}\s*$/, ""));
      if (!lt) continue;
      lectures.push({ title: lt, mins: minutesFrom(time[1], time[2]) });
    }
    if (lectures.length) secs.push({ title, lectures });
  }

  const body = doc.body ? (doc.body.textContent || "").replace(/\s+/g, " ") : "";
  const titleEl = doc.querySelector("title");
  return {
    secs,
    title: titleEl ? (titleEl.textContent || "").replace(/\s*[|-]\s*Udemy.*$/i, "").trim() : "",
    expected: readSummaryRow(body),
  };
}

const NOISE =
  /^(preview|expand all sections?|collapse all sections?|course content|show (more|less)|\d+\s*more sections?|checkpoint\b.*|\d+\.?)$/i;

/**
 * Reads text copied out of the Course content panel: glued headings
 * ("Data Protection and Encryption8 lectures • 1hr 14min"), Preview badges on
 * their own line, bare mm:ss runtimes, checkpoints and the summary row.
 */
export function parseCurriculumText(text: string): ParsedSection[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const secs: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  /** A title line whose runtime is on the next line, which is how text copies break. */
  let pendingTitle: string | null = null;

  const addLecture = (title: string, mm: string, ss: string) => {
    if (!current) current = { title: "Section 1", lectures: [] };
    current.lectures.push({ title, mins: minutesFrom(mm, ss) });
  };

  for (const raw of lines) {
    const head = raw.match(/^(.*?)(\d+)\s*lectures?\s*[•·|]\s*(.+)$/i);
    if (head) {
      const title = cleanTitle(head[1].replace(/^#+\s*/, ""));
      const isSummary = /sections?\s*[•·|]\s*$/i.test(head[1]) || /total length/i.test(head[3]);
      if (title.length > 2 && !isSummary) {
        if (current && current.lectures.length) secs.push(current);
        current = { title, lectures: [] };
        pendingTitle = null;
        continue;
      }
      if (isSummary) {
        pendingTitle = null;
        continue;
      }
    }

    const timed = raw.match(/^(.*?)(\d{1,3}):(\d{2})\s*$/);
    if (timed) {
      const title = cleanTitle(timed[1]);
      if (title.length > 1) {
        addLecture(title, timed[2], timed[3]);
      } else if (pendingTitle) {
        addLecture(pendingTitle, timed[2], timed[3]);
      }
      pendingTitle = null;
      continue;
    }

    const cleaned = cleanTitle(raw);
    if (!cleaned || NOISE.test(cleaned)) continue;
    pendingTitle = cleaned;
  }

  if (current && current.lectures.length) secs.push(current);
  return secs;
}

/** Picks the parser from the shape of what was pasted. */
export function parsePasted(text: string): { secs: ParsedSection[]; parsed: ParsedCurriculum | null } {
  const looksHtml = /<(div|ul|li|section|button|span)\b/i.test(text);
  const dom = looksHtml ? parseCurriculumHtml(text) : null;
  return { secs: dom && dom.secs.length ? dom.secs : parseCurriculumText(text), parsed: dom };
}
