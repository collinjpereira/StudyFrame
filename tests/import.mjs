// The paste route, which is the import path that works without a network:
// glued headings, Preview badges, objective tags, and honest coverage.
import { readFileSync } from "fs";
import { launch, reporter, seededPage } from "./harness.mjs";
import { buildFixture } from "./fixture.mjs";

const paste = readFileSync(new URL("./paste-sample.txt", import.meta.url), "utf8");

const browser = await launch();
const { page, errors } = await seededPage(browser, JSON.stringify(buildFixture()));
const report = reporter("import");

await page.locator('[title="Import a course from a link"]').click();
await page.waitForTimeout(300);
await page.locator("textarea").fill(paste);
await page.getByRole("button", { name: /Parse pasted text/ }).click();
await page.waitForTimeout(500);

const draft = await page.evaluate(async () => {
  const { useApp } = await import("/src/store/store.ts");
  const d = useApp.getState().draft;
  return {
    sections: d.sections.length,
    lectures: d.sections.reduce((a, s) => a + s.lectures.length, 0),
    expected: d.expected,
    weeks: d.sections.map((s) => s.week),
  };
});

report.check("the pasted panel becomes a draft", draft.sections, 3);
report.check("with every lecture", draft.lectures, 17);
report.check("and the header's own totals for comparison", draft.expected, {
  sections: 45,
  lectures: 323,
  length: "51h 40m",
});
report.note("  assigned weeks", draft.weeks);

// A short read is named, not glossed over.
const warning = await page.locator("text=/Only 3 of 45 sections came through/").count();
report.check("a short read is called out", warning, 1);
const coverage = await page.locator("text=/3\\/45 sections/").count();
report.check("coverage is stated against the header", coverage, 1);

await page.getByRole("button", { name: /Add to/ }).click();
await page.waitForTimeout(600);

const committed = await page.evaluate(async () => {
  const { useApp } = await import("/src/store/store.ts");
  const ws = useApp.getState().spaces.find((s) => s.id === "ws-cysa");
  const c = ws.courses[ws.courses.length - 1];
  const lectures = c.sections.flatMap((s) => s.lectures);
  return {
    sections: c.sections.length,
    lectures: lectures.length,
    firstTitle: lectures[0].title,
    firstMins: lectures[0].mins,
    objTags: JSON.stringify(c).includes("OBJ."),
    previewBadges: lectures.some((l) => /preview/i.test(l.title)),
    uniqueIds: new Set(lectures.map((l) => l.id)).size,
    prefixed: lectures.every((l) => l.id.startsWith("im")),
    allPending: lectures.every((l) => !l.done),
  };
});

report.check("the course lands whole", [committed.sections, committed.lectures], [3, 17]);
report.check("runtimes round up from mm:ss", committed.firstMins, 13);
report.check("objective tags are stripped", committed.objTags, false);
report.check("Preview badges are stripped", committed.previewBadges, false);
report.check("ids are unique", committed.uniqueIds, 17);
report.check("and prefixed per import so two imports cannot collide", committed.prefixed, true);
report.check("nothing arrives pre-completed", committed.allPending, true);
report.note("  first lecture", committed.firstTitle);

const failed = report.finish(errors);
await browser.close();
process.exit(failed ? 1 : 0);
