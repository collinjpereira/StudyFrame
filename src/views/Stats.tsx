import type { Workspace } from "../store/types";
import { coursePct, dailyTarget, flatten, remainingMins, workspacePct } from "../planner/derive";
import { paceNumbers } from "../planner/pacing";
import { dur, hm, plural, short } from "../lib/format";
import { Card, Kicker, ProgressBar, ScreenTitle } from "../components/ui";
import { dayLog, Sparkline } from "./Sparkline";

interface Tile {
  value: string | number;
  label: string;
  sub: string;
  color?: string;
}

export function Stats({ ws }: { ws: Workspace }) {
  const log = dayLog(ws);
  const flat = flatten(ws);
  const done = flat.filter((x) => x.l.done);
  const remaining = remainingMins(ws);
  const pace = paceNumbers(ws);

  const recent = ws.sessions.slice(-14);
  const focusSecs = recent.reduce((a, s) => a + s.focusSecs, 0);
  const breakSecs = recent.reduce((a, s) => a + s.breakSecs, 0);
  const breakCount = recent.reduce((a, s) => a + s.breaks, 0);

  // vs estimate: how the clock compared with the published runtimes.
  const timed = flat.filter((x) => (ws.actuals[x.l.id] || 0) > 0);
  const estSum = timed.reduce((a, x) => a + x.l.mins, 0);
  const actSum = timed.reduce((a, x) => a + ws.actuals[x.l.id], 0);
  const speed = estSum > 0 ? actSum / estSum : 0;

  const target = dailyTarget(ws);

  const progressTiles: Tile[] = [
    {
      value: log.streak,
      label: "day streak",
      sub: "consecutive study days",
      color: "var(--color-accent-400)",
    },
    { value: hm(log.totalMins), label: "studied", sub: "last 28 days" },
    {
      value: `${done.length}/${flat.length}`,
      label: "lectures done",
      sub: `${workspacePct(ws)}% of the workspace`,
    },
    {
      value: hm(remaining),
      label: "left to watch",
      sub:
        pace.need > 0
          ? `${pace.need.toFixed(1)} h/week to hit the date`
          : `${ws.hoursPerWeek} h/week budgeted`,
    },
  ];

  const timerTiles: Tile[] = [
    {
      value: ws.sessions.length ? dur(focusSecs) : "—",
      label: "timed focus",
      sub: ws.sessions.length
        ? `across ${plural(recent.length, "session")}`
        : "run the timer to start tracking",
      color: "var(--color-accent-400)",
    },
    {
      value: recent.length ? dur(Math.round(focusSecs / recent.length)) : "—",
      label: "average session",
      sub: recent.length
        ? `longest ${dur(Math.max(...recent.map((s) => s.focusSecs)))}`
        : "no sessions yet",
    },
    {
      value: breakCount > 0
        ? `${Math.round((breakSecs / Math.max(1, focusSecs + breakSecs)) * 100)}%`
        : "—",
      label: "on break",
      sub:
        breakCount > 0
          ? `${dur(breakSecs)} across ${plural(breakCount, "break")}`
          : "no breaks logged",
    },
    {
      value: speed > 0 ? `${speed.toFixed(2)}×` : "—",
      label: "vs estimate",
      sub:
        speed > 0
          ? speed > 1.05
            ? `slower than the runtimes — ${hm(actSum)} on ${hm(estSum)} of video`
            : speed < 0.95
              ? "faster than the runtimes"
              : "right on the runtimes"
          : "finish a lecture on the clock",
      color: speed > 1.15 ? "var(--color-warn-text)" : undefined,
    },
  ];

  return (
    <div
      className="scroll"
      style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "28px 34px 150px" }}
    >
      <ScreenTitle
        title="Stats"
        sub={`${ws.name} · ${hm(log.totalMins)} logged over the last four weeks`}
      />

      <div style={{ height: 26 }} />
      <TileRow tiles={progressTiles} />
      <div style={{ height: 14 }} />
      <TileRow tiles={timerTiles} inset />

      {ws.sessions.length ? (
        <>
          <div style={{ height: 24 }} />
          <div style={{ maxWidth: 960 }}>
            <Kicker style={{ marginBottom: 10 }}>Recent sessions</Kicker>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ws.sessions
                .slice(-6)
                .reverse()
                .map((s) => (
                  <div
                    key={s.at}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      borderRadius: 10,
                      padding: "12px 16px",
                      background: "var(--surface-inset)",
                      boxShadow: "0 0 0 1px rgba(233,233,237,0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: 200,
                        flex: "none",
                        fontSize: 12.5,
                        color: "rgba(233,233,237,0.62)",
                      }}
                    >
                      {new Date(s.at).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      ·{" "}
                      {new Date(s.at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div
                      className="tnum"
                      style={{ width: 66, flex: "none", fontSize: 14, fontWeight: 500 }}
                    >
                      {dur(s.focusSecs)}
                    </div>
                    <div style={{ flex: 1, minWidth: 60, display: "flex" }}>
                      <ProgressBar
                        height={3}
                        pct={Math.min(
                          100,
                          Math.round((s.focusSecs / 60 / Math.max(1, target)) * 100),
                        )}
                      />
                    </div>
                    <div
                      style={{
                        width: 120,
                        flex: "none",
                        textAlign: "right",
                        fontSize: 11.5,
                        color: "rgba(233,233,237,0.44)",
                      }}
                    >
                      {s.breaks ? `${plural(s.breaks, "break")} · ${dur(s.breakSecs)}` : "no breaks"}
                    </div>
                    <div
                      style={{
                        width: 140,
                        flex: "none",
                        textAlign: "right",
                        fontSize: 11.5,
                        color: "rgba(233,233,237,0.44)",
                      }}
                    >
                      {s.lectures.length
                        ? `${plural(s.lectures.length, "lecture")} cleared`
                        : "nothing marked done"}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : null}

      <div style={{ height: 28 }} />

      <Card style={{ maxWidth: 960 }} padding="20px 22px">
        <Kicker>Minutes studied · last 28 days</Kicker>
        <div style={{ height: 18 }} />
        <Sparkline days={log.days} height={132} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10.5,
            color: "var(--text-faint)",
            marginTop: 8,
          }}
        >
          <span>4 weeks ago</span>
          <span>avg {Math.round(log.totalMins / 28)} min/day</span>
          <span>today</span>
        </div>
      </Card>

      <div style={{ height: 24 }} />

      <div style={{ maxWidth: 960, display: "flex", flexDirection: "column", gap: 9 }}>
        {ws.courses.map((c) => {
          const all = c.sections.flatMap((s) => s.lectures);
          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                borderRadius: 10,
                padding: "14px 17px",
                background: "var(--surface-inset)",
                boxShadow: "0 0 0 1px rgba(233,233,237,0.05)",
              }}
            >
              <div className="min0" style={{ width: 250, flex: "none" }}>
                <div className="trunc" style={{ fontSize: 13.5, fontWeight: 500 }}>
                  {short(c.title, 34)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {short(c.provider, 32)}
                </div>
              </div>
              <div style={{ flex: 1, display: "flex" }}>
                <ProgressBar pct={coursePct(c)} height={4} />
              </div>
              <div
                className="tnum"
                style={{
                  flex: "none",
                  width: 150,
                  textAlign: "right",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {all.filter((l) => l.done).length}/{all.length} ·{" "}
                {hm(all.filter((l) => !l.done).reduce((a, l) => a + l.mins, 0))} left
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TileRow({ tiles, inset }: { tiles: Tile[]; inset?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        maxWidth: 960,
      }}
    >
      {tiles.map((t) => (
        <Card key={t.label} inset={inset} padding="15px 17px">
          <div className="tnum" style={{ fontSize: 25, fontWeight: 500, color: t.color }}>
            {t.value}
          </div>
          <Kicker style={{ marginTop: 3 }}>{t.label}</Kicker>
          <div
            className="pretty"
            style={{
              fontSize: 11.5,
              color: "rgba(233,233,237,0.44)",
              marginTop: 7,
              lineHeight: 1.45,
            }}
          >
            {t.sub}
          </div>
        </Card>
      ))}
    </div>
  );
}
