import { describe, expect, it } from "vitest";
import { setChildName } from "./progress";
import { EMPTY_PROGRESS, loadProgress, updateProgress } from "./storage";

// These tests run in Node, where there is no localStorage: the same situation as a browser
// that blocks storage.
describe("progress without localStorage", () => {
  it("starts empty instead of throwing", () => {
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("keeps changes in memory", () => {
    const updated = updateProgress((progress) => setChildName(progress, "Maya"));
    expect(updated.child.name).toBe("Maya");
    expect(loadProgress()).toBe(updated);
  });
});
