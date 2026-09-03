import { Check, Lightning, MagnifyingGlass, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import type { Workspace } from "../store/types";
import { flatten, noteKeys } from "../planner/derive";
import { short } from "../lib/format";
import { Button, Kicker, Segmented } from "../components/ui";
import { useApp } from "../store/store";
import { draftCardsFromNote } from "../lib/cardDrafts";

export function Notes({ ws }: { ws: Workspace }) {
  const lectureId = useApp((s) => s.lectureId);
  const query = useApp((s) => s.query);
  const tab = useApp((s) => s.tab);
  const revealed = useApp((s) => s.revealed);
  const editingCard = useApp((s) => s.editingCard);
  const composer = useApp((s) => s.composer);
  const newCardQ = useApp((s) => s.newCardQ);
  const newCardA = useApp((s) => s.newCardA);
  const savedAt = useApp((s) => s.savedAt);
  const set = useApp((s) => s.set);
  const mutate = useApp((s) => s.mutate);
  const addCard = useApp((s) => s.addCard);
  const addCards = useApp((s) => s.addCards);

  const flat = flatten(ws);
  const keys = noteKeys(ws);
  const active = lectureId || keys[0] || flat[0]?.l.id || null;
  const context = flat.find((x) => x.l.id === active);
  const q = query.trim().toLowerCase();

  const list = flat
    .filter((x) => (ws.notes[x.l.id] || "").trim() || x.l.id === active)
    .filter(
      (x) =>
        !q ||
        `${x.l.title} ${x.c.title} ${ws.notes[x.l.id] || ""}`.toLowerCase().includes(q),
    );

  const cards = ws.cards.filter((c) => c.lectureId === active);

  const editCard = (id: string, fn: (c: { q: string; a: string }) => void) =>
    mutate((w) => {
      const card = w.cards.find((c) => c.id === id);
      if (card) fn(card);
    });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <div
        className="scroll"
        style={{
          width: 282,
          flex: "none",
          overflowY: "auto",
          padding: "22px 16px 150px",
          boxShadow: "inset -1px 0 0 rgba(233,233,237,0.07)",
        }}
      >
        <Kicker style={{ padding: "0 2px 9px" }}>Notes · {short(ws.name, 24)}</Kicker>

        <div style={{ position: "relative" }}>
          <MagnifyingGlass
            size={14}
            color="var(--text-faint)"
            style={{ position: "absolute", left: 10, top: 10 }}
          />
          <input
            className="input"
            value={query}
            placeholder="Search this workspace"
            onChange={(e) => set({ query: e.target.value })}
            style={{
              padding: "8px 10px 8px 31px",
              fontSize: 13,
              background: "var(--surface-card)",
              borderColor: "rgba(233,233,237,0.1)",
            }}
          />
        </div>

        <div style={{ height: 13 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {list.map((x) => {
            const on = x.l.id === active;
            return (
              <button
                key={x.l.id}
                type="button"
                className="nav-row"
                onClick={() => set({ lectureId: x.l.id })}
                style={{
                  width: "100%",
                  padding: "10px 11px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: on ? "var(--color-accent-900)" : "transparent",
                }}
              >
                <div
                  className="trunc"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    lineHeight: 1.3,
                    color: on ? "var(--color-accent-300)" : "var(--color-text)",
                  }}
                >
                  {x.l.title}
                </div>
                <div
                  className="trunc"
                  style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}
                >
                  {(ws.notes[x.l.id] || "").replace(/\s+/g, " ").trim() || "Empty note"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="min0"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "24px 30px 130px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div className="min0">
            <Kicker>
              {context ? `${context.c.provider} · ${context.s.title}` : ws.name}
            </Kicker>
            <h2
              className="pretty"
              style={{ margin: "6px 0 0", fontSize: 22, letterSpacing: "-0.015em" }}
            >
              {context ? context.l.title : "No note selected"}
            </h2>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 5 }}>
              Saved locally ·{" "}
              {new Date(savedAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div style={{ flex: "none" }}>
            <Segmented
              value={tab}
              onChange={(v) => set({ tab: v })}
              options={[
                { value: "note", label: "Note" },
                { value: "cards", label: `Cards ${cards.length}` },
              ]}
            />
          </div>
        </div>

        <div style={{ height: 15 }} />

        {tab === "note" ? (
          <textarea
            value={active ? ws.notes[active] || "" : ""}
            placeholder="Markdown welcome. Start a line with a timestamp — 12:40 — to pin it to the video."
            disabled={!active}
            // Saves on every keystroke; the store debounces the write to disk.
            onChange={(e) => {
              const v = e.target.value;
              if (!active) return;
              mutate((w) => {
                w.notes[active] = v;
              });
            }}
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              resize: "none",
              padding: "18px 20px",
              fontSize: 14.5,
              lineHeight: 1.75,
              color: "var(--color-text)",
              background: "var(--surface-inset)",
              border: "1px solid rgba(233,233,237,0.08)",
              borderRadius: 10,
            }}
          />
        ) : (
          <div
            className="scroll"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 640 }}
            >
              {cards.map((c) => {
                const editing = editingCard === c.id;
                const shown = !!revealed[c.id];
                return (
                  <div
                    key={c.id}
                    style={{
                      borderRadius: 10,
                      padding: "14px 16px",
                      background: "var(--surface-inset)",
                      boxShadow: "0 0 0 1px rgba(233,233,237,0.07)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      {editing ? (
                        <>
                          <textarea
                            className="input"
                            value={c.q}
                            placeholder="Question"
                            onChange={(e) => {
                              const v = e.target.value;
                              editCard(c.id, (x) => {
                                x.q = v;
                              });
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              height: 56,
                              resize: "vertical",
                              fontSize: 13.5,
                              fontWeight: 500,
                              lineHeight: 1.5,
                            }}
                          />
                          <button
                            type="button"
                            className="icon-btn"
                            title="Done"
                            onClick={() => set({ editingCard: null })}
                            style={{
                              width: 24,
                              height: 24,
                              color: "var(--color-accent-300)",
                            }}
                          >
                            <Check size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div
                            className="min0 pretty"
                            style={{ flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}
                          >
                            {c.q}
                          </div>
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit card"
                            onClick={() => set({ editingCard: c.id })}
                            style={{ width: 24, height: 24 }}
                          >
                            <PencilSimple size={13} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        title="Delete card"
                        onClick={() =>
                          mutate((w) => {
                            w.cards = w.cards.filter((x) => x.id !== c.id);
                          })
                        }
                        style={{ width: 24, height: 24 }}
                      >
                        <Trash size={13} />
                      </button>
                    </div>

                    <div style={{ height: 9 }} />

                    {editing ? (
                      <textarea
                        className="input"
                        value={c.a}
                        placeholder="Answer"
                        onChange={(e) => {
                          const v = e.target.value;
                          editCard(c.id, (x) => {
                            x.a = v;
                          });
                        }}
                        style={{ height: 74, resize: "vertical", fontSize: 13.5, lineHeight: 1.6 }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="pretty"
                        onClick={() =>
                          set({ revealed: { ...revealed, [c.id]: !revealed[c.id] } })
                        }
                        style={{
                          width: "100%",
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          cursor: "pointer",
                          color: shown ? "rgba(233,233,237,0.78)" : "rgba(233,233,237,0.38)",
                          background: shown
                            ? "rgba(145,132,217,0.1)"
                            : "rgba(233,233,237,0.04)",
                          borderRadius: 7,
                          padding: "9px 11px",
                        }}
                      >
                        {shown ? c.a : "Tap to reveal"}
                      </button>
                    )}
                  </div>
                );
              })}

              {composer ? (
                <div
                  style={{
                    borderRadius: 10,
                    padding: "14px 16px",
                    background: "var(--surface-inset)",
                    boxShadow: "0 0 0 1px var(--color-accent-700)",
                  }}
                >
                  <Kicker>
                    New card · {context ? short(context.l.title, 40) : "this lecture"}
                  </Kicker>
                  <div style={{ height: 10 }} />
                  <textarea
                    className="input"
                    value={newCardQ}
                    placeholder="Question — e.g. Which event IDs mark a successful brute force?"
                    onChange={(e) => set({ newCardQ: e.target.value })}
                    style={{
                      height: 56,
                      resize: "vertical",
                      fontSize: 13.5,
                      fontWeight: 500,
                      lineHeight: 1.5,
                    }}
                  />
                  <div style={{ height: 8 }} />
                  <textarea
                    className="input"
                    value={newCardA}
                    placeholder="Answer"
                    onChange={(e) => set({ newCardA: e.target.value })}
                    style={{ height: 74, resize: "vertical", fontSize: 13.5, lineHeight: 1.6 }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 9,
                      marginTop: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      disabled={!newCardQ.trim() || !active}
                      onClick={() => {
                        if (!active) return;
                        addCard({ lectureId: active, q: newCardQ.trim(), a: newCardA.trim() });
                      }}
                    >
                      <Check size={14} />
                      Save card
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => set({ composer: false, newCardQ: "", newCardA: "" })}
                    >
                      Cancel
                    </Button>
                    <span style={{ fontSize: 11.5, color: "rgba(233,233,237,0.34)" }}>
                      Cards live in this workspace only
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="dashed"
                    onClick={() => set({ composer: true, newCardQ: "", newCardA: "" })}
                    style={{
                      flex: 1,
                      minWidth: 200,
                      borderRadius: 10,
                      padding: "13px 16px",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <Plus size={14} />
                    Write a card for this lecture
                  </button>
                  <button
                    type="button"
                    className="dashed"
                    title="Turn note lines into card drafts you then edit"
                    onClick={() => {
                      if (!active) return;
                      const text = ws.notes[active] || "";
                      const drafts = draftCardsFromNote(text, active);
                      if (!drafts.length) {
                        set({
                          composer: true,
                          newCardQ: "",
                          newCardA: (text.split("\n").find((l) => l.trim()) || "").trim(),
                        });
                        return;
                      }
                      addCards(drafts);
                    }}
                    style={{
                      flex: "none",
                      borderRadius: 10,
                      padding: "13px 16px",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                    }}
                  >
                    <Lightning size={14} />
                    Draft from note
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
