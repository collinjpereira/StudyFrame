// Planner, parser and store logic, run against the real modules.
import { launch, reporter } from "./harness.mjs";

const browser = await launch();
const page = await browser.newPage();
await page.goto(process.env.STUDYFRAME_URL || "http://localhost:1420/", { waitUntil: "networkidle" });

const results = await page.evaluate(async () => {
  const feas = await import("/src/planner/feasibility.ts");
  const derive = await import("/src/planner/derive.ts");
  const dates = await import("/src/planner/dates.ts");
  const sched = await import("/src/planner/schedule.ts");
  const dayPlan = await import("/src/planner/dayPlan.ts");
  const cal = await import("/src/planner/calendar.ts");
  const curr = await import("/src/store/curriculum.ts");
  const store = await import("/src/store/store.ts");
  const mig = await import("/src/store/migrate.ts");
  const fmt = await import("/src/lib/format.ts");

  const out = [];
  const check = (name, got, want) => out.push({ name, got, want, pass: JSON.stringify(got) === JSON.stringify(want) });
  const show = (name, got) => out.push({ name, got, want: "(inspect)", pass: true });

  const ws = (o) => mig.migrateWorkspace({
    id: "w", name: "W", hoursPerWeek: 5, courses: [], ...o,
  });

  const course = (id, secs) => ({
    id, title: id, provider: "p", source: "s",
    sections: secs.map(([sid, week, mins, n, done]) => ({
      id: sid, title: sid, week,
      lectures: Array.from({ length: n }, (_, i) => ({
        id: `${sid}-l${i}`, title: `${sid} lec ${i}`, mins, done: i < (done || 0),
      })),
    })),
  });

  // --- formatting -----------------------------------------------------------
  check("plural(1)", fmt.plural(1, "lecture"), "1 lecture");
  check("plural(2)", fmt.plural(2, "lecture"), "2 lectures");
  check("hm under an hour", fmt.hm(45), "45m");
  check("hm over an hour", fmt.hm(84), "1.4h");
  check("dur seconds", fmt.dur(45), "45s");
  check("dur minutes", fmt.dur(720), "12m");
  check("clock under an hour", fmt.clock(252000), "4:12");
  check("clock over an hour", fmt.clock(3852000), "1:04:12");

  // --- DST-safe calendar math ----------------------------------------------
  // 2026-03-29 is the EU spring-forward. Adding a day must land on the 30th.
  const dst = dates.addDays(new Date(2026, 2, 29), 1);
  check("addDays across DST", [dst.getFullYear(), dst.getMonth(), dst.getDate()], [2026, 2, 30]);
  const mon = dates.mondayOf(1, new Date(2026, 8, 3)); // a Thursday
  check("mondayOf finds Monday", [mon.getMonth(), mon.getDate(), mon.getDay()], [7, 31, 1]);
  const w2 = dates.mondayOf(2, new Date(2026, 8, 3));
  check("week 2 is 7 days on", [w2.getMonth(), w2.getDate()], [8, 7]);

  // --- feasibility: the two "Not possible" cases ---------------------------
  // A quarter-hour a week with a three-week buffer. 39 h/week over 5 study days
  // is 7.8 h/day, still under the ceiling — so this is reachable, and the honest
  // answer names the shortfall rather than calling it impossible. What must never
  // happen is a green light.
  const impossible = ws({ examDate: dates.isoIn(30), hoursPerWeek: 0.25, bufferDays: 21 });
  const f1 = feas.feasibility(impossible, 3000);
  check("a hopeless budget is never a green light", f1.mark, "var(--color-warn-text)");
  check("  and it names the budget", f1.title, "Doesn't fit at 0.25 h/week");
  check("  and offers the lean pace", f1.fixes.length > 0, true);
  show("  its line", f1.line);
  show("  its fixes", f1.fixes.map((x) => x.label));

  // The same absurd budget with one study day: now the required pace is past the
  // 10 h/day ceiling, and it must be refused outright.
  const refusedPace = ws({ examDate: dates.isoIn(30), hoursPerWeek: 0.25, bufferDays: 21, studyDays: [1] });
  const f1b = feas.feasibility(refusedPace, 3000);
  check("past a human day, it is refused outright", f1b.title, "Not possible");
  show("  its line", f1b.line);
  show("  its fixes", f1b.fixes.map((x) => x.label));

  // Buffer swallows the whole runway.
  const noRunway = ws({ examDate: dates.isoIn(5), hoursPerWeek: 5, bufferDays: 7 });
  const f2 = feas.feasibility(noRunway, 600);
  check("buffer past the exam is refused", f2.title, "Not possible");
  show("  its line", f2.line);

  // Past the 10 h/day ceiling.
  const ceiling = ws({ examDate: dates.isoIn(14), hoursPerWeek: 5, bufferDays: 0, studyDays: [1] });
  const f3 = feas.feasibility(ceiling, 60 * 200);
  check("past the 10h/day ceiling is refused", f3.title, "Not possible");
  show("  its line", f3.line);

  // Doesn't fit, but is reachable.
  const tight = ws({ examDate: dates.isoIn(60), hoursPerWeek: 2, bufferDays: 7 });
  const f4 = feas.feasibility(tight, 60 * 40);
  check("doesn't fit at the current budget", f4.title, "Doesn't fit at 2 h/week");
  show("  its line", f4.line);
  show("  its fixes", f4.fixes.map((x) => x.label));

  // Comfortable.
  const easy = ws({ examDate: dates.isoIn(90), hoursPerWeek: 8, bufferDays: 7 });
  const f5 = feas.feasibility(easy, 60 * 20);
  check("a workable plan says so", f5.title, "This works");
  show("  best fit", f5.best);

  // No date at all.
  const undated = ws({ examDate: "", hoursPerWeek: 5 });
  check("no date, nothing to check", feas.feasibility(undated, 600).title, "Nothing to check");

  // A fix actually changes the workspace.
  const fixMe = ws({ examDate: dates.isoIn(60), hoursPerWeek: 2, bufferDays: 7 });
  const fix = feas.feasibility(fixMe, 60 * 40).fixes[0];
  fix.apply(fixMe);
  show("applying the first fix sets hoursPerWeek", fixMe.hoursPerWeek);

  // --- auto-schedule --------------------------------------------------------
  const toSchedule = ws({
    examDate: dates.isoIn(70), hoursPerWeek: 5, bufferDays: 7,
    courses: [course("c1", [["s1", 9, 60, 5], ["s2", 9, 30, 5], ["s3", 9, 60, 4], ["s4", 9, 20, 3]])],
  });
  sched.autoSchedule(toSchedule);
  show("auto-schedule assigns weeks", toSchedule.courses[0].sections.map((s) => s.week));
  check("auto-schedule starts at week 1", toSchedule.courses[0].sections[0].week, 1);
  check("weeks never go backwards",
    toSchedule.courses[0].sections.map((s) => s.week).every((w, i, a) => i === 0 || w >= a[i - 1]), true);

  // A single long section is not pushed onto its own week (the 1.25 tolerance).
  const oneLong = ws({ hoursPerWeek: 1, courses: [course("c", [["a", 1, 70, 1], ["b", 1, 5, 1]])] });
  sched.autoSchedule(oneLong);
  check("a long section stays in week 1", oneLong.courses[0].sections[0].week, 1);

  // --- day plan -------------------------------------------------------------
  const today = new Date(2026, 8, 3); // Thursday
  const yesterday = new Date(2026, 8, 2);
  const anchored = ws({
    hoursPerWeek: 5, studyDays: [1, 2, 3, 4, 5],
    courses: [course("c", [["s", 1, 30, 4, 1]])],
  });
  // Finished yesterday: it must sit on Wednesday, not today.
  anchored.doneAt["s-l0"] = new Date(2026, 8, 2, 19, 0).toISOString();
  const plan = dayPlan.buildDayPlan(anchored, 1, null, today);
  const byDow = Object.fromEntries(plan.cells.map((c) => [c.date.getDate(), c.items.map((i) => i.l.id + (i.carried ? `(from ${i.carried})` : "") + (i.fixed ? "[fixed]" : ""))]));
  show("day plan placement", byDow);
  check("finished work anchors to the day it was finished",
    plan.cells.find((c) => c.date.getDate() === 2).items.some((i) => i.l.id === "s-l0" && i.fixed), true);
  check("leftovers are counted, not hops", typeof plan.rolled, "number");
  show("  rolled count", plan.rolled);
  check("rest days are marked",
    plan.cells.filter((c) => !c.study).map((c) => c.date.getDay()), [6, 0]);

  // Carried items are tagged with the original day, and land in front.
  const carriedFirst = plan.cells.find((c) => c.date.getDate() === 3);
  show("today's items", carriedFirst.items.map((i) => [i.l.id, i.carried || "-"]));

  // --- ics ------------------------------------------------------------------
  const icsWs = ws({ examDate: "2026-10-16", hoursPerWeek: 5, courses: [course("c", [["s", 1, 30, 2]])] });
  const ics = cal.buildIcs(icsWs);
  check("ics opens and closes", [ics.startsWith("BEGIN:VCALENDAR"), ics.trimEnd().endsWith("END:VCALENDAR")], [true, true]);
  check("ics uses CRLF", ics.includes("\r\n"), true);
  check("ics has an all-day exam event", ics.includes("DTSTART;VALUE=DATE:20261016"), true);
  check("ics times are floating (no Z)", /DTSTART:\d{8}T\d{6}Z/.test(ics), false);
  show("ics event count", (ics.match(/BEGIN:VEVENT/g) || []).length);

  // --- curriculum parsers ---------------------------------------------------
  const glued = curr.parseCurriculumText([
    "Data Protection and Encryption8 lectures • 1hr 14min",
    "Introduction to Data Protection (OBJ. 2.1)",
    "Preview",
    "07:12",
    "Encryption Fundamentals",
    "09:30",
  ].join("\n"));
  check("glued heading becomes a section", glued.length, 1);
  check("  its title is cleaned", glued[0].title, "Data Protection and Encryption");
  check("  a bare mm:ss attaches to the line above", glued[0].lectures.length, 2);
  check("  OBJ tags are stripped", glued[0].lectures[0].title, "Introduction to Data Protection");
  check("  runtimes round up", glued[0].lectures.map((l) => l.mins), [7, 10]);

  const summary = curr.readSummaryRow("45 sections • 323 lectures • 51h 40m total length");
  check("summary row is read", summary, { sections: 45, lectures: 323, length: "51h 40m" });

  const html = curr.parseCurriculumHtml(
    '<div class="section--section--abc"><h3>Logging 8 lectures • 1hr</h3>' +
    '<li><span class="item-title">Fundamentals of Security Logging</span> 08:10</li>' +
    '<li><span class="item-title">Log Ingestion</span> 07:50</li></div>'
  );
  check("html panel becomes a section", html.secs.length, 1);
  check("  html lectures and runtimes", html.secs[0].lectures.map((l) => [l.title, l.mins]),
    [["Fundamentals of Security Logging", 8], ["Log Ingestion", 8]]);

  check("a zero-minute lecture never reaches zero",
    curr.parseCurriculumText("S1 lectures • 1min\nTiny\n00:20")[0].lectures[0].mins, 1);

  // --- import merge ---------------------------------------------------------
  const existing = [ws({ id: "a", name: "German A2" })];
  const merged = store.prepareImport(
    { app: "studyframe", version: 1, spaces: [{ id: "a", name: "German A2", courses: [] }] },
    existing,
  );
  check("a name clash arrives alongside", merged[0].name, "German A2 (imported)");
  check("  with a fresh id", merged[0].id !== "a", true);
  let refused = "";
  try { store.prepareImport({ app: "nope", version: 1, spaces: [] }, existing); }
  catch (e) { refused = e.message; }
  check("a foreign file is refused", refused, "That file isn't a StudyFrame export.");
  let refused2 = "";
  try { store.prepareImport({ app: "studyframe", version: 9, spaces: [{}] }, existing); }
  catch (e) { refused2 = e.message; }
  check("a future version is refused", refused2, "That file isn't a StudyFrame export.");

  // --- migration ------------------------------------------------------------
  const old = mig.migrateWorkspace({ id: "o", name: "Old", courses: [course("c", [["s", 1, 10, 2, 2]])] });
  check("defaults are filled in",
    [old.bufferDays, old.studyDays, old.log.length, Array.isArray(old.sessions)],
    [7, [1, 2, 3, 4, 5], 28, true]);
  check("completed lectures without a stamp get one", Object.keys(old.doneAt).length, 2);

  // rollLog shifts the window on a new day.
  const rolled = mig.migrateWorkspace({ id: "r", name: "R", courses: [] });
  rolled.log = Array.from({ length: 28 }, (_, i) => ({ mins: i }));
  mig.rollLog(rolled, dates.isoIn(-3) + "T10:00:00");
  check("log shifts left on a new day", [rolled.log.length, rolled.log[27].mins, rolled.log[0].mins], [28, 0, 3]);

  // --- derived progress -----------------------------------------------------
  const prog = ws({ courses: [course("c", [["s", 1, 10, 4, 1]])] });
  check("course percentage is derived", derive.coursePct(prog.courses[0]), 25);
  check("remaining minutes skip finished work", derive.remainingMins(prog), 30);
  check("daily target splits the week", derive.dailyTarget(ws({ hoursPerWeek: 5, studyDays: [1,2,3,4,5] })), 60);

  return out;
});

const report = reporter("planner");
for (const r of results) {
  if (r.want === "(inspect)") report.note(r.name, r.got);
  else report.check(r.name, r.got, r.want);
}
const failed = report.finish();
await browser.close();
process.exit(failed ? 1 : 0);
