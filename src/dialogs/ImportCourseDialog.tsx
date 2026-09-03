import {
  ArrowsClockwise,
  Check,
  ClipboardText,
  DownloadSimple,
  TextAlignLeft,
} from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { parsePasted, readSummaryRow } from "../store/curriculum";
import { fetchCurriculum, NotDesktopError } from "../store/fetchCurriculum";
import { assignDraftWeeks } from "../planner/schedule";
import { hm, plural, short } from "../lib/format";
import { Button, DialogIntro, DialogTitle, FieldLabel, Kicker, Modal } from "../components/ui";
import { useApp, type ImportDraft } from "../store/store";

const PASTE_STEPS = [
  'Click the “N more sections” button, then “Expand all sections”. Udemy only sends the first ten with the page — the rest load when you click, so this step is required.',
  "Either select the whole Course content panel and copy the text, or right-click it → Inspect → Copy → Copy element and paste the HTML. Both work; the HTML keeps runtimes cleaner.",
  "Paste below and parse. Preview badges, checkpoints, “(OBJ. 1.5)” tags and the summary row are all ignored automatically.",
  "StudyFrame checks what it read against the count in the header, so it tells you if the copy came up short.",
];

const DEFAULT_NOTE =
  "Udemy sends only the first ten sections with the page; the rest come from its curriculum feed when you click “more sections”. StudyFrame requests that feed directly, so a link gives you all of them.";

export function ImportCourseDialog({ ws }: { ws: Workspace }) {
  const importUrl = useApp((s) => s.importUrl);
  const importText = useApp((s) => s.importText);
  const importNote = useApp((s) => s.importNote);
  const importErr = useApp((s) => s.importErr);
  const importBusy = useApp((s) => s.importBusy);
  const draft = useApp((s) => s.draft);
  const set = useApp((s) => s.set);
  const commitDraft = useApp((s) => s.commitDraft);

  const close = () => set({ dialog: null, draft: null });
  const reset = () => set({ draft: null, importNote: "", importErr: false });

  const buildDraft = (
    secs: { title: string; lectures: { title: string; mins: number }[] }[],
    title: string,
    provider: string,
    source: string,
    expected: ImportDraft["expected"],
    fromUrl: boolean,
  ): ImportDraft => {
    const withMins = secs.map((s) => ({
      title: s.title,
      lectures: s.lectures,
      mins: s.lectures.reduce((a, l) => a + l.mins, 0),
    }));
    return {
      title,
      provider,
      source,
      hours: ws.hoursPerWeek,
      fromUrl,
      expected,
      sections: assignDraftWeeks(withMins, ws.hoursPerWeek),
    };
  };

  const readLink = async () => {
    const url = importUrl.trim();
    if (!/udemy\.com\/course\//i.test(url)) {
      set({
        importNote:
          "That doesn't look like a Udemy course link. Paste the curriculum below instead.",
        importErr: true,
      });
      return;
    }
    set({
      importNote: "Reading the full curriculum — expanding every section…",
      importErr: false,
      importBusy: true,
    });
    try {
      const res = await fetchCurriculum(url);
      if (!res.secs.length) throw new Error("empty curriculum");
      set({
        importBusy: false,
        importNote: "",
        draft: buildDraft(
          res.secs,
          res.title || "Imported course",
          "Udemy",
          `Read live from ${url} · every section expanded`,
          res.expected,
          true,
        ),
      });
    } catch (err) {
      set({
        importBusy: false,
        importNote:
          err instanceof NotDesktopError
            ? "Reading a link needs the desktop build — a browser can't call udemy.com cross-origin. Hit “Expand all sections” on Udemy and paste the block below."
            : `Couldn't read that page: ${
                err instanceof Error ? err.message : String(err)
              }. Hit “Expand all sections” on Udemy and paste the block below.`,
        importErr: true,
      });
    }
  };

  const parseText = () => {
    const { secs, parsed } = parsePasted(importText);
    if (!secs.length) {
      set({
        importNote:
          "No sections found. Either copy the visible Course content panel, or right-click the curriculum block → Inspect → Copy element and paste that HTML — collapsed sections come through too.",
        importErr: true,
      });
      return;
    }
    const expected = parsed?.expected || readSummaryRow(importText);
    set({
      importNote: "",
      draft: buildDraft(
        secs,
        parsed?.title || "Pasted course",
        "Udemy",
        parsed && parsed.secs.length
          ? `Parsed from the pasted curriculum markup · ${secs.length} sections read`
          : "Parsed from pasted curriculum text",
        expected,
        false,
      ),
    });
  };

  const draftLectures = draft ? draft.sections.reduce((a, s) => a + s.lectures.length, 0) : 0;
  const partial = !!(draft && draft.expected && draft.sections.length < draft.expected.sections);

  return (
    <Modal width={620} onClose={close}>
      <DialogTitle>Import a course</DialogTitle>
      <DialogIntro>
        {draft
          ? "Here's what StudyFrame read. Check the week assignments, then add it."
          : "Paste a Udemy course link — the curriculum is public, so StudyFrame reads the section list, every lecture title and its runtime, then paces it against your plan."}
      </DialogIntro>

      <div style={{ height: 18 }} />

      {!draft ? (
        <div>
          <FieldLabel>Course link</FieldLabel>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <input
              className="input"
              value={importUrl}
              placeholder="https://www.udemy.com/course/…"
              onChange={(e) =>
                set({ importUrl: e.target.value, importNote: "", importErr: false })
              }
              style={{ flex: 1, minWidth: 220, padding: "10px 12px" }}
            />
            <Button
              disabled={importBusy}
              onClick={() => void readLink()}
              style={{ flex: "none", padding: "10px 16px" }}
            >
              <DownloadSimple size={14} />
              {importBusy ? "Reading…" : "Read curriculum"}
            </Button>
          </div>
          <div
            className="pretty"
            style={{
              fontSize: 11.5,
              color: importErr ? "var(--color-warn-text)" : "var(--text-muted)",
              marginTop: 9,
              lineHeight: 1.55,
            }}
          >
            {importNote || DEFAULT_NOTE}
          </div>

          <div style={{ height: 20 }} />

          <FieldLabel>…or paste the curriculum — gets every section</FieldLabel>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}
          >
            {PASTE_STEPS.map((text, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 9,
                  fontSize: 12,
                  color: "rgba(233,233,237,0.55)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    flex: "none",
                    width: 15,
                    height: 15,
                    marginTop: 2,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 9.5,
                    color: "var(--color-accent-300)",
                    background: "rgba(145,132,217,0.16)",
                  }}
                >
                  {i + 1}
                </span>
                <span className="pretty">{text}</span>
              </div>
            ))}
          </div>

          <textarea
            className="input"
            value={importText}
            placeholder='Paste the copied HTML element, or the plain "Course content" text — StudyFrame detects which and reads both.'
            onChange={(e) => set({ importText: e.target.value })}
            style={{
              height: 104,
              resize: "vertical",
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          />
          <Button
            variant="secondary"
            style={{ marginTop: 11, padding: "9px 16px" }}
            onClick={parseText}
          >
            <TextAlignLeft size={14} />
            Parse pasted text
          </Button>
        </div>
      ) : (
        <div>
          <div
            style={{
              borderRadius: 10,
              padding: "15px 17px",
              background: "var(--color-bg)",
              boxShadow: "inset 3px 0 0 var(--color-accent), 0 0 0 1px rgba(233,233,237,0.06)",
            }}
          >
            <input
              className="input input-sm"
              value={draft.provider}
              placeholder="Provider / instructor"
              onChange={(e) => set({ draft: { ...draft, provider: e.target.value } })}
              style={{
                fontSize: 11,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "rgba(233,233,237,0.6)",
                background: "transparent",
              }}
            />
            <input
              className="input"
              value={draft.title}
              placeholder="Course title"
              onChange={(e) => set({ draft: { ...draft, title: e.target.value } })}
              style={{
                marginTop: 7,
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.3,
                background: "transparent",
              }}
            />
            <div
              style={{ fontSize: 12.5, color: "rgba(233,233,237,0.55)", marginTop: 9 }}
            >
              {plural(draft.sections.length, "section")} · {plural(draftLectures, "lecture")} ·{" "}
              {hm(draft.sections.reduce((a, s) => a + s.mins, 0))} total
            </div>
            <div
              className="pretty"
              style={{ fontSize: 11.5, color: "rgba(233,233,237,0.38)", marginTop: 6 }}
            >
              {draft.source}
            </div>
          </div>

          {partial && draft.expected ? (
            <div
              style={{
                marginTop: 12,
                borderRadius: 10,
                padding: "14px 16px",
                background: "rgba(126,43,53,0.14)",
                boxShadow: "inset 3px 0 0 var(--color-warn-text)",
              }}
            >
              <div
                style={{ fontSize: 13, fontWeight: 500, color: "var(--color-warn-bright)" }}
              >
                Only {draft.sections.length} of {draft.expected.sections} sections came through
              </div>
              <div
                className="pretty"
                style={{
                  fontSize: 12,
                  color: "rgba(233,233,237,0.6)",
                  marginTop: 5,
                  lineHeight: 1.6,
                }}
              >
                The header says {draft.expected.sections} sections, {draft.expected.lectures}{" "}
                lectures
                {draft.expected.length ? `, ${draft.expected.length}` : ""}.{" "}
                {draft.fromUrl
                  ? "The read stopped short of the full curriculum — try fetching again, or expand every section on Udemy and paste the block instead."
                  : "The copy stopped short of the full curriculum. Udemy only sends the first ten sections with the page — click the “more sections” button and “Expand all sections” so every one is on screen, then re-copy the whole panel and paste again."}{" "}
                You can also add what&apos;s missing by hand with Edit on the course.
              </div>
              <Button
                size="sm"
                style={{ marginTop: 11 }}
                onClick={() => (draft.fromUrl ? void readLink() : reset())}
              >
                {draft.fromUrl ? <ArrowsClockwise size={13} /> : <ClipboardText size={13} />}
                {draft.fromUrl ? "Fetch all sections again" : "Paste the full curriculum"}
              </Button>
            </div>
          ) : null}

          <div style={{ height: 16 }} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 9,
            }}
          >
            <FieldLabel>Scheduled at {draft.hours} h/week</FieldLabel>
            <div style={{ fontSize: 11, color: "rgba(233,233,237,0.36)" }}>
              {draft.expected
                ? `${draft.sections.length}/${draft.expected.sections} sections · ${draftLectures}/${draft.expected.lectures} lectures`
                : "all sections read"}
            </div>
          </div>

          <div
            className="scroll"
            style={{
              maxHeight: 230,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {draft.sections.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 13px",
                  borderRadius: 8,
                  background: "var(--color-bg)",
                  boxShadow: "0 0 0 1px rgba(233,233,237,0.05)",
                }}
              >
                <div className="min0" style={{ flex: 1 }}>
                  <div
                    className="pretty"
                    style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 }}
                  >
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {plural(s.lectures.length, "lecture")} · {hm(s.mins)}
                  </div>
                </div>
                <span
                  style={{
                    flex: "none",
                    fontSize: 10.5,
                    padding: "3px 9px",
                    borderRadius: 999,
                    color: "var(--color-accent-300)",
                    background: "rgba(145,132,217,0.16)",
                  }}
                >
                  Week {s.week}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 20,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button type="button" className="link-quiet" style={{ fontSize: 12.5 }} onClick={reset}>
              ← Different course
            </button>
            <Button onClick={commitDraft} style={{ padding: "9px 17px" }}>
              <Check size={14} />
              Add to {short(ws.name, 22)}
            </Button>
          </div>
        </div>
      )}

      {!draft ? <Kicker style={{ marginTop: 16 }}>Nothing is added until you review it</Kicker> : null}
    </Modal>
  );
}
