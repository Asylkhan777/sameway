import type { Problem } from "./types";

export const MAX = 9999;

const PLURAL = ["ones", "tens", "hundreds", "thousands", "ten-thousands"];
const SINGULAR = ["one", "ten", "hundred", "thousand", "ten-thousand"];

/** place(1) → "tens" */
export const place = (i: number): string => PLURAL[i] ?? `10^${i}s`;
/** unit(1) → "ten" */
export const unit = (i: number): string => SINGULAR[i] ?? `10^${i}`;
/** qty(1, 1) → "1 ten", qty(3, 0) → "3 ones" */
export const qty = (n: number, i: number): string => `${n} ${n === 1 ? unit(i) : place(i)}`;

/** Digits, ones first: 352 → [2, 5, 3]. */
export function toDigits(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Not a whole number: ${n}`);
  if (n === 0) return [0];
  const digits: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 10)) digits.push(x % 10);
  return digits;
}

/** [2, 5, 3] → 352 */
export function fromDigits(digits: number[]): number {
  return digits.reduceRight((acc, d) => acc * 10 + d, 0);
}

/** Digit of n in place i (0 = ones); 0 past the end. */
export const digitAt = (n: number, i: number): number => toDigits(n)[i] ?? 0;

export const digitCount = (n: number): number => toDigits(n).length;

/**
 * How a child writes column results side by side, highest place first.
 * A column may hold more than one digit: [15, 7] → 715.
 */
export function writeColumns(columns: number[]): number {
  return Number([...columns].reverse().join(""));
}

/** 2304 → [{2000, place 3}, {300, place 2}, {4, place 0}]; zero parts are skipped. */
export function expand(n: number): { value: number; place: number }[] {
  return toDigits(n)
    .map((d, i) => ({ value: d * 10 ** i, place: i }))
    .filter((part) => part.value > 0)
    .reverse();
}

export function solve(p: Problem): number {
  switch (p.op) {
    case "+":
      return p.a + p.b;
    case "-":
      return p.a - p.b;
    case "*":
      return p.a * p.b;
  }
}

/** [multi-digit factor, one-digit multiplier] for 27 × 3 or 3 × 27; otherwise null. */
export function oneDigitMultiplier(p: Problem): [number, number] | null {
  if (p.op !== "*") return null;
  if (p.a >= 10 && p.b >= 2 && p.b <= 9) return [p.a, p.b];
  if (p.b >= 10 && p.a >= 2 && p.a <= 9) return [p.b, p.a];
  return null;
}

export const isTwoByTwo = (p: Problem): boolean =>
  p.op === "*" && p.a >= 10 && p.a <= 99 && p.b >= 10 && p.b <= 99;

/** Grade 2–4 problems the engine can diagnose. */
export function supports(p: Problem): boolean {
  const whole = (n: number) => Number.isInteger(n) && n >= 0 && n <= MAX;
  if (!whole(p.a) || !whole(p.b)) return false;
  switch (p.op) {
    case "+":
      return true;
    case "-":
      return p.a >= p.b;
    case "*":
      return oneDigitMultiplier(p) !== null || isTwoByTwo(p);
  }
}

/** The four rectangles of the area model for a 2-digit × 2-digit problem. */
export function areaParts(a: number, b: number) {
  const a1 = Math.floor(a / 10);
  const a0 = a % 10;
  const b1 = Math.floor(b / 10);
  const b0 = b % 10;
  return { a1, a0, b1, b0, TT: a1 * b1 * 100, TO: a1 * 10 * b0, OT: a0 * b1 * 10, OO: a0 * b0 };
}

export type BorrowRule = "correct" | "no-decrement" | "skip-zero" | "stop-at-zero";

/**
 * Column subtraction, top − bottom, with a (possibly broken) regrouping rule.
 * - no-decrement: adds 10 to the digit but never takes the ten from the next place.
 * - skip-zero: borrows past a 0 from the next non-zero digit and leaves the 0 as 0.
 * - stop-at-zero: if the next digit is 0, adds 10 without taking it from anywhere.
 * zeroMinusN: writes 0 − N = N instead of regrouping when the top digit is 0.
 */
export function columnSubtract(
  a: number,
  b: number,
  rule: BorrowRule = "correct",
  zeroMinusN = false,
): number | null {
  if (b > a) return null;
  const top = toDigits(a);
  const bottom = toDigits(b);
  const out: number[] = [];
  for (let i = 0; i < top.length; i++) {
    const t = top[i];
    const s = bottom[i] ?? 0;
    if (t >= s) {
      out.push(t - s);
      continue;
    }
    if (zeroMinusN && t === 0) {
      out.push(s);
      continue;
    }
    if (rule === "no-decrement") {
      out.push(t + 10 - s);
      continue;
    }
    let j = i + 1;
    while (j < top.length && top[j] === 0) j++;
    if (j >= top.length) return null;
    if (rule === "correct") {
      top[j] -= 1;
      for (let k = i + 1; k < j; k++) top[k] = 9;
    } else if (rule === "skip-zero") {
      top[j] -= 1; // the zeros in between stay 0
    } else if (j === i + 1) {
      top[j] -= 1; // stop-at-zero: only regroups from a non-zero neighbour
    }
    out.push(t + 10 - s);
  }
  return fromDigits(out);
}

export type CarryRule = "correct" | "no-carry" | "whole-sum";

/** Column addition. The last column is always written whole (a child writes 12, not 2). */
export function columnAdd(a: number, b: number, rule: CarryRule = "correct"): number {
  const x = toDigits(a);
  const y = toDigits(b);
  const n = Math.max(x.length, y.length);
  const columns: number[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const sum = (x[i] ?? 0) + (y[i] ?? 0) + (rule === "correct" ? carry : 0);
    if (rule === "whole-sum" || i === n - 1) {
      columns.push(sum);
      continue;
    }
    columns.push(sum % 10);
    carry = Math.floor(sum / 10);
  }
  return writeColumns(columns);
}

export type MultiplyRule = "correct" | "no-carry" | "carry-first" | "whole-products";

/** Multi-digit × one-digit, column by column. */
export function columnMultiply(top: number, m: number, rule: MultiplyRule = "correct"): number {
  const digits = toDigits(top);
  const columns: number[] = [];
  let carry = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits[i];
    const value =
      rule === "correct" ? d * m + carry : rule === "carry-first" ? (d + carry) * m : d * m;
    if (rule === "whole-products" || i === digits.length - 1) {
      columns.push(value);
      continue;
    }
    columns.push(value % 10);
    carry = Math.floor(value / 10);
  }
  return writeColumns(columns);
}
