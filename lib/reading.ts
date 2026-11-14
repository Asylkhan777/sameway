import { z } from "zod";

/**
 * What the vision model returns for a worksheet photo: a transcription and nothing else.
 * It never solves or grades; the engine does that after the parent confirms the table.
 */
export const ReadResult = z.object({
  problems: z
    .array(
      z.object({
        op: z.enum(["+", "-", "*"]),
        a: z.number().int().nonnegative(),
        b: z.number().int().nonnegative(),
        /** The child's final answer; null if they left it blank. */
        answer: z.number().int().nonnegative().nullable(),
        /** "low" when any digit was hard to read. */
        confidence: z.enum(["high", "low"]),
      }),
    )
    .max(30),
  method: z.enum(["area-model", "partial-products", "standard-algorithm", "base-ten", "number-line", "unknown"]),
  notes: z.string().optional(),
});

export type Reading = z.infer<typeof ReadResult>;
export type ReadProblem = Reading["problems"][number];

/** Why `/api/read` could not return a reading. */
export type ReadErrorCode = "bad-image" | "not-configured" | "reader-failed";

/**
 * Largest photo the API accepts. The browser resizes to 1600 px first, which lands around
 * 0.3–0.6 MB, so this is a guard rail well under Vercel's 4.5 MB request limit.
 */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const JPEG_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;

export type ImageCheck = { ok: true; base64: string } | { ok: false; reason: string };

/** Validate the request's image: a base64 JPEG data URL of a sane size. */
export function checkImage(image: unknown): ImageCheck {
  if (typeof image !== "string") return { ok: false, reason: "Send { image } as a JPEG data URL." };
  // Checked on the encoded length first, so an oversized body is never decoded.
  if (image.length > (MAX_IMAGE_BYTES * 4) / 3 + 64) return { ok: false, reason: "The photo is too large." };
  const match = JPEG_DATA_URL.exec(image);
  if (!match) return { ok: false, reason: "The photo must be a base64 JPEG data URL." };
  const base64 = match[1];
  // Every JPEG starts with the bytes FF D8 FF, which is "/9j/" in base64.
  if (!base64.startsWith("/9j/")) return { ok: false, reason: "That doesn't look like a JPEG photo." };
  return { ok: true, base64 };
}
