import { useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Everything SameWay remembers. It lives in this browser's localStorage and nowhere else:
 * there are no accounts and no server-side copy.
 */

const ProblemSchema = z.object({
  op: z.enum(["+", "-", "*"]),
  a: z.number().int().nonnegative(),
  b: z.number().int().nonnegative(),
});

const WorksheetSchema = z.object({
  id: z.string(),
  /** ISO time of the first check. */
  at: z.string(),
  source: z.enum(["photo", "typed", "sample"]),
  /** What was on the page: each problem and the child's answer. */
  items: z.array(z.object({ problem: ProblemSchema, answer: z.number().int().nonnegative() })),
  /** What the engine found. `family` and `bugId` name the rule when one was found. */
  verdict: z.object({
    kind: z.enum(["all-correct", "pattern", "tie", "maybe", "one-off", "no-pattern"]),
    family: z.string().optional(),
    bugId: z.string().optional(),
  }),
});

const PracticeSchema = z.object({
  /** ISO time the round started. */
  at: z.string(),
  /** One entry per practice problem: did the child get it right? */
  results: z.array(z.boolean()),
});

const RuleSchema = z.object({
  title: z.string(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  /** How many worksheets the rule showed up on. */
  seenOn: z.number().int().nonnegative(),
  status: z.enum(["found", "practicing", "fixed"]),
  /** It was fixed, then showed up on a later worksheet. */
  cameBack: z.boolean().optional(),
  practice: z.array(PracticeSchema),
});

const ProgressSchema = z.object({
  child: z.object({ name: z.string().optional() }),
  worksheets: z.array(WorksheetSchema),
  /** One entry per rule, keyed by the engine's rule family. */
  rules: z.record(z.string(), RuleSchema),
  /** Own (non-sample) worksheets checked so far. */
  ownWorksheetsUsed: z.number().int().nonnegative(),
  plus: z.object({ since: z.string(), sessionId: z.string() }).nullable(),
});

export type WorksheetRecord = z.infer<typeof WorksheetSchema>;
export type PracticeRecord = z.infer<typeof PracticeSchema>;
export type RuleRecord = z.infer<typeof RuleSchema>;
export type RuleStatus = RuleRecord["status"];
export type Progress = z.infer<typeof ProgressSchema>;

export const STORAGE_KEY = "sameway:v1";

export const EMPTY_PROGRESS: Progress = {
  child: {},
  worksheets: [],
  rules: {},
  ownWorksheetsUsed: 0,
  plus: null,
};

/** The current progress. It doubles as the fallback when localStorage is unavailable. */
let current: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = ProgressSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
  } catch {
    // No storage (private mode, blocked, or not in a browser): start empty and keep it in memory.
  }
  return EMPTY_PROGRESS;
}

export function loadProgress(): Progress {
  return (current ??= read());
}

/** Apply a change and save it. If saving fails, the change still holds until the tab closes. */
export function updateProgress(change: (progress: Progress) => Progress): Progress {
  current = change(loadProgress());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Kept in memory only.
  }
  for (const listener of listeners) listener();
  return current;
}

function subscribe(listener: () => void): () => void {
  // Another tab saved: read it again.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    current = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const notLoaded = () => null;

/**
 * The saved progress, or null on the server and on the first paint. Storage is only read
 * after hydration, so the server and the browser always render the same first frame.
 */
export function useProgress(): Progress | null {
  return useSyncExternalStore(subscribe, loadProgress, notLoaded);
}
