import { describe, expect, it } from "vitest";
import { formatEntry, parseLine, parseWorksheet } from "./parse";

describe("parseLine", () => {
  it("reads the three formats from the input hint", () => {
    expect(parseLine("52-18=46")).toEqual({ op: "-", a: 52, b: 18, answer: 46 });
    expect(parseLine("23x45=815")).toEqual({ op: "*", a: 23, b: 45, answer: 815 });
    expect(parseLine("23 × 45 = 815")).toEqual({ op: "*", a: 23, b: 45, answer: 815 });
  });

  it("accepts every common operator symbol", () => {
    for (const symbol of ["-", "−", "–", "—"]) {
      expect(parseLine(`52 ${symbol} 18 = 46`)?.op).toBe("-");
    }
    for (const symbol of ["*", "×", "x", "X", "·", "✕", "х"]) {
      expect(parseLine(`23 ${symbol} 45 = 207`)?.op).toBe("*");
    }
    expect(parseLine("47+38=75")).toEqual({ op: "+", a: 47, b: 38, answer: 75 });
  });

  it("treats a missing answer as blank", () => {
    const blank = { op: "-", a: 52, b: 18, answer: null };
    expect(parseLine("52-18=")).toEqual(blank);
    expect(parseLine("52-18")).toEqual(blank);
    expect(parseLine("52 - 18 = __")).toEqual(blank);
    expect(parseLine("52 - 18 = ?")).toEqual(blank);
  });

  it("ignores worksheet numbering and thousands separators", () => {
    expect(parseLine("3) 52-18=46")).toEqual({ op: "-", a: 52, b: 18, answer: 46 });
    expect(parseLine("12. 23 x 45 = 1,035")).toEqual({ op: "*", a: 23, b: 45, answer: 1035 });
    expect(parseLine("b) 4,000 - 1,250 = 2,750")).toEqual({ op: "-", a: 4000, b: 1250, answer: 2750 });
  });

  it("keeps a zero answer apart from a blank one", () => {
    expect(parseLine("18-18=0")?.answer).toBe(0);
  });

  it("rejects anything that is not one whole-number problem", () => {
    for (const text of ["", "hello", "52-18=4a", "52 18 46", "5.2-1.8=3.4", "-5+3=2", "52-18=46=3", "8/2=4"]) {
      expect(parseLine(text)).toBeNull();
    }
    expect(parseLine(`1+1=${"9".repeat(20)}`)).toBeNull();
  });
});

describe("parseWorksheet", () => {
  it("reads one problem per line and skips empty lines", () => {
    const lines = parseWorksheet("52-18=46\n\n  63-27=44  \r\n45-21=24\n");
    expect(lines.map((l) => l.ok)).toEqual([true, true, true]);
    expect(lines.map((l) => l.text)).toEqual(["52-18=46", "63-27=44", "45-21=24"]);
  });

  it("also splits on semicolons and on commas followed by a space", () => {
    const lines = parseWorksheet("52-18=46; 63-27=44, 23x45=1,035");
    expect(lines.map((l) => (l.ok ? l.entry.answer : null))).toEqual([46, 44, 1035]);
  });

  it("reports lines it cannot read instead of dropping them", () => {
    const lines = parseWorksheet("52-18=46\nfifty two\n80-35=55");
    expect(lines.map((l) => l.ok)).toEqual([true, false, true]);
    expect(lines[1].text).toBe("fifty two");
  });
});

describe("formatEntry", () => {
  it("round-trips through parseLine", () => {
    for (const text of ["52-18=46", "23x45=207", "47+38=", "403 − 158 = 255"]) {
      const entry = parseLine(text);
      expect(entry).not.toBeNull();
      if (entry) expect(parseLine(formatEntry(entry))).toEqual(entry);
    }
  });

  it("uses the printed symbols", () => {
    expect(formatEntry({ op: "*", a: 23, b: 45, answer: 207 })).toBe("23 × 45 = 207");
    expect(formatEntry({ op: "-", a: 52, b: 18, answer: null })).toBe("52 − 18 =");
  });
});
