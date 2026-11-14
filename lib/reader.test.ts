import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstToSucceed, readerConfigured, readerModels } from "./reader";

describe("readerModels", () => {
  it("lists the primary model, then the fallback", () => {
    expect(readerModels({ VISION_MODEL: "flash-a", VISION_MODEL_FALLBACK: "flash-b" })).toEqual(["flash-a", "flash-b"]);
  });

  it("ignores blanks and a fallback that repeats the primary", () => {
    expect(readerModels({ VISION_MODEL: " flash-a ", VISION_MODEL_FALLBACK: "" })).toEqual(["flash-a"]);
    expect(readerModels({ VISION_MODEL: "flash-a", VISION_MODEL_FALLBACK: "flash-a" })).toEqual(["flash-a"]);
    expect(readerModels({})).toEqual([]);
  });

  it("needs both a key and a model to count as configured", () => {
    expect(readerConfigured({ GOOGLE_GENERATIVE_AI_API_KEY: "k", VISION_MODEL: "flash-a" })).toBe(true);
    expect(readerConfigured({ VISION_MODEL: "flash-a" })).toBe(false);
    expect(readerConfigured({ GOOGLE_GENERATIVE_AI_API_KEY: "k" })).toBe(false);
  });
});

describe("firstToSucceed", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  /** An attempt that settles after `ms`; it records when it started and whether it was aborted. */
  const attempt = (ms: number, result: string | Error) => {
    const log = { startedAt: -1, aborted: false };
    const run = (signal: AbortSignal) => {
      log.startedAt = Date.now();
      signal.addEventListener("abort", () => (log.aborted = true));
      return new Promise<string>((resolve, reject) =>
        setTimeout(() => (result instanceof Error ? reject(result) : resolve(result)), ms),
      );
    };
    return { run, log };
  };

  it("returns the primary's answer and never starts the fallback when the primary is quick", async () => {
    const primary = attempt(1_000, "primary");
    const fallback = attempt(1_000, "fallback");
    const result = firstToSucceed([primary.run, fallback.run], { hedgeAfterMs: 6_000 });
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toBe("primary");
    expect(fallback.log.startedAt).toBe(-1);
  });

  it("moves to the fallback as soon as the primary fails (rate limit, server error)", async () => {
    const start = Date.now();
    const primary = attempt(200, new Error("429"));
    const fallback = attempt(1_000, "fallback");
    const failures: number[] = [];
    const result = firstToSucceed([primary.run, fallback.run], {
      hedgeAfterMs: 6_000,
      onFailure: (_error, index) => failures.push(index),
    });
    await vi.advanceTimersByTimeAsync(1_200);
    await expect(result).resolves.toBe("fallback");
    expect(fallback.log.startedAt - start).toBe(200);
    expect(failures).toEqual([0]);
  });

  it("starts the fallback alongside a slow primary and takes whichever answers first", async () => {
    const start = Date.now();
    const primary = attempt(30_000, "primary");
    const fallback = attempt(2_000, "fallback");
    const result = firstToSucceed([primary.run, fallback.run], { hedgeAfterMs: 6_000 });
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(result).resolves.toBe("fallback");
    expect(fallback.log.startedAt - start).toBe(6_000);
    expect(primary.log.aborted).toBe(true);
  });

  it("still takes a slow primary that beats the fallback", async () => {
    const primary = attempt(7_000, "primary");
    const fallback = attempt(20_000, "fallback");
    const result = firstToSucceed([primary.run, fallback.run], { hedgeAfterMs: 6_000 });
    await vi.advanceTimersByTimeAsync(7_000);
    await expect(result).resolves.toBe("primary");
    expect(fallback.log.aborted).toBe(true);
  });

  it("rejects with the last error once every attempt has failed", async () => {
    const primary = attempt(100, new Error("503"));
    const fallback = attempt(100, new Error("timeout"));
    const result = firstToSucceed([primary.run, fallback.run], { hedgeAfterMs: 6_000 });
    const rejection = expect(result).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(200);
    await rejection;
  });

  it("rejects when there is nothing to try", async () => {
    await expect(firstToSucceed([], { hedgeAfterMs: 6_000 })).rejects.toThrow();
  });
});
