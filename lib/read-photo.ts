import type { Reading } from "@/lib/reading";

/**
 * Ask the server to read a prepared photo (a JPEG data URL from lib/image.ts).
 * Rejects if the reader can't be reached or can't read it, or after `timeoutMs` if one is
 * given; the caller then offers typing (or, for a sample, its saved transcription).
 */
export async function readPhoto(image: string, signal: AbortSignal, timeoutMs?: number): Promise<Reading> {
  const request = new AbortController();
  const cancel = () => request.abort();
  signal.addEventListener("abort", cancel);
  const timer = timeoutMs === undefined ? undefined : setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch("/api/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image }),
      signal: request.signal,
    });
    if (!response.ok) throw new Error(`The photo reader answered ${response.status}.`);
    const reading = (await response.json()) as Reading;
    if (!Array.isArray(reading.problems)) throw new Error("The photo reader sent an unexpected answer.");
    return reading;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
