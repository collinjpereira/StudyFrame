// One-off script to capture real README screenshots from the dev server.
// Not part of the build; not referenced by any npm script.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdirSync, readFileSync } from "node:fs";

const DEV_URL = "http://localhost:1421";
const outDir = fileURLToPath(new URL("../screenshots/", import.meta.url));
mkdirSync(outDir, { recursive: true });

const samplePath = fileURLToPath(new URL("../samples/demo-library.studyframe.json", import.meta.url));
const exportFile = JSON.parse(readFileSync(samplePath, "utf8"));
const store = { schema: 1, savedAt: new Date().toISOString(), spaces: exportFile.spaces };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Seed localStorage before the app's own script ever runs, so there is no
// race with its beforeunload flush (which would overwrite a post-load seed
// with the empty first-run workspace it already has in memory).
await context.addInitScript(
  ({ storeJson, wsId }) => {
    localStorage.setItem("studyframe.store.v1", storeJson);
    localStorage.setItem("studyframe.lastWorkspace", wsId);
  },
  { storeJson: JSON.stringify(store), wsId: exportFile.spaces[0].id },
);

const page = await context.newPage();
await page.goto(DEV_URL);
await page.waitForTimeout(400);

const shot = (name) => page.screenshot({ path: `${outDir}${name}.png` });
const clickNav = (label) => page.getByRole("button", { name: label, exact: false }).first().click();

await shot("today");

await clickNav("Roadmap");
await page.waitForTimeout(200);
await shot("roadmap-weeks");

await page.getByRole("button", { name: "Days", exact: true }).click();
await page.waitForTimeout(200);
await shot("roadmap-days");

await clickNav("Courses");
await page.waitForTimeout(200);
await shot("courses");

// First course card opens course detail. Role-scoped so this doesn't hit
// the plain (non-interactive) workspace name text in the title bar/sidebar.
await page.getByRole("button", { name: /Complete Course & Practice Exam/ }).click();
await page.waitForTimeout(200);
await shot("course-detail");

await clickNav("Notes");
await page.waitForTimeout(200);
await shot("notes");

await clickNav("Stats");
await page.waitForTimeout(200);
await shot("stats");

await browser.close();
console.log("done");
