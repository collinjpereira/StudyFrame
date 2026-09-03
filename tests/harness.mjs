// Tests drive the real modules through the dev server, so they exercise the
// same code the app ships rather than a re-implementation.
import { chromium } from "playwright";

const URL = process.env.STUDYFRAME_URL || "http://localhost:1420/";

export async function launch() {
  // CHROME_PATH lets a machine with a system Chromium skip the download.
  const executablePath = process.env.CHROME_PATH || undefined;
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** A page with a populated library already in place. */
export async function seededPage(browser, fixture, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "networkidle" });
  if (fixture) {
    await page.evaluate((f) => localStorage.setItem("studyframe.store.v1", f), fixture);
  } else {
    await page.evaluate(() => localStorage.clear());
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  return { page, errors };
}

export function reporter(label) {
  const rows = [];
  return {
    check(name, got, want) {
      rows.push({ name, got, want, pass: JSON.stringify(got) === JSON.stringify(want) });
    },
    note(name, got) {
      rows.push({ name, got, note: true });
    },
    finish(errors = []) {
      let failed = 0;
      for (const r of rows) {
        if (r.note) {
          console.log(`  ·  ${r.name}: ${JSON.stringify(r.got)}`);
          continue;
        }
        if (r.pass) console.log(`  ✓  ${r.name}`);
        else {
          failed++;
          console.log(`  ✗  ${r.name}`);
          console.log(`       got  ${JSON.stringify(r.got)}`);
          console.log(`       want ${JSON.stringify(r.want)}`);
        }
      }
      const total = rows.filter((r) => !r.note).length;
      console.log(`\n${label}: ${total - failed} passed, ${failed} failed`);
      if (errors.length) {
        failed++;
        console.log(`console errors:\n${errors.join("\n")}`);
      }
      return failed;
    },
  };
}
