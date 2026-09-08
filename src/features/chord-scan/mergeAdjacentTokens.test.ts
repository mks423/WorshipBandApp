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
});
