import { MagicWand, SlidersHorizontal } from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { Button, ScreenTitle, Segmented } from "../components/ui";
import { useApp } from "../store/store";
import { RoadmapWeeks } from "./RoadmapWeeks";
import { RoadmapDays } from "./RoadmapDays";

export function Roadmap({ ws }: { ws: Workspace }) {
  const mode = useApp((s) => s.roadmapMode);
  const set = useApp((s) => s.set);
  const replan = useApp((s) => s.replan);

  return (
    <div
      className="scroll"
      style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "28px 0 150px 34px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingRight: 34,
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <ScreenTitle
          title="Roadmap"
          sub="Drag a section onto another week, or let StudyFrame lay it out from your plan."
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button onClick={replan}>
            <MagicWand size={14} />
            Auto-schedule
          </Button>
          <Button variant="secondary" onClick={() => set({ dialog: "plan" })}>
            <SlidersHorizontal size={14} />
            Plan
          </Button>
        </div>
      </div>

      <div style={{ height: 22 }} />
      <div style={{ marginTop: 20, marginRight: 34, width: "max-content" }}>
        <Segmented
          value={mode}
          onChange={(v) => set({ roadmapMode: v })}
          options={[
            { value: "weeks", label: "Weeks" },
            { value: "days", label: "Days" },
          ]}
        />
      </div>

      {mode === "weeks" ? <RoadmapWeeks ws={ws} /> : <RoadmapDays ws={ws} />}
    </div>
  );
}
