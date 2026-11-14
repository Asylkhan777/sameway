import type { Entry } from "@/lib/parse";

export interface Sample {
  id: "a" | "b" | "c";
  grade: string;
  title: string;
  /** What is written on the sheet: each problem and the child's answer. */
  entries: Entry[];
}

const sheet = (op: Entry["op"], rows: [a: number, b: number, answer: number][]): Entry[] =>
  rows.map(([a, b, answer]) => ({ op, a, b, answer }));

/**
 * The sample worksheets. They hold only what a child wrote; the diagnosis is always
 * computed live by the engine (see lib/samples.test.ts for what each one should surface).
 */
export const SAMPLES: Sample[] = [
  {
    id: "a",
    grade: "Grade 2",
    title: "Subtraction with regrouping",
    entries: sheet("-", [
      [52, 18, 46],
      [63, 27, 44],
      [45, 21, 24],
      [71, 46, 35],
      [80, 35, 55],
      [94, 58, 44],
    ]),
  },
  {
    id: "b",
    grade: "Grade 4",
    title: "Two-digit multiplication",
    entries: sheet("*", [
      [23, 45, 207],
      [31, 24, 186],
      [42, 13, 168],
      [12, 34, 84],
      [25, 31, 100],
    ]),
  },
  {
    id: "c",
    grade: "Grade 3",
    title: "Subtracting across zeros",
    entries: sheet("-", [
      [403, 158, 255],
      [500, 237, 273],
      [702, 365, 347],
      [600, 148, 462],
      [305, 129, 186],
      [452, 131, 321],
    ]),
  },
];

export const sampleById = (id: string): Sample | undefined => SAMPLES.find((s) => s.id === id);
