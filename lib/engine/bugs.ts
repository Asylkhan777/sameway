import {
  areaParts,
  columnAdd,
  columnMultiply,
  columnSubtract,
  digitAt,
  expand,
  fromDigits,
  isTwoByTwo,
  oneDigitMultiplier,
  place,
  qty,
  toDigits,
  unit,
  writeColumns,
} from "./arithmetic";
import type { Bug, Problem, Visual } from "./types";

// The library of broken rules ("buggy algorithms"), after Brown & Burton (1978) and VanLehn (1990).
// Every rule is a pure function from a problem to the exact wrong answer it produces, so a match
// is a deterministic diagnosis, not a guess.

const isSub = (p: Problem) => p.op === "-" && p.a >= p.b;
const isAdd = (p: Problem) => p.op === "+";

/** Places where the top digit is smaller than the bottom digit. */
const smallTop = (p: Problem): number[] =>
  toDigits(p.a).flatMap((t, i) => (t < digitAt(p.b, i) ? [i] : []));

/** First 0 inside the top number (where regrouping has to cross a zero). */
const innerZero = (p: Problem): number => {
  const d = toDigits(p.a);
  const i = d.findIndex((x, k) => k > 0 && k < d.length - 1 && x === 0);
  return i < 0 ? 1 : i;
};

/** First place where the top digit is 0 and the bottom digit isn't. */
const zeroOnTop = (p: Problem): number => {
  const i = toDigits(p.a).findIndex((t, k) => t === 0 && digitAt(p.b, k) > 0);
  return i < 0 ? 0 : i;
};

/** Places (not the last) where the two digits add up to 10 or more. */
const sumsOverTen = (p: Problem): number[] => {
  const n = Math.max(toDigits(p.a).length, toDigits(p.b).length);
  const cols: number[] = [];
  for (let i = 0; i < n - 1; i++) if (digitAt(p.a, i) + digitAt(p.b, i) >= 10) cols.push(i);
  return cols;
};

/** Multi-digit × one-digit: [factor, multiplier, first place whose product needs a carry]. */
const carryPlace = (p: Problem): [number, number, number] => {
  const [top, m] = oneDigitMultiplier(p) ?? [0, 0];
  const d = toDigits(top);
  const i = d.findIndex((x, k) => k < d.length - 1 && x * m >= 10);
  return [top, m, i < 0 ? 0 : i];
};

/** Area model of p, highlighting cells given as [place in a, place in b]. */
function area(p: Problem, cells: [number, number][]): Visual {
  const rows = expand(p.a);
  const cols = expand(p.b);
  const highlight: [number, number][] = [];
  for (const [pa, pb] of cells) {
    const r = rows.findIndex((x) => x.place === pa);
    const c = cols.findIndex((x) => x.place === pb);
    if (r >= 0 && c >= 0) highlight.push([r, c]);
  }
  return { kind: "area", rows: rows.map((x) => x.value), cols: cols.map((x) => x.value), highlight };
}

/** Area-model cell of digit place i of the multi-digit factor in a × one-digit problem. */
const cellOf = (p: Problem, i: number): [number, number] => (p.a >= 10 ? [i, 0] : [0, i]);

export const BUGS: Bug[] = [
  // ── Subtraction ────────────────────────────────────────────────────────────
  {
    id: "sub-smaller-from-larger",
    family: "sub-smaller-from-larger",
    op: "-",
    title: "Subtracts the smaller digit from the bigger one",
    run: (p) =>
      isSub(p) ? fromDigits(toDigits(p.a).map((t, i) => Math.abs(t - digitAt(p.b, i)))) : null,
    explain: (p) => {
      const i = smallTop(p)[0] ?? 0;
      const t = digitAt(p.a, i);
      const s = digitAt(p.b, i);
      return `In the ${place(i)} column, ${t} − ${s} looked impossible, so they did ${s} − ${t} instead. The top number always goes first: trade 1 ${unit(i + 1)} for 10 ${place(i)}, then subtract.`;
    },
    say: (p) => {
      const i = smallTop(p)[0] ?? 0;
      return `"We have ${qty(digitAt(p.a, i), i)} and need to take away ${digitAt(p.b, i)}. Can we trade 1 ${unit(i + 1)} for 10 ${place(i)}?"`;
    },
    visual: (p) => ({ kind: "place-value", columns: smallTop(p) }),
  },
  {
    id: "sub-borrow-no-decrement",
    family: "sub-borrow-no-decrement",
    op: "-",
    title: "Regroups but never takes the ten away",
    run: (p) => (isSub(p) ? columnSubtract(p.a, p.b, "no-decrement") : null),
    explain: (p) => {
      const i = smallTop(p)[0] ?? 0;
      const t = digitAt(p.a, i);
      const next = digitAt(p.a, i + 1);
      const fix =
        next === 0
          ? `there were 0 ${place(i + 1)} to take from, so the next place had to be opened first`
          : `the ${next} in the ${place(i + 1)} column should have dropped to ${next - 1}`;
      return `They turned ${qty(t, i)} into ${t + 10} — that part is right — but ${fix}. Those 10 had to come from somewhere.`;
    },
    say: (p) => {
      const i = smallTop(p)[0] ?? 0;
      return `"You made ${digitAt(p.a, i) + 10} ${place(i)}. Which ${unit(i + 1)} did you trade? Let's cross it out."`;
    },
    visual: (p) => {
      const i = smallTop(p)[0] ?? 0;
      return { kind: "place-value", columns: [i, i + 1] };
    },
  },
  {
    id: "sub-borrow-skips-zero",
    family: "sub-across-zero",
    op: "-",
    title: "Borrows across a zero by skipping it",
    run: (p) => (isSub(p) ? columnSubtract(p.a, p.b, "skip-zero") : null),
    explain: (p) => {
      const z = innerZero(p);
      return `There were 0 ${place(z)} to trade, so they took straight from the ${place(z + 1)} and left the 0 as 0. Opening 1 ${unit(z + 1)} makes 10 ${place(z)}; one of them moves right, so the 0 becomes 9.`;
    },
    say: (p) => {
      const z = innerZero(p);
      return `"There are no ${place(z)} to trade here. What can we open first — and what does the 0 turn into?"`;
    },
    visual: (p) => {
      const z = innerZero(p);
      return { kind: "place-value", columns: [z - 1, z, z + 1] };
    },
  },
  {
    id: "sub-borrow-stops-at-zero",
    family: "sub-across-zero",
    op: "-",
    title: "Adds 10 without taking it from the zero next door",
    run: (p) => (isSub(p) ? columnSubtract(p.a, p.b, "stop-at-zero") : null),
    explain: (p) => {
      const z = innerZero(p);
      return `They gave the ${place(z - 1)} an extra 10 but took nothing from the 0 ${place(z)} next door, so that 10 came from nowhere. Open 1 ${unit(z + 1)} first: the 0 becomes 9.`;
    },
    say: (p) => {
      const z = innerZero(p);
      return `"Where did those 10 ${place(z - 1)} come from? There are 0 ${place(z)} next door."`;
    },
    visual: (p) => {
      const z = innerZero(p);
      return { kind: "place-value", columns: [z - 1, z, z + 1] };
    },
  },
  {
    id: "sub-zero-minus-n",
    family: "sub-zero-minus-n",
    op: "-",
    title: "Writes 0 − N as N",
    run: (p) => (isSub(p) ? columnSubtract(p.a, p.b, "correct", true) : null),
    explain: (p) => {
      const i = zeroOnTop(p);
      const s = digitAt(p.b, i);
      return `In the ${place(i)} column they wrote 0 − ${s} = ${s}. Taking ${s} away from 0 needs a trade first, like any small top digit.`;
    },
    say: (p) => {
      const i = zeroOnTop(p);
      const s = digitAt(p.b, i);
      return `"If we have 0 ${place(i)} and take away ${s}, do we really end up with ${s}? What can we trade?"`;
    },
    visual: (p) => ({ kind: "place-value", columns: [zeroOnTop(p)] }),
  },

  // ── Addition ───────────────────────────────────────────────────────────────
  {
    id: "add-no-carry",
    family: "add-no-carry",
    op: "+",
    title: "Forgets to carry the 1",
    run: (p) => (isAdd(p) ? columnAdd(p.a, p.b, "no-carry") : null),
    explain: (p) => {
      const i = sumsOverTen(p)[0] ?? 0;
      const s = digitAt(p.a, i) + digitAt(p.b, i);
      return `${digitAt(p.a, i)} + ${digitAt(p.b, i)} = ${qty(s, i)}, which is 1 ${unit(i + 1)} and ${qty(s - 10, i)}. They wrote the ${s - 10} but the 1 ${unit(i + 1)} never moved to the ${place(i + 1)} column.`;
    },
    say: (p) => {
      const i = sumsOverTen(p)[0] ?? 0;
      const s = digitAt(p.a, i) + digitAt(p.b, i);
      return `"${qty(s, i)} — can we bundle 10 of them? Where does the bundle go?"`;
    },
    visual: (p) => ({ kind: "place-value", columns: sumsOverTen(p) }),
  },
  {
    id: "add-whole-column-sum",
    family: "add-whole-column-sum",
    op: "+",
    title: "Writes a whole column sum like 15 in one column",
    run: (p) => (isAdd(p) ? columnAdd(p.a, p.b, "whole-sum") : null),
    explain: (p) => {
      const i = sumsOverTen(p)[0] ?? 0;
      const s = digitAt(p.a, i) + digitAt(p.b, i);
      return `They wrote all of ${s} under the ${place(i)}. Only the ${s - 10} stays there; the 1 ${unit(i + 1)} joins the ${place(i + 1)}.`;
    },
    say: (p) => {
      const i = sumsOverTen(p)[0] ?? 0;
      const s = digitAt(p.a, i) + digitAt(p.b, i);
      return `"Each column holds one digit. ${qty(s, i)} — how many ${place(i + 1)} is that, and what's left over?"`;
    },
    visual: (p) => ({ kind: "place-value", columns: sumsOverTen(p) }),
  },

  // ── Multi-digit × one digit ────────────────────────────────────────────────
  {
    id: "mul1-no-carry",
    family: "mul1-no-carry",
    op: "*",
    title: "Drops the carried tens when multiplying",
    run: (p) => {
      const f = oneDigitMultiplier(p);
      return f ? columnMultiply(f[0], f[1], "no-carry") : null;
    },
    explain: (p) => {
      const [top, m, i] = carryPlace(p);
      const d = digitAt(top, i);
      const v = d * m;
      return `${d} × ${m} = ${v}: they wrote the ${v % 10} but dropped the ${qty(Math.floor(v / 10), i + 1)}. Those get added after multiplying the next digit.`;
    },
    say: (p) => {
      const [top, m, i] = carryPlace(p);
      const v = digitAt(top, i) * m;
      return `"${digitAt(top, i)} × ${m} is ${v} — that's ${qty(Math.floor(v / 10), i + 1)} and ${qty(v % 10, i)}. Where do the ${place(i + 1)} go?"`;
    },
    visual: (p) => area(p, [cellOf(p, carryPlace(p)[2])]),
  },
  {
    id: "mul1-carry-first",
    family: "mul1-carry-first",
    op: "*",
    title: "Adds the carry before multiplying",
    run: (p) => {
      const f = oneDigitMultiplier(p);
      return f ? columnMultiply(f[0], f[1], "carry-first") : null;
    },
    explain: (p) => {
      const [top, m, i] = carryPlace(p);
      const c = Math.floor((digitAt(top, i) * m) / 10);
      const d = digitAt(top, i + 1);
      return `In the ${place(i + 1)} they did (${d} + ${c}) × ${m} = ${(d + c) * m}. The carried ${c} gets added after multiplying: ${d} × ${m} + ${c} = ${d * m + c}.`;
    },
    say: (p) => {
      const [top, m, i] = carryPlace(p);
      const c = Math.floor((digitAt(top, i) * m) / 10);
      return `"Multiply first, then add what you carried. What's ${digitAt(top, i + 1)} × ${m}? Now add the ${c}."`;
    },
    visual: (p) => area(p, [cellOf(p, carryPlace(p)[2] + 1)]),
  },
  {
    id: "mul1-whole-products",
    family: "mul1-whole-products",
    op: "*",
    title: "Writes each product whole, with no carrying",
    run: (p) => {
      const f = oneDigitMultiplier(p);
      return f ? columnMultiply(f[0], f[1], "whole-products") : null;
    },
    explain: (p) => {
      const [top, m, i] = carryPlace(p);
      const d = digitAt(top, i);
      const v = d * m;
      return `They wrote ${d} × ${m} = ${v} whole and put the next product beside it. Each place holds one digit: the ${qty(Math.floor(v / 10), i + 1)} from ${v} join the next product.`;
    },
    say: (p) => {
      const [top, m, i] = carryPlace(p);
      const v = digitAt(top, i) * m;
      return `"${v} is ${qty(Math.floor(v / 10), i + 1)} and ${qty(v % 10, i)}. Which part stays in this column?"`;
    },
    visual: (p) => area(p, [cellOf(p, carryPlace(p)[2])]),
  },

  // ── 2-digit × 2-digit (area model / partial products) ──────────────────────
  {
    id: "mul2-column-by-column",
    family: "mul2-column-by-column",
    op: "*",
    title: "Multiplies column by column, like addition",
    run: (p) => {
      if (!isTwoByTwo(p)) return null;
      const { a1, a0, b1, b0 } = areaParts(p.a, p.b);
      return writeColumns([a0 * b0, a1 * b1]);
    },
    explain: (p) => {
      const { a1, a0, b1, b0, TO, OT } = areaParts(p.a, p.b);
      return `They did ${a1} × ${b1} and ${a0} × ${b0} and stopped. ${p.a} × ${p.b} has four parts — the cross parts ${a1 * 10} × ${b0} = ${TO} and ${a0} × ${b1 * 10} = ${OT} are missing.`;
    },
    say: (p) => {
      const { a1, a0, b1, b0 } = areaParts(p.a, p.b);
      return `"Let's draw the box: ${a1 * 10} + ${a0} across the top, ${b1 * 10} + ${b0} down the side. How many rectangles do we need to fill?"`;
    },
    visual: (p) => area(p, [[1, 0], [0, 1]]),
  },
  {
    id: "mul2-missing-tens-x-ones",
    family: "mul2-missing-part",
    op: "*",
    title: "Leaves one rectangle of the area model empty",
    run: (p) => {
      if (!isTwoByTwo(p)) return null;
      const { TT, OT, OO } = areaParts(p.a, p.b);
      return TT + OT + OO;
    },
    explain: (p) => {
      const { a1, b0, TT, TO, OT, OO } = areaParts(p.a, p.b);
      return `They found ${TT}, ${OT} and ${OO} but missed ${a1 * 10} × ${b0} = ${TO}.`;
    },
    say: () => `"Count the rectangles in your box. Is one of them still empty?"`,
    visual: (p) => area(p, [[1, 0]]),
  },
  {
    id: "mul2-missing-ones-x-tens",
    family: "mul2-missing-part",
    op: "*",
    title: "Leaves one rectangle of the area model empty",
    run: (p) => {
      if (!isTwoByTwo(p)) return null;
      const { TT, TO, OO } = areaParts(p.a, p.b);
      return TT + TO + OO;
    },
    explain: (p) => {
      const { a0, b1, TT, TO, OT, OO } = areaParts(p.a, p.b);
      return `They found ${TT}, ${TO} and ${OO} but missed ${a0} × ${b1 * 10} = ${OT}.`;
    },
    say: () => `"Count the rectangles in your box. Is one of them still empty?"`,
    visual: (p) => area(p, [[0, 1]]),
  },
  {
    id: "mul2-no-placeholder-zero",
    family: "mul2-no-placeholder-zero",
    op: "*",
    title: "Forgets the zero on the second row",
    run: (p) => (isTwoByTwo(p) ? p.a * (p.b % 10) + p.a * Math.floor(p.b / 10) : null),
    explain: (p) => {
      const b1 = Math.floor(p.b / 10);
      return `The ${b1} in ${p.b} means ${qty(b1, 1)}, so the second row is ${p.a} × ${b1 * 10} = ${p.a * b1 * 10}. They wrote ${p.a * b1} — the row lost its zero.`;
    },
    say: (p) => {
      const b1 = Math.floor(p.b / 10);
      return `"In ${p.b}, what is the ${b1} really worth? So what are we multiplying ${p.a} by on this row?"`;
    },
    visual: (p) => area(p, [[1, 1], [0, 1]]),
  },
  {
    id: "mul2-tens-times-tens",
    family: "mul2-tens-times-tens",
    op: "*",
    title: "Gives tens × tens only one zero",
    run: (p) => {
      if (!isTwoByTwo(p)) return null;
      const { TT, TO, OT, OO } = areaParts(p.a, p.b);
      return TT / 10 + TO + OT + OO;
    },
    explain: (p) => {
      const { a1, b1, TT } = areaParts(p.a, p.b);
      return `${a1 * 10} × ${b1 * 10} = ${TT}: tens times tens makes hundreds. They wrote ${TT / 10}.`;
    },
    say: (p) => {
      const { a1, b1 } = areaParts(p.a, p.b);
      return `"${a1} × ${b1} = ${a1 * b1}. So ${a1} tens × ${b1} tens — is that ${a1 * b1} tens or ${a1 * b1} hundreds? Let's count the zeros."`;
    },
    visual: (p) => area(p, [[1, 1]]),
  },
];

export const bugById = (id: string): Bug | undefined => BUGS.find((b) => b.id === id);
