// Starts the dev server, runs every suite against it, and tears it down.
import { spawn, spawnSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "node:url";
import { buildSampleExport } from "./fixture.mjs";

const SUITES = ["planner.mjs", "app.mjs", "import.mjs", "layout.mjs"];
const PORT = 1420;

// Keep samples/ in step with the fixture the tests use.
mkdirSync(new URL("../samples/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../samples/demo-library.studyframe.json", import.meta.url),
  JSON.stringify(buildSampleExport(), null, 2),
);

const server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
  cwd: new URL("..", import.meta.url),
  stdio: ["ignore", "pipe", "pipe"],
  // npx resolves to npx.cmd on Windows; spawn() needs the shell to run a .cmd.
  // Safe here: every argument is a static literal, none of it is user input.
  shell: process.platform === "win32",
});

const stop = () => {
  if (server.killed || server.exitCode !== null) return;
  if (process.platform === "win32") {
    // The server runs inside a cmd.exe shell (see above); killing that
    // shell leaves the actual vite process it launched still holding the
    // port, so the next run fails with "port already in use". /t kills
    // the whole process tree.
    spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"]);
  } else {
    server.kill("SIGTERM");
  }
};
process.on("exit", stop);
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("the dev server did not come up")), 30000);
  server.stdout.on("data", (chunk) => {
    if (String(chunk).includes("ready in")) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
});

let failed = 0;
for (const suite of SUITES) {
  console.log(`\n── ${suite.replace(".mjs", "")} ${"─".repeat(50 - suite.length)}`);
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL(suite, import.meta.url))], {
      stdio: "inherit",
      env: { ...process.env, STUDYFRAME_URL: `http://localhost:${PORT}/` },
    });
    child.on("exit", (c) => resolve(c ?? 1));
  });
  if (code !== 0) failed++;
}

stop();
console.log(failed ? `\n${failed} suite(s) failed` : "\nall suites passed");
process.exit(failed ? 1 : 0);
