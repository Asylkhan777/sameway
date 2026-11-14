import { digitAt, digitCount, oneDigitMultiplier, solve, supports, toDigits } from "./arithmetic";
import { BUGS } from "./bugs";
import type { Bug, Problem } from "./types";

export interface Slip {
  /** Place of the slipped step (0 = ones). */
  place: number;
  /** How far off that step was. */
  delta: number;
  /** For multiplication: the basic fact that slipped, e.g. 7 × 8 written as 54. */
  fact?: { x: number; y: number; wrote: number };
}

export type Diagnosis =
  | { kind: "unsupported" }
  | { kind: "correct"; correct: number }
  /** One or more broken rules reproduce the answer exactly. More than one family = ambiguous. */
  | { kind: "bug"; correct: number; matches: Bug[]; families: string[] }
  /** The method is right; one basic fact or column is off. */
  | { kind: "slip"; correct: number; slip: Slip }
  | { kind: "unknown"; correct: number };

/** The wrong answer each rule produces on p (only rules that change the answer). */
export function bugAnswers(p: Problem): { bug: Bug; answer: number }[] {
  if (!supports(p)) return [];
  const correct = solve(p);
  const out: { bug: Bug; answer: number }[] = [];
  for (const bug of BUGS) {
    if (bug.op !== p.op) continue;
    const answer = bug.run(p);
    if (answer !== null && Number.isFinite(answer) && answer !== correct) out.push({ bug, answer });
  }
  return out;
}

export function diagnose(p: Problem, answer: number): Diagnosis {
  if (!supports(p) || !Number.isInteger(answer) || answer < 0) return { kind: "unsupported" };
  const correct = solve(p);
  if (answer === correct) return { kind: "correct", correct };
  const matches = bugAnswers(p)
    .filter((x) => x.answer === answer)
    .map((x) => x.bug);
  if (matches.length > 0) {
    return { kind: "bug", correct, matches, families: [...new Set(matches.map((b) => b.family))] };
  }
  const slip = findSlip(p, answer);
  if (slip) return { kind: "slip", correct, slip };
  return { kind: "unknown", correct };
}

/** The basic steps of the correct method, each with its place value. */
function steps(p: Problem): { x: number; y: number; weight: number; place: number }[] {
  if (p.op === "*") {
    const one = oneDigitMultiplier(p);
    if (one) return toDigits(one[0]).map((d, i) => ({ x: d, y: one[1], weight: 10 ** i, place: i }));
    const out: { x: number; y: number; weight: number; place: number }[] = [];
    toDigits(p.a).forEach((x, i) =>
      toDigits(p.b).forEach((y, j) => out.push({ x, y, weight: 10 ** (i + j), place: i + j })),
    );
    return out;
  }
  const n = Math.max(digitCount(p.a), digitCount(p.b));
  return Array.from({ length: n }, (_, i) => ({
    x: digitAt(p.a, i),
    y: digitAt(p.b, i),
    weight: 10 ** i,
    place: i,
  }));
}

/**
 * A slip: the method is right, but one step is off by a little.
 * For + and −: one column off by 1 or 2. For ×: one fact off by 1, 2,
 * or by one factor (7 × 8 written as 7 × 7 = 49).
 */
export function findSlip(p: Problem, answer: number): Slip | null {
  const diff = answer - solve(p);
  if (diff === 0) return null;
  for (const s of steps(p)) {
    const sizes = p.op === "*" ? [1, 2, s.x, s.y] : [1, 2];
    for (const size of sizes) {
      for (const delta of [size, -size]) {
        if (delta === 0 || delta * s.weight !== diff) continue;
        if (p.op !== "*") return { place: s.place, delta };
        const wrote = s.x * s.y + delta;
        if (wrote >= 0) return { place: s.place, delta, fact: { x: s.x, y: s.y, wrote } };
      }
    }
  }
  return null;
}

// ── Whole worksheet ──────────────────────────────────────────────────────────

export interface SheetItem {
  problem: Problem;
  answer: number;
}

export interface Evidence {
  family: string;
  /** The variant that matched (drives the explanation and the picture). */
  bug: Bug;
  /** Wrong answers this rule reproduces exactly. */
  explained: number;
  /** Problems where this rule would have changed the answer. */
  applicable: number;
  /** ...of those, the child wrote something else. */
  contradicted: number;
}

export type Verdict =
  | { kind: "all-correct" }
  /** The same broken rule explains 2+ answers and fits better than it fails. */
  | { kind: "pattern"; evidence: Evidence }
  /** 2+ rules explain the sheet equally well; one check problem (findProbe) decides. */
  | { kind: "tie"; candidates: Evidence[] }
  /** One answer fits a rule; confirm with a check problem before calling it. */
  | { kind: "maybe"; evidence: Evidence }
  /** Wrong answers are slips or don't match a known rule. */
  | { kind: "no-pattern" };

export interface SheetReport {
  items: { item: SheetItem; diagnosis: Diagnosis }[];
  wrong: number;
  evidence: Evidence[];
  verdict: Verdict;
}

/** Diagnose a whole worksheet: which single broken rule best explains the child's answers? */
export function diagnoseSheet(items: SheetItem[]): SheetReport {
  const results = items.map((item) => ({ item, diagnosis: diagnose(item.problem, item.answer) }));
  const wrong = results.filter(
    (r) => r.diagnosis.kind !== "correct" && r.diagnosis.kind !== "unsupported",
  ).length;

  const byFamily = new Map<string, Evidence>();
  for (const { item } of results) {
    const perFamily = new Map<string, { bug: Bug; hit: boolean }>();
    for (const { bug, answer } of bugAnswers(item.problem)) {
      const hit = answer === item.answer;
      const prev = perFamily.get(bug.family);
      if (!prev || (hit && !prev.hit)) perFamily.set(bug.family, { bug, hit });
    }
    for (const [family, { bug, hit }] of perFamily) {
      const e = byFamily.get(family) ?? { family, bug, explained: 0, applicable: 0, contradicted: 0 };
      e.applicable++;
      if (hit) {
        e.explained++;
        e.bug = bug;
      } else {
        e.contradicted++;
      }
      byFamily.set(family, e);
    }
  }

  const evidence = [...byFamily.values()]
    .filter((e) => e.explained > 0)
    .sort(
      (x, y) =>
        y.explained - y.contradicted - (x.explained - x.contradicted) || y.explained - x.explained,
    );
  const best = evidence[0];
  let verdict: Verdict;
  if (wrong === 0) verdict = { kind: "all-correct" };
  else if (!best) verdict = { kind: "no-pattern" };
  else if (best.explained >= 2 && best.explained > best.contradicted) {
    const tied = evidence.filter(
      (e) => e.explained === best.explained && e.contradicted === best.contradicted,
    );
    verdict = tied.length > 1 ? { kind: "tie", candidates: tied } : { kind: "pattern", evidence: best };
  } else verdict = { kind: "maybe", evidence: best };
  return { items: results, wrong, evidence, verdict };
}

// ── Check problems ───────────────────────────────────────────────────────────

/** Small deterministic PRNG so the same homework always gets the same check problems. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedOf = (p: Problem) => (p.a * 73856093) ^ (p.b * 19349663) ^ p.op.charCodeAt(0);

function randomWithDigits(rand: () => number, n: number): number {
  const lo = n === 1 ? 2 : 10 ** (n - 1);
  const hi = 10 ** n - 1;
  return lo + Math.floor(rand() * (hi - lo + 1));
}

/** Random problems with the same shape (digit counts and operation) as `like`. */
function* sameShape(like: Problem, salt: number): Generator<Problem> {
  const rand = rng(seedOf(like) ^ salt);
  const na = digitCount(like.a);
  const nb = digitCount(like.b);
  for (let t = 0; t < 20000; t++) {
    const p: Problem = { op: like.op, a: randomWithDigits(rand, na), b: randomWithDigits(rand, nb) };
    if (supports(p) && !(p.a === like.a && p.b === like.b)) yield p;
  }
}

/**
 * Lower is friendlier: small factors for multiplication, and no stray zeros unless the
 * child's own problem had zeros (then zeros are the point).
 */
function difficulty(p: Problem, like: Problem): number {
  const digits = [...toDigits(p.a), ...toDigits(p.b)];
  const likeHasZero = [...toDigits(like.a), ...toDigits(like.b)].includes(0);
  const strayZero = !likeHasZero && digits.includes(0) ? 10 : 0;
  const bigFactors = p.op === "*" ? Math.max(...digits) : 0;
  return strayZero + bigFactors;
}

/** The friendliest of the first `pool` problems that pass `accept`, in a stable order. */
function friendliest<T>(like: Problem, salt: number, pool: number, accept: (p: Problem) => T | null): T[] {
  const found: { value: T; cost: number; order: number }[] = [];
  for (const p of sameShape(like, salt)) {
    const value = accept(p);
    if (value === null) continue;
    found.push({ value, cost: difficulty(p, like), order: found.length });
    if (found.length === pool) break;
  }
  return found.sort((x, y) => x.cost - y.cost || x.order - y.order).map((x) => x.value);
}

export interface Probe {
  problem: Problem;
  correct: number;
  /**
   * What a child following each candidate rule would write. Answers never overlap between families.
   * `applies: false` means that rule doesn't change this problem, so its follower answers correctly.
   */
  expected: { family: string; title: string; answers: number[]; applies: boolean }[];
}

/**
 * One problem that tells the candidate rules apart: each family predicts a different answer.
 * Used when a single wrong answer fits more than one rule. Prefers a problem where every
 * candidate rule goes wrong; otherwise accepts one where exactly one of them predicts the
 * correct answer (e.g. 50 − 18 = 48 → check 52 − 18: 46 means "flips digits", 34 means
 * "only zeros confuse them").
 */
export function findProbe(families: string[], like: Problem, salt = 1): Probe | null {
  const evaluate = (p: Problem): Probe | null => {
    const correct = solve(p);
    const answers = bugAnswers(p);
    const owner = new Map<number, string>();
    const expected: Probe["expected"] = [];
    for (const family of families) {
      const own = answers.filter((x) => x.bug.family === family);
      const title = own[0]?.bug.title ?? BUGS.find((b) => b.family === family)?.title ?? family;
      const predicted = own.length > 0 ? [...new Set(own.map((x) => x.answer))] : [correct];
      for (const answer of predicted) {
        const o = owner.get(answer);
        if (o !== undefined && o !== family) return null;
        owner.set(answer, family);
      }
      expected.push({ family, title, answers: predicted, applies: own.length > 0 });
    }
    return { problem: p, correct, expected };
  };
  const full = friendliest(like, salt, 40, (p) => {
    const probe = evaluate(p);
    return probe && probe.expected.every((e) => e.applies) ? probe : null;
  });
  if (full.length > 0) return full[0];
  return friendliest(like, salt, 40, evaluate)[0] ?? null;
}

/** n practice problems where this rule would go wrong — solving them right means it's fixed. */
export function checkSet(
  bug: Bug,
  like: Problem,
  n = 3,
  salt = 7,
): { problem: Problem; correct: number; buggy: number }[] {
  const candidates = friendliest(like, salt, 60, (p) => {
    const buggy = bug.run(p);
    const correct = solve(p);
    return buggy === null || buggy === correct ? null : { problem: p, correct, buggy };
  });
  const out: { problem: Problem; correct: number; buggy: number }[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = `${c.problem.a}${c.problem.op}${c.problem.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length === n) break;
  }
  return out;
}
