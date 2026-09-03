// The window is fluid from 1180 up: no view may scroll the page sideways, and
// every control must show a focus ring.
import { launch, reporter, seededPage } from "./harness.mjs";
import { buildFixture } from "./fixture.mjs";

const VIEWS = [
  ["today", null],
  ["roadmap", "Roadmap"],
  ["board", "Courses"],
  ["notes", "Notes"],
  ["review", "Review"],
  ["stats", "Stats"],
];

const browser = await launch();
const report = reporter("layout");
const fixture = JSON.stringify(buildFixture());
const allErrors = [];

for (const width of [1180, 1440]) {
  for (const [name, nav] of VIEWS) {
    const { page, errors } = await seededPage(browser, fixture, { width, height: 720 });
    if (nav) {
      await page.getByRole("button", { name: new RegExp(`^${nav}`) }).first().click();
      await page.waitForTimeout(400);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    report.check(`${width} ${name} does not scroll the page sideways`, overflow, 0);
    allErrors.push(...errors);
    await page.close();
  }
}

// A brand new library: one workspace, no courses, and its plan waiting.
{
  const { page, errors } = await seededPage(browser, null);
  const first = await page.evaluate(async () => {
    const { useApp } = await import("/src/store/store.ts");
    const s = useApp.getState();
    return { spaces: s.spaces.length, courses: s.spaces[0].courses.length, dialog: s.dialog };
  });
  report.check("a fresh library opens one workspace on its plan", first, {
    spaces: 1,
    courses: 0,
    dialog: "plan",
  });

  const rings = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`;
    });
    if (ring) rings.push(ring);
  }
  const bare = rings.filter((r) => r.startsWith("0px") || r.includes("none"));
  report.check("every tabbed control shows a focus ring", bare.length, 0);
  report.note("  ring", rings[0]);
  allErrors.push(...errors);
  await page.close();
}

const failed = report.finish(allErrors);
await browser.close();
process.exit(failed ? 1 : 0);
