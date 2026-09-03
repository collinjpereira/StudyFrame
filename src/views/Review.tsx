import type { Workspace } from "../store/types";
import { flatten } from "../planner/derive";
import { short } from "../lib/format";
import { Button, Kicker } from "../components/ui";
import { useApp } from "../store/store";

export function Review({ ws }: { ws: Workspace }) {
  const reviewIdx = useApp((s) => s.reviewIdx);
  const reviewShown = useApp((s) => s.reviewShown);
  const set = useApp((s) => s.set);
  const goto = useApp((s) => s.goto);

  const cards = ws.cards;
  // The deck cycles in order, so the index is free to run past the end.
  const card = cards.length ? cards[reviewIdx % cards.length] : null;
  const context = card ? flatten(ws).find((x) => x.l.id === card.lectureId) : undefined;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        placeItems: "center",
        padding: "34px 34px 150px",
      }}
    >
      <div className="min0" style={{ width: "min(640px, 100%)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <Kicker>
            {short(ws.name, 24)} ·{" "}
            {cards.length ? `${(reviewIdx % cards.length) + 1} of ${cards.length}` : "empty deck"}
          </Kicker>
          <button
            type="button"
            className="link-quiet"
            style={{ flex: "none" }}
            onClick={() => goto("today")}
          >
            Exit
          </button>
        </div>

        <div style={{ height: 14 }} />

        <div
          style={{
            borderRadius: 14,
            padding: "34px 32px",
            background: "var(--surface-card)",
            boxShadow: "0 0 0 1px rgba(233,233,237,0.07), 0 16px 40px rgba(0,0,0,0.5)",
            minHeight: 230,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(233,233,237,0.38)" }}>
            {context ? `${context.c.provider} · ${context.s.title}` : "Unfiled card"}
          </div>
          <div style={{ height: 16 }} />
          <div
            className="pretty"
            style={{ fontSize: 21, fontWeight: 500, lineHeight: 1.4, letterSpacing: "-0.01em" }}
          >
            {card ? card.q : "This workspace has no cards yet."}
          </div>
          <div style={{ height: 18 }} />
          <div
            className="pretty"
            style={{
              fontSize: 15,
              lineHeight: 1.65,
              color: reviewShown ? "rgba(233,233,237,0.8)" : "rgba(233,233,237,0.3)",
            }}
          >
            {card
              ? reviewShown
                ? card.a
                : "Answer hidden"
              : "Open a lecture note and add a card to start the deck."}
          </div>
          <div style={{ flex: 1, minHeight: 14 }} />
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Button
              disabled={!card}
              onClick={() => set({ reviewShown: !reviewShown })}
              style={{ padding: "9px 17px" }}
            >
              {reviewShown ? "Hide answer" : "Show answer"}
            </Button>
            <Button
              variant="secondary"
              disabled={!card}
              onClick={() => set({ reviewIdx: reviewIdx + 1, reviewShown: false })}
              style={{ padding: "9px 17px" }}
            >
              Next card
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
