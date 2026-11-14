import { place } from "./arithmetic";
import type { Diagnosis } from "./diagnose";
import type { Op, Problem, Visual } from "./types";

export const SYMBOL: Record<Op, string> = { "+": "+", "-": "−", "*": "×" };

export const show = (p: Problem): string => `${p.a} ${SYMBOL[p.op]} ${p.b}`;

export interface Message {
  tone: "good" | "fix" | "check" | "info";
  headline: string;
  body: string;
  /** What the parent can say to the child. */
  say?: string;
  visual?: Visual;
}

/** Parent-facing message for one diagnosed problem. Deterministic: no model writes this text. */
export function toMessage(p: Problem, d: Diagnosis): Message {
  switch (d.kind) {
    case "unsupported":
      return {
        tone: "info",
        headline: "Not covered yet",
        body: "SameWay checks grade 2–4 arithmetic: + and − up to 9,999, × by one digit, and 2-digit × 2-digit.",
      };
    case "correct":
      return { tone: "good", headline: "Correct", body: `${show(p)} = ${d.correct}. Nothing to fix here.` };
    case "bug": {
      const first = d.matches[0];
      if (d.families.length > 1) {
        const titles = [...new Set(d.matches.map((b) => b.title))];
        return {
          tone: "check",
          headline: "Two rules give this same answer",
          body: `${titles.join(", or ")}. One check problem will tell them apart.`,
          visual: first.visual(p),
        };
      }
      return { tone: "fix", headline: first.title, body: first.explain(p), say: first.say(p), visual: first.visual(p) };
    }
    case "slip": {
      const { slip } = d;
      if (slip.fact) {
        const { x, y, wrote } = slip.fact;
        return {
          tone: "fix",
          headline: "The method is right — one fact slipped",
          body: `${x} × ${y} is ${x * y}, not ${wrote}. Every other step checks out.`,
          say: `"Can you check ${x} × ${y} again?"`,
        };
      }
      return {
        tone: "fix",
        headline: "The method is right — one small slip",
        body: `Only the ${place(slip.place)} column is off, by ${Math.abs(slip.delta)}. The steps are fine; it's a counting slip.`,
        say: `"Can you re-check the ${place(slip.place)} column?"`,
      };
    }
    case "unknown":
      return {
        tone: "info",
        headline: "This one doesn't match a known pattern",
        body: `The answer should be ${d.correct}. Ask them to explain each step out loud — the first step that sounds off is the one to fix.`,
      };
  }
}
