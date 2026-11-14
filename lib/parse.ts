import type { Op } from "@/lib/engine";
import { SYMBOL } from "@/lib/engine";

/** One problem as it stands on the worksheet. `answer` is null when the child left it blank. */
export interface Entry {
  op: Op;
  a: number;
  b: number;
  answer: number | null;
}

export type ParsedLine = { ok: true; text: string; entry: Entry } | { ok: false; text: string };

/** Most problems a single worksheet may hold (same cap as the photo reader). */
export const MAX_PROBLEMS = 30;

/** Every way a parent might type an operator, including look-alike dashes and letters. */
const OPERATORS: Record<string, Op> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "–": "-",
  "—": "-",
  "*": "*",
  "×": "*",
  "✕": "*",
  "·": "*",
  x: "*",
  X: "*",
  х: "*", // Cyrillic
  Х: "*",
};

const NUMBER = String.raw`\d{1,3}(?:,\d{3})+|\d+`;
const OPERATOR = `[${Object.keys(OPERATORS).join("").replace("-", "\\-")}]`;
/** `a op b`, then optionally `=` and the answer; `_` or `?` mark a blank. */
const PROBLEM = new RegExp(
  String.raw`^(${NUMBER})\s*(${OPERATOR})\s*(${NUMBER})\s*(?:=\s*(${NUMBER})?\s*[_?]*)?$`,
);
/** Worksheet numbering in front of a problem: "3) ", "12. ", "b) ". */
const LABEL = /^(?:\d{1,2}|[a-z])[.)]\s+/i;

const toNumber = (digits: string): number => Number(digits.replaceAll(",", ""));

/** Parse one typed problem such as "52-18=46", "23x45=815" or "23 × 45 = 815". */
export function parseLine(text: string): Entry | null {
  const match = PROBLEM.exec(text.trim().replace(LABEL, ""));
  if (!match) return null;
  const [, a, symbol, b, answer] = match;
  const entry: Entry = {
    op: OPERATORS[symbol],
    a: toNumber(a),
    b: toNumber(b),
    answer: answer === undefined ? null : toNumber(answer),
  };
  const numbers = [entry.a, entry.b, entry.answer ?? 0];
  return numbers.every(Number.isSafeInteger) ? entry : null;
}

/**
 * Parse a typed worksheet. Problems are separated by new lines, semicolons, or a comma
 * followed by a space (a comma inside a number, as in 1,035, is a thousands separator).
 */
export function parseWorksheet(text: string): ParsedLine[] {
  return text
    .split(/\r?\n|;|,\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line): ParsedLine => {
      const entry = parseLine(line);
      return entry ? { ok: true, text: line, entry } : { ok: false, text: line };
    });
}

/** "52 − 18 = 46"; a blank answer leaves the right-hand side empty. */
export function formatEntry(entry: Entry): string {
  return `${entry.a} ${SYMBOL[entry.op]} ${entry.b} = ${entry.answer ?? ""}`.trimEnd();
}
