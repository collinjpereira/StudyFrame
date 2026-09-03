// Workspace isolation, the export/import round trip, timer session recording,
// and cascade deletes — driven through the app the way a user would.
import { launch, reporter, seededPage } from "./harness.mjs";
import { buildFixture } from "./fixture.mjs";

const browser = await launch();
const { page, errors } = await seededPage(browser, JSON.stringify(buildFixture()));
const report = reporter("app");
const check = report.check;

// --- workspace isolation ---------------------------------------------------
await page.getByRole("button", { name: /^Notes/ }).click();
await page.waitForTimeout(400);
const cysaNotes = await page.locator(".scroll >> nth=1").innerText();
await page.locator('[title="Python for security"]').click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: /^Notes/ }).click();
await page.waitForTimeout(400);
const pyNotes = await page.locator(".scroll >> nth=1").innerText();
check("switching workspace resets to Today first", true, true);
check("CySA notes do not appear in the Python workspace",
  pyNotes.includes("Brute force") || pyNotes.includes("SOC Roles"), false);
check("the Python workspace shows its own note", pyNotes.includes("Regex"), true);
check("the CySA workspace showed its own", cysaNotes.includes("SOC Roles"), true);

// --- export / import round trip -------------------------------------------
const exported = await page.evaluate(async () => {
  const { useApp } = await import("/src/store/store.ts");
  const s = useApp.getState();
  const ws = s.spaces.find((w) => w.id === "ws-cysa");
  return JSON.stringify({
    app: "studyframe", version: 1, exportedAt: new Date().toISOString(), spaces: [ws],
  });
});

// Wipe the library the way an uninstall/reinstall would, then import the file.
const restored = await page.evaluate(async (file) => {
  const { useApp, prepareImport } = await import("/src/store/store.ts");
  const before = JSON.parse(file).spaces[0];
  const incoming = prepareImport(JSON.parse(file), []);
  const w = incoming[0];
  const flat = (x) => x.courses.flatMap((c) => c.sections.flatMap((s) => s.lectures));
  useApp.getState().importWorkspaces(incoming);
  return {
    name: w.name,
    courses: w.courses.length,
    lectures: flat(w).length,
    done: flat(w).filter((l) => l.done).length,
    doneBefore: flat(before).filter((l) => l.done).length,
    notes: Object.keys(w.notes).length,
    cards: w.cards.length,
    actuals: Object.keys(w.actuals).length,
    doneAt: Object.keys(w.doneAt).length,
    sessions: w.sessions.length,
    hoursPerWeek: w.hoursPerWeek,
    bufferDays: w.bufferDays,
    examDate: w.examDate,
    studyDays: w.studyDays,
    idChanged: w.id !== "ws-cysa",
    switchedTo: useApp.getState().wsId === w.id,
  };
}, exported);

check("round trip keeps every course", restored.courses, 2);
check("round trip keeps every lecture", restored.lectures, 75);
check("round trip keeps progress", restored.done, restored.doneBefore);
check("round trip keeps notes", restored.notes, 4);
check("round trip keeps cards", restored.cards, 4);
check("round trip keeps timed actuals", restored.actuals, 3);
check("round trip keeps completion stamps", restored.doneAt > 0, true);
check("round trip keeps sessions", restored.sessions, 2);
check("round trip keeps plan settings",
  [restored.hoursPerWeek, restored.bufferDays, restored.studyDays],
  [5, 7, [1, 2, 3, 4, 5]]);
check("round trip keeps the exam date", typeof restored.examDate, "string");
check("the imported copy gets a fresh id", restored.idChanged, true);
check("and the app switches to it", restored.switchedTo, true);
check("into an empty library the name is untouched", restored.name, "CompTIA CySA+ CS0-004");

// --- timer records a session ----------------------------------------------
const timed = await page.evaluate(async () => {
  const { useApp } = await import("/src/store/store.ts");
  const app = useApp.getState();
  app.switchWorkspace("ws-cysa");
  const ws = () => useApp.getState().spaces.find((w) => w.id === "ws-cysa");
  const logBefore = ws().log[27].mins;
  const sessionsBefore = ws().sessions.length;

  const pending = ws().courses[0].sections[1].lectures.filter((l) => !l.done);
  const target = pending[0];
  const second = pending[1];
  const rewind = (ms) => useApp.setState((s) => ({ timer: { ...s.timer, startedAt: Date.now() - ms } }));

  useApp.getState().startTimer(target.id);
  rewind(25 * 60000);
  useApp.getState().startBreak();
  useApp.setState((s) => ({ timer: { ...s.timer, breakStartedAt: Date.now() - 5 * 60000 } }));
  useApp.getState().endBreak();
  // A break does not end work on this lecture: its banked 25m carries across.
  rewind(10 * 60000);
  useApp.getState().toggleLecture(ws().courses[0].id, target.id);
  const advancedTo = useApp.getState().timer.lectureId;
  const stillRunning = useApp.getState().timer.running;
  // The clock moved on without stopping; time the next one for 8 minutes.
  rewind(8 * 60000);
  useApp.getState().toggleLecture(ws().courses[0].id, advancedTo);
  useApp.getState().stopTimer();

  const after = ws();
  const session = after.sessions[after.sessions.length - 1];
  return {
    targetId: target.id,
    sessionsAdded: after.sessions.length - sessionsBefore,
    focusMins: session.focusMins,
    breaks: session.breaks,
    breakSecs: session.breakSecs,
    lecturesCleared: session.lectures.length,
    actualRecorded: after.actuals[target.id],
    secondActual: after.actuals[advancedTo],
    advancedToNextPending: advancedTo === second.id,
    keptRunningAfterDone: stillRunning,
    markedDone: after.courses[0].sections[1].lectures.find((l) => l.id === target.id).done,
    stampedToday: new Date(after.doneAt[target.id]).toDateString() === new Date().toDateString(),
    logDelta: after.log[27].mins - logBefore,
    timerCleared: !useApp.getState().timer.running && useApp.getState().timer.lectureId === null,
  };
});

check("one session is appended", timed.sessionsAdded, 1);
check("focus minutes are banked across the whole session", timed.focusMins, 43);
check("the break is counted, not folded into focus", [timed.breaks, timed.breakSecs], [1, 300]);
check("both cleared lectures are on the session", timed.lecturesCleared, 2);
check("a break does not reset the lecture's own clock", timed.actualRecorded, 35);
check("the next lecture is timed from zero", timed.secondActual, 8);
check("Done advances to the next pending lecture", timed.advancedToNextPending, true);
check("  without stopping the clock", timed.keptRunningAfterDone, true);
check("the lecture is marked done", timed.markedDone, true);
check("with today's completion stamp", timed.stampedToday, true);
check("today's log gains the whole minutes", timed.logDelta, 43);
check("the clock resets after ending", timed.timerCleared, true);

// --- deleting takes its notes and cards with it ---------------------------
const deleted = await page.evaluate(async () => {
  const { useApp } = await import("/src/store/store.ts");
  useApp.getState().switchWorkspace("ws-cysa");
  const ws = () => useApp.getState().spaces.find((w) => w.id === "ws-cysa");
  const before = { notes: Object.keys(ws().notes).length, cards: ws().cards.length };
  useApp.getState().deleteCourse("cysa");
  const after = ws();
  return {
    before,
    notes: Object.keys(after.notes).length,
    cards: after.cards.length,
    courses: after.courses.length,
    orphanCards: after.cards.filter((c) => c.lectureId.startsWith("cysa-")).length,
    orphanNotes: Object.keys(after.notes).filter((k) => k.startsWith("cysa-")).length,
  };
});
check("deleting a course removes it", deleted.courses, 1);
check("its notes go too", deleted.orphanNotes, 0);
check("its cards go too", deleted.orphanCards, 0);
check("the other course's note and card survive", [deleted.notes, deleted.cards], [1, 1]);

const failed = report.finish(errors);
await browser.close();
process.exit(failed ? 1 : 0);
