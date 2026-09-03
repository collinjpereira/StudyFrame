import type { Workspace } from "../store/types";
import { addDays } from "../planner/dates";

export interface LogBar {
  mins: number;
  height: number;
  /** Recent days read as the accent; older ones step back to the 700. */
  color: string;
  label: string;
}

export interface DayLog {
  days: LogBar[];
  streak: number;
  totalMins: number;
}

/**
 * The 28-day log turned into bars. Zero-minute days are a faint ground so a
 * missed day reads as missed rather than as no data.
 */
export function dayLog(ws: Workspace): DayLog {
  const log = ws.log;
  const max = Math.max(1, ...log.map((d) => d.mins));
  const days: LogBar[] = log.map((d, i) => {
    const date = addDays(new Date(), -(27 - i));
    return {
      mins: d.mins,
      height: Math.max(2, Math.round((d.mins / max) * 100)),
      color:
        d.mins === 0
          ? "rgba(233,233,237,0.08)"
          : i >= 21
            ? "var(--color-accent)"
            : "var(--color-accent-700)",
      label: `${date.getDate()}/${date.getMonth() + 1} · ${d.mins} min`,
    };
  });

  // Today is still in progress, so the streak counts back from yesterday.
  let streak = 0;
  for (let i = log.length - 2; i >= 0; i--) {
    if (log[i].mins > 0) streak++;
    else break;
  }

  return { days, streak, totalMins: log.reduce((a, d) => a + d.mins, 0) };
}

export function Sparkline({ days, height }: { days: LogBar[]; height: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height }}>
      {days.map((d, i) => (
        <div
          key={i}
          title={d.label}
          style={{
            flex: 1,
            borderRadius: 2,
            background: d.color,
            height: `${d.height}%`,
          }}
        />
      ))}
    </div>
  );
}
