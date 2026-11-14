# SameWay diagnosis engine (`lib/engine`)

The vision model only **reads** the worksheet: the numbers and the child's answers. Everything after that is deterministic TypeScript with tests.

```
photo → vision model → {op, a, b, answer}[] → parent confirms → engine → verdict + picture + words + check problems
```

## How it works

- **Rules are functions.** Each common broken rule is a pure function that returns the exact wrong answer it produces: `run(problem) → number`. Examples: "subtracts the smaller digit from the bigger one", "forgets the zero on the second row". There are 14 rules in `bugs.ts`, after Brown & Burton (1978) and VanLehn (1990). A wrong answer that equals a rule's output is a diagnosis, not a guess.
- **Not every mistake is a rule.** If no rule matches, `findSlip` looks for one wrong fact (7 × 8 = 54) or one column off by 1–2. If that fails too, the answer is `unknown` and the app says so.
- **One answer can fit two rules.** `findProbe` finds one check problem on which the candidate rules predict different answers.
- **The worksheet is the real unit.** `diagnoseSheet` scores every rule over the whole sheet. It counts the answers a rule explains and the problems where it should have shown up but didn't. The verdict is one of `pattern`, `tie` (settled by one check problem), `maybe`, `no-pattern` or `all-correct`.
- **Fixed means it passes the check.** `checkSet` builds 3 problems of the same shape on which the rule would go wrong.
- **No model writes the output.** The rule itself supplies the parent-facing text (`message.ts`) and the picture to draw (`Visual`: area-model cells or place-value columns).

## Does it work?

Run `npx tsx scripts/simulate.ts` (about 10 s). It checks every problem in grades 2–4 exhaustively: 1.24M problems covering 2–3-digit ±, 2–3-digit × 1-digit, and 2-digit × 2-digit.

- **One wrong answer → exactly one rule:** 86% of cases on average. For 12 of the 14 rules the rate is 71–100%. "0 − N = N" usually gives the same answer as "smaller from larger".
- **Two rules, same answer:** one check problem told them apart in 477 of 477 sampled cases.
- **6-problem worksheet, simulated kids who follow a rule:**
  - Rule followed every time: named correctly in 88–100% of cases.
  - On 2-digit sheets "0 − N = N" and "smaller from larger" always agree. The verdict is then a tie, and a check problem decides.
  - With 10% random slips, and the rule followed only 80% of the time: named in 53–81% of cases. The rest go to a check problem. A wrong rule was named at most 1.8% of the time.
- **Kids with no broken rule and 15% random slips:** falsely called a pattern 0% of the time.

These kids are simulated. Real-world accuracy still has to be measured on real worksheets.

## Run

```bash
npm i -D vitest          # required: engine.test.ts imports it, and `next build` type-checks it
npx vitest run lib/engine
npx tsx scripts/simulate.ts
```

## Add a rule

1. Add an object to `BUGS` in `bugs.ts` with `run`, `explain`, `say` and `visual`.
2. Add a row to `TABLE` in `engine.test.ts`.
