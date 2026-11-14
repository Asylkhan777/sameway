import { describe, expect, it } from "vitest";
import {
  BUGS,
  addTrace,
  bugById,
  checkSet,
  columnAdd,
  columnMultiply,
  columnSubtract,
  diagnose,
  diagnoseSheet,
  findProbe,
  rng,
  solve,
  subtractTrace,
  toMessage,
} from "./index";
import type { Op, Problem } from "./index";

const P = (op: Op, a: number, b: number): Problem => ({ op, a, b });

describe("correct column algorithms match real arithmetic", () => {
  it("subtraction, every pair up to 999", () => {
    let bad = 0;
    for (let a = 0; a <= 999; a++) for (let b = 0; b <= a; b++) if (columnSubtract(a, b) !== a - b) bad++;
    expect(bad).toBe(0);
  });
  it("addition, every pair up to 999", () => {
    let bad = 0;
    for (let a = 0; a <= 999; a++) for (let b = 0; b <= 999; b++) if (columnAdd(a, b) !== a + b) bad++;
    expect(bad).toBe(0);
  });
  it("multi-digit × one digit", () => {
    let bad = 0;
    for (let a = 10; a <= 9999; a++) for (let m = 2; m <= 9; m++) if (columnMultiply(a, m) !== a * m) bad++;
    expect(bad).toBe(0);
  });
});

const TABLE: [Problem, number, string][] = [
  [P("-", 52, 18), 46, "sub-smaller-from-larger"],
  [P("-", 52, 18), 44, "sub-borrow-no-decrement"],
  [P("-", 304, 187), 27, "sub-borrow-skips-zero"],
  [P("-", 304, 187), 127, "sub-borrow-stops-at-zero"],
  [P("+", 47, 38), 75, "add-no-carry"],
  [P("+", 47, 38), 715, "add-whole-column-sum"],
  [P("*", 27, 3), 61, "mul1-no-carry"],
  [P("*", 27, 3), 121, "mul1-carry-first"],
  [P("*", 27, 3), 621, "mul1-whole-products"],
  [P("*", 23, 45), 815, "mul2-column-by-column"],
  [P("*", 23, 45), 935, "mul2-missing-tens-x-ones"],
  [P("*", 23, 45), 915, "mul2-missing-ones-x-tens"],
  [P("*", 23, 45), 207, "mul2-no-placeholder-zero"],
  [P("*", 23, 45), 315, "mul2-tens-times-tens"],
];

describe("one wrong answer → the exact broken rule", () => {
  for (const [p, answer, id] of TABLE) {
    it(`${p.a} ${p.op} ${p.b} = ${answer} → ${id}`, () => {
      const d = diagnose(p, answer);
      expect(d.kind).toBe("bug");
      if (d.kind === "bug") expect(d.matches.map((b) => b.id)).toEqual([id]);
    });
  }

  it("every rule in the library is covered by a test", () => {
    const covered = new Set([...TABLE.map((t) => t[2]), "sub-zero-minus-n"]);
    expect(BUGS.filter((b) => !covered.has(b.id)).map((b) => b.id)).toEqual([]);
  });

  it("an answer that fits two rules gets one check problem that separates them", () => {
    const p = P("-", 300, 187);
    const d = diagnose(p, 287);
    expect(d.kind).toBe("bug");
    if (d.kind !== "bug") return;
    expect([...d.families].sort()).toEqual(["sub-smaller-from-larger", "sub-zero-minus-n"]);

    const probe = findProbe(d.families, p);
    expect(probe).not.toBeNull();
    if (!probe) return;
    for (const e of probe.expected) {
      for (const answer of e.answers) {
        const again = diagnose(probe.problem, answer);
        const fams = again.kind === "bug" ? again.families.filter((f) => d.families.includes(f)) : [];
        expect(fams).toEqual(e.applies ? [e.family] : []);
      }
    }
  });

  it("two rules that always agree on 2-digit zeros are split by a problem without a zero", () => {
    const p = P("-", 50, 18);
    const d = diagnose(p, 48);
    expect(d.kind === "bug" && d.families.length === 2).toBe(true);
    if (d.kind !== "bug") return;
    const probe = findProbe(d.families, p);
    expect(probe).not.toBeNull();
    if (!probe) return;
    const predictions = probe.expected.flatMap((e) => e.answers);
    expect(new Set(predictions).size).toBe(predictions.length);
    expect(predictions).toContain(probe.correct);
  });
});

describe("not every wrong answer is a broken rule", () => {
  it("correct is correct", () => {
    expect(diagnose(P("-", 52, 18), 34).kind).toBe("correct");
  });
  it("one wrong fact is a slip (7 × 8 written as 54)", () => {
    const d = diagnose(P("*", 27, 8), 214);
    expect(d.kind).toBe("slip");
    if (d.kind === "slip") expect(d.slip.fact).toEqual({ x: 7, y: 8, wrote: 54 });
  });
  it("a column off by one is a slip", () => {
    const d = diagnose(P("-", 52, 18), 33);
    expect(d.kind).toBe("slip");
  });
  it("an answer far from any rule is unknown — we don't guess", () => {
    expect(diagnose(P("-", 52, 18), 70).kind).toBe("unknown");
  });
  it("out-of-scope problems are refused", () => {
    expect(diagnose(P("*", 123, 45), 5535).kind).toBe("unsupported");
    expect(diagnose(P("-", 18, 52), 34).kind).toBe("unsupported");
  });
});

describe("whole worksheet", () => {
  const sheet = [P("-", 52, 18), P("-", 63, 27), P("-", 45, 21), P("-", 71, 46), P("-", 80, 35), P("-", 94, 58)];

  it("one rule applied consistently is called a pattern", () => {
    const sfl = bugById("sub-smaller-from-larger");
    expect(sfl).toBeTruthy();
    if (!sfl) return;
    const r = diagnoseSheet(sheet.map((p) => ({ problem: p, answer: sfl.run(p) ?? solve(p) })));
    expect(r.verdict.kind).toBe("pattern");
    if (r.verdict.kind === "pattern") expect(r.verdict.evidence.family).toBe("sub-smaller-from-larger");
  });

  it("rules that agree on every problem are a tie, settled by one check problem", () => {
    const sfl = bugById("sub-smaller-from-larger");
    if (!sfl) throw new Error("missing bug");
    const zeros = [P("-", 50, 18), P("-", 70, 25), P("-", 90, 46), P("-", 60, 37), P("-", 80, 29), P("-", 40, 13)];
    const r = diagnoseSheet(zeros.map((p) => ({ problem: p, answer: sfl.run(p) ?? solve(p) })));
    expect(r.verdict.kind).toBe("tie");
    if (r.verdict.kind !== "tie") return;
    const families = r.verdict.candidates.map((e) => e.family).sort();
    expect(families).toEqual(["sub-smaller-from-larger", "sub-zero-minus-n"]);
    expect(findProbe(families, zeros[0])).not.toBeNull();
  });

  it("two random slips are not called a pattern", () => {
    const answers = [33, 37, 24, 25, 45, 36];
    const r = diagnoseSheet(sheet.map((p, i) => ({ problem: p, answer: answers[i] })));
    expect(r.wrong).toBe(2);
    expect(r.verdict.kind).toBe("no-pattern");
  });
});

describe("the three sample worksheets", () => {
  const S = (rows: [Op, number, number, number][]) => rows.map(([op, a, b, answer]) => ({ problem: P(op, a, b), answer }));
  const samples: [string, ReturnType<typeof S>, string][] = [
    ["A · subtraction with regrouping", S([["-", 52, 18, 46], ["-", 63, 27, 44], ["-", 45, 21, 24], ["-", 71, 46, 35], ["-", 80, 35, 55], ["-", 94, 58, 44]]), "sub-smaller-from-larger"],
    ["B · two-digit multiplication", S([["*", 23, 45, 207], ["*", 31, 24, 186], ["*", 42, 13, 168], ["*", 12, 34, 84], ["*", 25, 31, 100]]), "mul2-no-placeholder-zero"],
    ["C · subtracting across zeros", S([["-", 403, 158, 255], ["-", 500, 237, 273], ["-", 702, 365, 347], ["-", 600, 148, 462], ["-", 305, 129, 186], ["-", 452, 131, 321]]), "sub-across-zero"],
  ];
  for (const [name, items, family] of samples) {
    it(`${name} → ${family}, explains every wrong answer`, () => {
      const r = diagnoseSheet(items);
      expect(r.verdict.kind).toBe("pattern");
      if (r.verdict.kind !== "pattern") return;
      expect(r.verdict.evidence.family).toBe(family);
      expect(r.verdict.evidence.explained).toBe(r.wrong);
    });
  }
});

describe("check problems", () => {
  it("trigger the rule and keep the shape of the homework", () => {
    const bug = bugById("mul2-no-placeholder-zero");
    if (!bug) throw new Error("missing bug");
    const set = checkSet(bug, P("*", 23, 45));
    expect(set.length).toBe(3);
    for (const c of set) {
      expect(c.problem.a >= 10 && c.problem.a <= 99 && c.problem.b >= 10 && c.problem.b <= 99).toBe(true);
      expect(c.buggy).not.toBe(c.correct);
    }
  });
});

describe("worked traces (what the place-value picture draws)", () => {
  it("subtraction: every pair up to 999 ends on the right answer, one digit per column", () => {
    for (let a = 0; a <= 999; a++) {
      for (let b = 0; b <= a; b++) {
        const trace = subtractTrace(a, b);
        if (!trace) throw new Error(`no trace for ${a} − ${b}`);
        let value = 0;
        trace.columns.forEach((column, i) => {
          const final = column.top[column.top.length - 1];
          if (column.result !== final - column.bottom || column.result < 0 || column.result > 9) {
            throw new Error(`bad column ${i} in ${a} − ${b}`);
          }
          value += column.result * 10 ** i;
        });
        if (value !== a - b) throw new Error(`${a} − ${b} traced to ${value}`);
      }
    }
  });

  it("subtraction: a plain trade crosses out one digit and adds 10 next door", () => {
    expect(subtractTrace(52, 18)).toEqual({
      columns: [
        { top: [2, 12], bottom: 8, result: 4 },
        { top: [5, 4], bottom: 1, result: 3 },
      ],
      trades: [1],
    });
  });

  it("subtraction: across a zero, the hundred is opened first and the 0 becomes 9", () => {
    const trace = subtractTrace(403, 158);
    expect(trace?.columns.map((c) => c.top)).toEqual([[3, 13], [0, 10, 9], [4, 3]]);
    expect(trace?.trades).toEqual([2, 1]);
  });

  it("subtraction: a digit can give a ten and then receive one", () => {
    expect(subtractTrace(432, 158)?.columns.map((c) => c.top)).toEqual([[2, 12], [3, 2, 12], [4, 3]]);
    expect(subtractTrace(45, 21)?.trades).toEqual([]);
    expect(subtractTrace(18, 52)).toBeNull();
  });

  it("addition: every pair up to 999 ends on the right answer", () => {
    for (let a = 0; a <= 999; a++) {
      for (let b = 0; b <= 999; b++) {
        const value = addTrace(a, b).reduce((sum, column, i) => sum + column.result * 10 ** i, 0);
        if (value !== a + b) throw new Error(`${a} + ${b} traced to ${value}`);
      }
    }
  });

  it("addition: the carried 1 lands on the next column", () => {
    expect(addTrace(47, 38)).toEqual([
      { top: 7, bottom: 8, carry: 0, result: 5 },
      { top: 4, bottom: 3, carry: 1, result: 8 },
    ]);
    expect(addTrace(85, 47).map((c) => c.carry)).toEqual([0, 1, 1]);
  });
});

describe("parent-facing text", () => {
  const random = (op: Op, rand: () => number): Problem => {
    const r = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
    if (op === "-") {
      const a = r(10, 9999);
      return P("-", a, r(0, a));
    }
    if (op === "+") return P("+", r(10, 9999), r(10, 9999));
    return rand() < 0.5 ? P("*", r(10, 99), r(10, 99)) : P("*", r(10, 9999), r(2, 9));
  };

  it("is concrete for every rule on hundreds of random problems", () => {
    const rand = rng(42);
    for (const bug of BUGS) {
      let tried = 0;
      for (let k = 0; k < 50000 && tried < 300; k++) {
        const p = random(bug.op, rand);
        const out = bug.run(p);
        if (out === null || out === solve(p)) continue;
        tried++;
        const text = bug.explain(p) + bug.say(p) + JSON.stringify(bug.visual(p));
        expect(text).not.toMatch(/undefined|NaN|null|-1 /);
      }
      expect(tried).toBeGreaterThan(0);
    }
  });

  it("every kind of diagnosis has a message", () => {
    const cases: [Problem, number][] = [
      [P("-", 52, 18), 34],
      [P("-", 52, 18), 46],
      [P("-", 300, 187), 287],
      [P("*", 27, 8), 214],
      [P("-", 52, 18), 70],
      [P("*", 123, 45), 1],
    ];
    for (const [p, answer] of cases) {
      const m = toMessage(p, diagnose(p, answer));
      expect(m.headline.length).toBeGreaterThan(0);
      expect(m.body).not.toMatch(/undefined|NaN/);
    }
  });
});
