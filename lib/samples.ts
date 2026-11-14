import type { Entry } from "@/lib/parse";

export interface Sample {
  id: "a" | "b" | "c";
  grade: string;
  title: string;
  /** The printed instruction at the top of the sheet. */
  instruction: string;
  /**
   * A photo of the handwritten sheet under /public, once there is one. Until then the sheet
   * is drawn in the browser (lib/sample-image.ts). Either way the image goes through the
   * same photo reader as a parent's own photo.
   */
  photo?: string;
  /** What is written on the sheet: each problem and the child's answer. */
  entries: Entry[];
}

const sheet = (op: Entry["op"], rows: [a: number, b: number, answer: number][]): Entry[] =>
  rows.map(([a, b, answer]) => ({ op, a, b, answer }));

/**
 * The sample worksheets. They hold only what a child wrote; the diagnosis is always
 * computed live by the engine (see lib/report.test.ts for what each one should surface).
 * `entries` is the saved transcription: it is what the drawn sample image shows, and it
 * stands in for the photo reader only when the reader can't be reached.
 */
export const SAMPLES: Sample[] = [
  {
    id: "a",
    grade: "Grade 2",
    title: "Subtraction with regrouping",
    instruction: "Subtract. Regroup if you need to.",
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
    instruction: "Multiply. Use an area model or partial products.",
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
    instruction: "Subtract. Watch out for the zeros.",
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
