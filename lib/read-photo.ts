import type { Reading } from "@/lib/reading";

/**
 * Ask the server to read a prepared photo (a JPEG data URL from lib/image.ts).
 * Rejects if the reader can't be reached or can't read it; the caller then offers typing.
 */
export async function readPhoto(image: string, signal: AbortSignal): Promise<Reading> {
  const response = await fetch("/api/read", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image }),
    signal,
  });
  if (!response.ok) throw new Error(`The photo reader answered ${response.status}.`);
  const reading = (await response.json()) as Reading;
  if (!Array.isArray(reading.problems)) throw new Error("The photo reader sent an unexpected answer.");
  return reading;
}
