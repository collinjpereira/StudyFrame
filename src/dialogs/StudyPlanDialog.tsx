import {
  ArrowCounterClockwise,
  CalendarCheck,
  CalendarDots,
  CheckCircle,
  Info,
  MagicWand,
  Sparkle,
  TrendDown,
  TrendUp,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { remainingMins, studyDays } from "../planner/derive";
import { feasibility } from "../planner/feasibility";
import { paceNumbers, paceVerdict } from "../planner/pacing";
import { autoSchedule } from "../planner/schedule";
import { hm, plural } from "../lib/format";
import {
  Button,
  DialogIntro,
  DialogTitle,
  FieldLabel,
  Kicker,
  Modal,
} from "../components/ui";
import { useApp } from "../store/store";

const ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: Warning,
  "x-circle": XCircle,
  "check-circle": CheckCircle,
  "trend-up": TrendUp,
  "trend-down": TrendDown,
  "calendar-check": CalendarCheck,
  "calendar-dots": CalendarDots,
  "arrow-counter-clockwise": ArrowCounterClockwise,
};

const BUFFER_OPTIONS = [0, 3, 7, 14];
const HOUR_OPTIONS = [3, 5, 8, 12];

export function StudyPlanDialog({ ws }: { ws: Workspace }) {
  const set = useApp((s) => s.set);
  const mutate = useApp((s) => s.mutate);
  const replan = useApp((s) => s.replan);

  const remaining = remainingMins(ws);
  const pace = paceVerdict(ws);
  const n = paceNumbers(ws);
  const fit = feasibility(ws, remaining);
  const dayCount = studyDays(ws).length;
  const close = () => set({ dialog: null });

  const facts = [
    { value: hm(remaining), label: "material left" },
    {
      value: ws.examDate ? (n.days > 0 ? plural(n.days, "day") : "past") : "—",
      label: "until target",
    },
    {
      value:
        ws.examDate && n.studyW > 0
          ? `${n.need.toFixed(1)} h`
          : plural(Math.ceil(n.finishWeeks), "wk"),
      label: ws.examDate && n.studyW > 0 ? "needed weekly" : "at current pace",
    },
    { value: n.finishDate, label: "finishes around" },
  ];

  return (
    <Modal width={560} onClose={close}>
      <DialogTitle>Study plan</DialogTitle>
      <DialogIntro>
        Give StudyFrame a target date and the hours you have each week. It works out the pace you
        need, then lays the sections onto the roadmap for you.
      </DialogIntro>

      <div style={{ height: 20 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <FieldLabel>Workspace name</FieldLabel>
          <input
            className="input"
            value={ws.name}
            onChange={(e) => {
              const v = e.target.value;
              mutate((w) => {
                w.name = v || w.name;
              });
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <FieldLabel>Exam / target date</FieldLabel>
            <input
              className="input"
              type="date"
              value={ws.examDate}
              onChange={(e) => {
                const v = e.target.value;
                mutate((w) => {
                  w.examDate = v;
                });
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 160 }}>
            <FieldLabel>Finish early by</FieldLabel>
            <PickerRow
              options={BUFFER_OPTIONS.map((b) => ({
                value: b,
                label: b === 0 ? "None" : `${b}d`,
              }))}
              active={n.buffer}
              title="Reserve this long before the exam for revision"
              onPick={(b) =>
                mutate((w) => {
                  w.bufferDays = b;
                })
              }
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
              <input
                className="input input-sm tnum"
                type="number"
                min={0}
                max={120}
                placeholder="Custom"
                value={n.buffer}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isFinite(v) || v < 0) return;
                  mutate((w) => {
                    w.bufferDays = Math.min(120, v);
                  });
                }}
                style={{ width: 78 }}
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>days early</span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 160 }}>
            <FieldLabel>Hours a week</FieldLabel>
            <PickerRow
              options={HOUR_OPTIONS.map((h) => ({ value: h, label: `${h} h` }))}
              active={ws.hoursPerWeek}
              onPick={(h) =>
                mutate((w) => {
                  w.hoursPerWeek = h;
                })
              }
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
              <input
                className="input input-sm tnum"
                type="number"
                min={0.25}
                max={80}
                step={0.25}
                placeholder="Custom"
                value={ws.hoursPerWeek}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isFinite(v) || v <= 0) return;
                  mutate((w) => {
                    w.hoursPerWeek = Math.min(80, Math.max(0.25, v));
                  });
                }}
                style={{ width: 78 }}
              />
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                ≈ {hm((ws.hoursPerWeek * 60) / Math.max(1, dayCount))} on each of{" "}
                {plural(dayCount, "study day")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />

      <div
        style={{
          borderRadius: 10,
          padding: "15px 17px",
          background: "var(--color-bg)",
          boxShadow: `inset 3px 0 0 ${pace.mark}, 0 0 0 1px rgba(233,233,237,0.06)`,
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 500, color: pace.mark }}>{pace.title}</div>
        <div
          className="pretty"
          style={{
            fontSize: 12.5,
            color: "rgba(233,233,237,0.62)",
            marginTop: 5,
            lineHeight: 1.6,
          }}
        >
          {pace.detail}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 14, flexWrap: "wrap" }}>
          {facts.map((f) => (
            <div key={f.label}>
              <div className="tnum" style={{ fontSize: 17, fontWeight: 500 }}>
                {f.value}
              </div>
              <Kicker style={{ marginTop: 2 }}>{f.label}</Kicker>
            </div>
          ))}
        </div>
      </div>

      {ws.examDate && remaining > 0 ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 10,
            padding: "15px 17px",
            background: fit.bg,
            boxShadow: `inset 3px 0 0 ${fit.mark}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {(() => {
              const Icon = ICONS[fit.icon] || Info;
              return <Icon size={16} color={fit.mark} />;
            })()}
            <div style={{ fontSize: 13.5, fontWeight: 500, color: fit.mark }}>{fit.title}</div>
          </div>
          <div
            className="pretty"
            style={{
              fontSize: 12.5,
              color: "rgba(233,233,237,0.66)",
              marginTop: 7,
              lineHeight: 1.6,
            }}
          >
            {fit.line}
          </div>
          {fit.fixes.length ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {fit.fixes.map((f) => {
                const Icon = ICONS[f.icon] || Info;
                return (
                  <Button key={f.label} size="sm" onClick={() => mutate((w) => f.apply(w))}>
                    <Icon size={13} />
                    {f.label}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 12,
          borderRadius: 10,
          padding: "15px 17px",
          background: "var(--color-bg)",
          boxShadow: "var(--hairline)",
        }}
      >
        <Kicker>Best fit for your dates</Kicker>
        <div
          className="pretty"
          style={{
            fontSize: 12.5,
            color: "rgba(233,233,237,0.66)",
            marginTop: 7,
            lineHeight: 1.6,
          }}
        >
          {fit.best}
        </div>
        <Button
          size="sm"
          style={{ marginTop: 12 }}
          onClick={() => {
            mutate((w) => {
              if (fit.bestApply) fit.bestApply(w);
              autoSchedule(w);
            });
            set({ view: "roadmap", roadmapMode: "days", dialog: null });
          }}
        >
          <Sparkle size={13} />
          {fit.bestAction}
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Button onClick={replan}>
          <MagicWand size={14} />
          Re-plan the roadmap
        </Button>
        <Button variant="secondary" onClick={close} style={{ padding: "7px 16px" }}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

/** The 4-up choice rows in the plan dialog, each with a free numeric input beneath. */
function PickerRow({
  options,
  active,
  onPick,
  title,
}: {
  options: { value: number; label: string }[];
  active: number;
  onPick: (value: number) => void;
  title?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        borderRadius: 7,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(233,233,237,0.12)",
      }}
    >
      {options.map((opt, i) => {
        const on = active === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={title}
            aria-pressed={on}
            onClick={() => onPick(opt.value)}
            className="seg-opt"
            style={{
              flex: 1,
              textAlign: "center",
              padding: "9px 0",
              fontSize: 13,
              color: on ? "var(--color-accent-300)" : "var(--text-secondary)",
              background: on ? "var(--color-accent-900)" : "transparent",
              boxShadow: i ? "inset 1px 0 0 rgba(233,233,237,0.1)" : "none",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
