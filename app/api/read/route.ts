import { readWorksheet, readerConfigured } from "@/lib/reader";
import type { ReadErrorCode } from "@/lib/reading";
import { checkImage } from "@/lib/reading";

/** Covers the primary model plus a fallback started alongside it (see lib/reader.ts). */
export const maxDuration = 60;

const fail = (status: number, error: ReadErrorCode, message: string) =>
  Response.json({ error, message }, { status });

/**
 * POST { image: JPEG data URL } → the problems and answers written on the worksheet.
 * The photo is forwarded to the vision model and then dropped: it is never stored or logged.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad-image", "Send JSON: { image }.");
  }

  const image = checkImage((body as { image?: unknown } | null)?.image);
  if (!image.ok) return fail(400, "bad-image", image.reason);

  if (!readerConfigured()) {
    return fail(503, "not-configured", "The photo reader isn't set up on this server.");
  }

  try {
    return Response.json(await readWorksheet(image.base64));
  } catch {
    // Each failed attempt is already logged by the reader, without the photo.
    return fail(502, "reader-failed", "The photo reader couldn't read this worksheet.");
  }
}
