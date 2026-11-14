/**
 * Can SameWay really tell WHY a child got it wrong?  Run:  npx tsx scripts/simulate.ts
 *
 * 1. One answer: over every problem in each grade-2–4 domain, how often does a rule's wrong answer
 *    point to that rule alone (no other rule writes the same number)?
 * 2. Ambiguous answers: when two rules collide, can one check problem always tell them apart?
 * 3. One worksheet: simulated kids who follow a known rule — sometimes inconsistently, with random
 *    slips on top — does the 6-problem worksheet verdict name the right rule? Like real homework,
 *    each worksheet drills the skill the rule breaks (regrouping, carrying, subtracting across
 *    zeros...). And how often does it falsely "find" a rule in a kid who only makes random slips?
 */
import { BUGS, bugAnswers, diagnoseSheet, findProbe, findSlip, rng, solve } from "../lib/engine";
import type { Bug, Op, Problem, SheetItem } from "../lib/engine";

const P = (op: Op, a: number, b: number): Problem => ({ op, a, b });
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const pct = (x: number, n: number) => (n === 0 ? "   —" : `${((100 * x) / n).toFixed(1).padStart(5)}%`);

const DOMAINS: { name: string; op: Op; problems: Problem[] }[] = [
  { name: "2-digit − 2-digit", op: "-", problems: range(11, 99).flatMap((a) => range(10, a).map((b) => P("-", a, b))) },
  { name: "3-digit − 3-digit", op: "-", problems: range(101, 999).flatMap((a) => range(100, a).map((b) => P("-", a, b))) },
  { name: "2-digit + 2-digit", op: "+", problems: range(10, 99).flatMap((a) => range(10, 99).map((b) => P("+", a, b))) },
  { name: "3-digit + 3-digit", op: "+", problems: range(100, 999).flatMap((a) => range(100, 999).map((b) => P("+", a, b))) },
  { name: "2–3-digit × 1-digit", op: "*", problems: range(10, 999).flatMap((a) => range(2, 9).map((b) => P("*", a, b))) },
  { name: "2-digit × 2-digit", op: "*", problems: range(10, 99).flatMap((a) => range(10, 99).map((b) => P("*", a, b))) },
];

const SHEET_SIZE = 6;
const KIDS = 400;
const NOISE = [
  { label: "clean", slip: 0, consistency: 1 },
  { label: "noisy", slip: 0.1, consistency: 0.8 }, // 10% random slips, rule followed 80% of the time
];

function kidAnswers(bug: Bug | null, sheet: Problem[], rand: () => number, slip: number, consistency: number): SheetItem[] {
  return sheet.map((problem) => {
    const correct = solve(problem);
    let answer = correct;
    if (bug) {
      const wrong = bug.run(problem);
      if (wrong !== null && wrong !== correct && rand() < consistency) answer = wrong;
    }
    if (rand() < slip) {
      const k = Math.floor(rand() * String(answer).length);
      const v = answer + (rand() < 0.5 ? -1 : 1) * 10 ** k;
      if (v >= 0) answer = v;
    }
    return { problem, answer };
  });
}

const totals = { rules: 0, uniqueRate: 0, ambiguous: 0, probed: 0, probeOk: 0 };
const t0 = performance.now();

for (const dom of DOMAINS) {
  // ── 1 & 2: single answers ───────────────────────────────────────────────────
  const stats = new Map<string, { applies: number; unique: number; slipLike: number }>();
  const ambiguous: { p: Problem; families: string[] }[] = [];
  const topic: Problem[] = []; // problems that need regrouping or carrying
  const skill = new Map<string, Problem[]>(); // per family: problems that exercise the skill it breaks
  for (const p of dom.problems) {
    const answers = bugAnswers(p);
    if (answers.length === 0) continue;
    topic.push(p);
    const familiesByAnswer = new Map<number, Set<string>>();
    for (const { bug, answer } of answers) {
      const set = familiesByAnswer.get(answer) ?? new Set<string>();
      set.add(bug.family);
      familiesByAnswer.set(answer, set);
    }
    for (const family of new Set(answers.map((x) => x.bug.family))) {
      const pool = skill.get(family) ?? [];
      pool.push(p);
      skill.set(family, pool);
    }
    for (const { bug, answer } of answers) {
      const s = stats.get(bug.id) ?? { applies: 0, unique: 0, slipLike: 0 };
      s.applies++;
      if (familiesByAnswer.get(answer)?.size === 1) s.unique++;
      if (findSlip(p, answer)) s.slipLike++;
      stats.set(bug.id, s);
    }
    for (const families of familiesByAnswer.values()) {
      if (families.size > 1) ambiguous.push({ p, families: [...families] });
    }
  }

  const step = Math.max(1, Math.floor(ambiguous.length / 150));
  let probed = 0;
  let probeOk = 0;
  for (let i = 0; i < ambiguous.length; i += step) {
    probed++;
    if (findProbe(ambiguous[i].families, ambiguous[i].p)) probeOk++;
  }

  // ── 3: worksheets ───────────────────────────────────────────────────────────
  const bugs = BUGS.filter((b) => b.op === dom.op && (stats.get(b.id)?.applies ?? 0) > 0);
  const rand = rng(2026);
  const pickSheet = (pool: Problem[]) =>
    Array.from({ length: SHEET_SIZE }, () => pool[Math.floor(rand() * pool.length)]);
  const sheetRows: string[] = [];
  for (const bug of bugs) {
    const pool = skill.get(bug.family) ?? topic;
    const cells: string[] = [];
    for (const n of NOISE) {
      let named = 0;
      let check = 0;
      let wrongRule = 0;
      for (let k = 0; k < KIDS; k++) {
        const v = diagnoseSheet(kidAnswers(bug, pickSheet(pool), rand, n.slip, n.consistency)).verdict;
        if (v.kind === "pattern") v.evidence.family === bug.family ? named++ : wrongRule++;
        if (v.kind === "maybe" && v.evidence.family === bug.family) check++;
        if (v.kind === "tie") v.candidates.some((e) => e.family === bug.family) ? check++ : wrongRule++;
      }
      cells.push(`${n.label}: named ${pct(named, KIDS)} +check ${pct(check, KIDS)} wrong ${pct(wrongRule, KIDS)}`);
    }
    sheetRows.push(`    ${bug.id.padEnd(26)} ${cells.join("  |  ")}`);
  }
  let falseAlarms = 0;
  for (let k = 0; k < KIDS * 2; k++) {
    const v = diagnoseSheet(kidAnswers(null, pickSheet(topic), rand, 0.15, 1)).verdict;
    if (v.kind === "pattern") falseAlarms++;
  }

  // ── report ─────────────────────────────────────────────────────────────────
  console.log(`\n${dom.name}  (${dom.problems.length.toLocaleString()} problems, ${topic.length.toLocaleString()} need regrouping)`);
  console.log(`  one answer → one rule:`);
  for (const bug of bugs) {
    const s = stats.get(bug.id) ?? { applies: 0, unique: 0, slipLike: 0 };
    totals.rules++;
    totals.uniqueRate += s.unique / s.applies;
    console.log(
      `    ${bug.id.padEnd(28)} changes the answer on ${pct(s.applies, dom.problems.length)} · unique ${pct(s.unique, s.applies)} · also looks like a slip ${pct(s.slipLike, s.applies)}`,
    );
  }
  totals.ambiguous += ambiguous.length;
  totals.probed += probed;
  totals.probeOk += probeOk;
  console.log(`  collisions: ${ambiguous.length.toLocaleString()} answers fit 2+ rules · one check problem separates them in ${probeOk}/${probed} sampled cases`);
  console.log(`  6-problem worksheet, ${KIDS} simulated kids per rule:`);
  for (const row of sheetRows) console.log(row);
  console.log(`    kid with no broken rule, 15% random slips → falsely called a pattern ${pct(falseAlarms, KIDS * 2)}`);
}

console.log(
  `\nOverall: on average a rule's wrong answer points to that rule alone in ${pct(totals.uniqueRate, totals.rules)} of problems ` +
    `(${totals.rules} rule × domain pairs); one check problem separated ${totals.probeOk}/${totals.probed} sampled collisions. ` +
    `${((performance.now() - t0) / 1000).toFixed(1)}s`,
);
