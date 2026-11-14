import { google } from "@ai-sdk/google";
import { APICallError, Output, generateText } from "ai";
import type { Reading } from "@/lib/reading";
import { ReadResult } from "@/lib/reading";

/**
 * The photo reader: the only place SameWay calls a model. It transcribes the worksheet and
 * stops there. Server-only: it needs GOOGLE_GENERATIVE_AI_API_KEY.
 */

const INSTRUCTIONS = `You read photos of US elementary math worksheets (grades 2–4). Extract every arithmetic problem and the child's handwritten FINAL answer.

Do NOT solve, check or correct anything — copy exactly what the child wrote, even if it is wrong.

- Problems may be horizontal (52 − 18 = __) or vertical (stacked). In a vertical problem the top number is "a" and the number under it is "b".
- Multiplication may appear as ×, x or ·. Report it as "*".
- If the child crossed something out, use the final answer.
- If the answer is blank, use null.
- If any digit is unclear, give your best reading and confidence "low".
- Ignore scratch work, carry/borrow marks and partial products — read only the final answer.
- List the problems in reading order. Skip anything that is not addition, subtraction or multiplication of two whole numbers.
- Report the method the worksheet asks for (printed instructions like "Use an area model") or the drawings you see; otherwise "unknown".`;

/** Time allowed per model. With the head start below, both attempts fit the route's 60 s limit. */
const ATTEMPT_TIMEOUT_MS = 40_000;
/** How long the primary model may stay silent before the fallback is started alongside it. */
const HEDGE_AFTER_MS = 6_000;

/**
 * The models to try, in order: VISION_MODEL, then VISION_MODEL_FALLBACK. Free-tier quotas
 * and load are per model, so the fallback still answers when the primary is rate-limited or busy.
 */
export function readerModels(env: Record<string, string | undefined> = process.env): string[] {
  const ids = [env.VISION_MODEL, env.VISION_MODEL_FALLBACK].map((id) => id?.trim()).filter((id) => !!id);
  return [...new Set(ids)] as string[];
}

export const readerConfigured = (env: Record<string, string | undefined> = process.env): boolean =>
  !!env.GOOGLE_GENERATIVE_AI_API_KEY && readerModels(env).length > 0;

type Attempt<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Resolve with the first attempt that succeeds. The next attempt starts as soon as the
 * previous one fails (rate limit, server error, timeout, unusable output), or after
 * `hedgeAfterMs` if it is still running, so one slow model can't hold up the answer.
 * The winner aborts the rest. Rejects with the last error when every attempt has failed.
 */
export function firstToSucceed<T>(
  attempts: Attempt<T>[],
  options: { hedgeAfterMs: number; onFailure?: (error: unknown, index: number) => void },
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (attempts.length === 0) return reject(new Error("No attempts were given."));
    const losers = new AbortController();
    let started = 0;
    let failed = 0;
    let done = false;
    let hedge: ReturnType<typeof setTimeout> | undefined;

    const startNext = () => {
      clearTimeout(hedge);
      if (done || started === attempts.length) return;
      const index = started++;
      if (started < attempts.length) hedge = setTimeout(startNext, options.hedgeAfterMs);
      attempts[index](losers.signal).then(
        (value) => {
          if (done) return;
          done = true;
          clearTimeout(hedge);
          losers.abort();
          resolve(value);
        },
        (error) => {
          if (done) return;
          options.onFailure?.(error, index);
          if (++failed === attempts.length) {
            done = true;
            reject(error);
          } else {
            startNext();
          }
        },
      );
    };
    startNext();
  });
}

async function readWith(modelId: string, base64Jpeg: string, abortSignal: AbortSignal): Promise<Reading> {
  const { output } = await generateText({
    model: google(modelId),
    instructions: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this worksheet." },
          { type: "file", mediaType: "image/jpeg", data: base64Jpeg },
        ],
      },
    ],
    output: Output.object({ schema: ReadResult }),
    // Reading digits needs no deliberation; keeping "thinking" off keeps it fast.
    reasoning: "none",
    temperature: 0,
    // No silent retries on the same model: a rate-limited model goes straight to the fallback.
    maxRetries: 0,
    timeout: ATTEMPT_TIMEOUT_MS,
    abortSignal,
  });
  return output;
}

/** What went wrong, without the request: provider errors carry the photo in their body. */
function describe(error: unknown): string {
  if (APICallError.isInstance(error)) return `API error ${error.statusCode ?? "(no status)"}`;
  return error instanceof Error ? error.name : "unknown error";
}

/** Transcribe a worksheet photo. Throws if every configured model fails. */
export function readWorksheet(base64Jpeg: string): Promise<Reading> {
  const models = readerModels();
  return firstToSucceed(
    models.map((modelId) => (signal: AbortSignal) => readWith(modelId, base64Jpeg, signal)),
    {
      hedgeAfterMs: HEDGE_AFTER_MS,
      onFailure: (error, index) => console.warn(`[read] ${models[index]} failed: ${describe(error)}`),
    },
  );
}
