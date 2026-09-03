import type { Card } from "../store/types";

/**
 * Splits a note into card drafts the user then edits: every
 * "term — explanation" line, with or without a leading timestamp, becomes a
 * question and an answer.
 */
export function draftCardsFromNote(text: string, lectureId: string): Omit<Card, "id">[] {
  const out: Omit<Card, "id">[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const stamped = line.match(/^(\d{1,3}:\d{2})\s*[—–-]?\s*(.+)$/);
    const body = stamped ? stamped[2] : line;
    const split = body.match(/^(.{4,70}?)\s*(?:—|–|:|=)\s*(.{4,})$/);
    if (!split) continue;
    out.push({ lectureId, q: `${split[1].trim()}?`, a: split[2].trim() });
  }
  return out;
}
