import type { Op, SheetItem } from "@/lib/engine";
import { supports } from "@/lib/engine";
import type { Entry } from "@/lib/parse";

/**
 * One editable row of the confirm table. Fields are kept as typed text so a parent can
 * clear and retype them freely; `readRow` decides what the row means.
 */
export interface DraftRow {
  id: string;
  a: string;
  op: Op;
  b: string;
  answer: string;
  /** The photo reader wasn't sure about a digit here; cleared once the parent edits the row. */
  unsure?: boolean;
}

export type RowState =
  /** Both numbers and the child's answer are there: this row gets checked. */
  | { kind: "ready"; item: SheetItem }
  /** The child left the answer blank: skipped. */
  | { kind: "blank" }
  /** A number is missing. */
  | { kind: "incomplete" }
  /** A real problem, but outside what the engine diagnoses. */
  | { kind: "unsupported" };

let nextId = 0;
const newId = (): string => `row-${++nextId}`;

export const emptyRow = (op: Op = "-"): DraftRow => ({ id: newId(), a: "", op, b: "", answer: "" });

export const toDraftRow = (entry: Entry, unsure = false): DraftRow => ({
  id: newId(),
  a: String(entry.a),
  op: entry.op,
  b: String(entry.b),
  answer: entry.answer === null ? "" : String(entry.answer),
  ...(unsure && { unsure }),
});

/** Whole number typed into a field, or null if the field is empty or not a number. */
const whole = (text: string): number | null => {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
};

export function readRow(row: DraftRow): RowState {
  const a = whole(row.a);
  const b = whole(row.b);
  if (a === null || b === null) return { kind: "incomplete" };
  const problem = { op: row.op, a, b };
  if (!supports(problem)) return { kind: "unsupported" };
  const answer = whole(row.answer);
  if (answer === null) return { kind: "blank" };
  return { kind: "ready", item: { problem, answer } };
}

/** The rows that will be checked, in worksheet order. */
export function readyItems(rows: DraftRow[]): SheetItem[] {
  return rows.flatMap((row) => {
    const state = readRow(row);
    return state.kind === "ready" ? [state.item] : [];
  });
}
