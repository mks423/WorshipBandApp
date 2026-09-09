import { mergeAdjacentTokens } from "./mergeAdjacentTokens";
import type { OcrToken } from "./types";

function token(text: string, x: number, width: number, height = 20, y = 0): OcrToken {
  return { text, x, y, width, height };
}

describe("mergeAdjacentTokens", () => {
  it("glues a split accidental back onto its note letter", () => {
    // "F#m7" split by OCR into "F", "#", "m7", nearly touching (gap ~1px on a 20px-tall token)
    const line = {
      y: 10,
      tokens: [token("F", 0, 10), token("#", 10, 6), token("m7", 17, 15)],
    };

    const result = mergeAdjacentTokens(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["F#m7"]);
  });

  it("leaves separate words with normal spacing untouched", () => {
    const line = {
      y: 10,
      tokens: [token("Amazing", 0, 100), token("grace", 130, 60)],
    };

    const result = mergeAdjacentTokens(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["Amazing", "grace"]);
  });

  it("computes a bounding box that unions the merged tokens", () => {
    const line = {
      y: 10,
      tokens: [token("F", 0, 10, 20, 5), token("#", 10, 6, 22, 3)],
    };

    const result = mergeAdjacentTokens(line);

    expect(result.tokens[0]).toMatchObject({ text: "F#", x: 0, y: 3, width: 16, height: 22 });
  });

  it("is a no-op on a single-token or empty line", () => {
    const single = { y: 0, tokens: [token("G", 0, 10)] };
    expect(mergeAdjacentTokens(single).tokens).toHaveLength(1);

    const empty = { y: 0, tokens: [] };
    expect(mergeAdjacentTokens(empty).tokens).toHaveLength(0);
  });

  it("glues a parenthesized suffix despite wider real-world gaps around the parens", () => {
    // Exact bounding boxes Google Vision returned for "B(SUS4)" printed with
    // zero visual space — the parenthesis glyphs' own side-bearing produces
    // gaps (6px, 4px, 6px on ~21px-tall tokens) past the default merge
    // threshold, even though nothing prints between these characters.
    const line = {
      y: 60,
      tokens: [
        token("B", 40, 16, 21, 54),
        token("(", 62, 8, 21, 54),
        token("SUS4", 74, 63, 21, 54),
        token(")", 143, 9, 21, 54),
      ],
    };

    const result = mergeAdjacentTokens(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["B(SUS4)"]);
  });

  it("glues an accidental with a wider real-world gap than the original tuning assumed", () => {
    // Exact bounding boxes Google Vision returned for "C#m7" on a different
    // chart/font than the one the original 0.15 threshold was tuned against:
    // "C"-"#" gap is 4px on a 20px-tall token (0.2x height).
    const line = {
      y: 60,
      tokens: [token("C", 224, 16, 20, 53), token("#", 244, 13, 20, 53), token("m7", 257, 33, 20, 53)],
    };

    const result = mergeAdjacentTokens(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["C#m7"]);
  });

  it("does not bridge a real word gap just because the previous token ends in ')'", () => {
    const line = {
      y: 60,
      tokens: [token("B(SUS4)", 40, 113, 21, 54), token("DM7", 426, 49, 21, 55)],
    };

    const result = mergeAdjacentTokens(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["B(SUS4)", "DM7"]);
  });
});
