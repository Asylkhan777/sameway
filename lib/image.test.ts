import { describe, expect, it } from "vitest";
import { MAX_SIDE, fitWithin } from "./image";

describe("fitWithin", () => {
  it("shrinks a phone photo so its longest side is the limit, keeping the shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_SIDE, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: MAX_SIDE });
  });

  it("never enlarges a small image", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_SIDE, 900)).toEqual({ width: MAX_SIDE, height: 900 });
  });

  it("keeps at least one pixel on a very long, thin image", () => {
    expect(fitWithin(20000, 4)).toEqual({ width: MAX_SIDE, height: 1 });
  });
});
