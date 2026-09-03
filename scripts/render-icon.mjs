import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const htmlPath = fileURLToPath(new URL("./icon-source.html", import.meta.url));
const outPath = fileURLToPath(new URL("./icon-1024.png", import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.goto(`file://${htmlPath}`);
// Without this, Playwright composites the page onto an opaque white canvas
// before capturing, so the transparent corners outside the rounded square
// come out solid white instead of transparent (a visible white square edge
// once Windows applies its own icon mask).
await page.screenshot({
  path: outPath,
  clip: { x: 0, y: 0, width: 1024, height: 1024 },
  omitBackground: true,
});
await browser.close();
console.log("wrote", outPath);
