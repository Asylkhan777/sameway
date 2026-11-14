import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, ReadResult, checkImage } from "./reading";

/** The first bytes of a JPEG (FF D8 FF E0), base64-encoded. */
const JPEG = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD";

describe("checkImage", () => {
  it("accepts a base64 JPEG data URL and returns the bare base64", () => {
    expect(checkImage(`data:image/jpeg;base64,${JPEG}`)).toEqual({ ok: true, base64: JPEG });
  });

  it("rejects anything that isn't a string", () => {
    for (const bad of [undefined, null, 42, {}, [JPEG]]) expect(checkImage(bad).ok).toBe(false);
  });

  it("rejects other formats, remote URLs and malformed base64", () => {
    expect(checkImage(`data:image/png;base64,${JPEG}`).ok).toBe(false);
    expect(checkImage("https://example.com/sheet.jpg").ok).toBe(false);
    expect(checkImage("data:image/jpeg;base64,").ok).toBe(false);
    expect(checkImage(`data:image/jpeg;base64,${JPEG} <script>`).ok).toBe(false);
  });

  it("rejects a data URL that claims JPEG but holds something else", () => {
    // "iVBOR…" is how a PNG starts.
    expect(checkImage("data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAA").ok).toBe(false);
  });

  it("rejects photos over the size limit", () => {
    const huge = JPEG + "A".repeat(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100);
    expect(checkImage(`data:image/jpeg;base64,${huge}`)).toEqual({ ok: false, reason: "The photo is too large." });
  });
});

describe("ReadResult", () => {
  const problem = { op: "-", a: 52, b: 18, answer: 46, confidence: "high" };

  it("accepts a transcription, including a blank answer", () => {
    const reading = { problems: [problem, { ...problem, answer: null, confidence: "low" }], method: "unknown" };
    expect(ReadResult.safeParse(reading).success).toBe(true);
  });

  it("rejects operations and numbers a worksheet can't contain", () => {
    const parse = (patch: object) => ReadResult.safeParse({ problems: [{ ...problem, ...patch }], method: "unknown" });
    expect(parse({ op: "/" }).success).toBe(false);
    expect(parse({ a: -5 }).success).toBe(false);
    expect(parse({ answer: 4.6 }).success).toBe(false);
  });
});
