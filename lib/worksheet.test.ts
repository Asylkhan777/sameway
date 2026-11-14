import { describe, expect, it } from "vitest";
import { parseLine } from "./parse";
import { emptyRow, readRow, readyItems, toDraftRow } from "./worksheet";
import type { DraftRow } from "./worksheet";

const row = (a: string, op: DraftRow["op"], b: string, answer: string): DraftRow => ({
  ...emptyRow(op),
  a,
  b,
  answer,
});

describe("readRow", () => {
  it("a full row is ready to check", () => {
    expect(readRow(row("52", "-", "18", "46"))).toEqual({
      kind: "ready",
      item: { problem: { op: "-", a: 52, b: 18 }, answer: 46 },
    });
  });

  it("a blank answer means the row is skipped", () => {
    expect(readRow(row("52", "-", "18", "")).kind).toBe("blank");
    expect(readRow(row("52", "-", "18", "  ")).kind).toBe("blank");
  });

  it("zero is an answer, not a blank", () => {
    expect(readRow(row("18", "-", "18", "0")).kind).toBe("ready");
  });

  it("a missing or non-numeric number is incomplete", () => {
    expect(readRow(row("", "-", "18", "46")).kind).toBe("incomplete");
    expect(readRow(row("52", "-", "1b", "46")).kind).toBe("incomplete");
    expect(readRow(emptyRow()).kind).toBe("incomplete");
  });

  it("problems outside the engine's scope are flagged, with or without an answer", () => {
    expect(readRow(row("123", "*", "45", "5535")).kind).toBe("unsupported");
    expect(readRow(row("18", "-", "52", "")).kind).toBe("unsupported");
    expect(readRow(row("12000", "+", "5", "12005")).kind).toBe("unsupported");
  });
});

describe("draft rows", () => {
  it("come from parsed lines and keep a blank answer blank", () => {
    const entry = parseLine("23x45=");
    if (!entry) throw new Error("expected a parsed line");
    expect(toDraftRow(entry)).toMatchObject({ a: "23", op: "*", b: "45", answer: "" });
  });

  it("carry the photo reader's doubt, without changing what gets checked", () => {
    const entry = { op: "-" as const, a: 63, b: 27, answer: 44 };
    expect(toDraftRow(entry).unsure).toBeUndefined();
    const unsure = toDraftRow(entry, true);
    expect(unsure.unsure).toBe(true);
    expect(readRow(unsure)).toEqual({ kind: "ready", item: { problem: { op: "-", a: 63, b: 27 }, answer: 44 } });
  });

  it("get unique ids", () => {
    const ids = [emptyRow(), emptyRow(), emptyRow()].map((r) => r.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("readyItems keeps only the rows that will be checked, in order", () => {
    const rows = [row("52", "-", "18", "46"), row("63", "-", "27", ""), row("123", "*", "45", "1"), row("80", "-", "35", "55")];
    expect(readyItems(rows).map((i) => i.answer)).toEqual([46, 55]);
  });
});
