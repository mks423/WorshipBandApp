import { splitGluedTokensOnLine } from "./splitGluedTokens";
import type { OcrToken } from "./types";

function token(text: string, x: number, width: number, height = 20, y = 0): OcrToken {
  return { text, x, y, width, height };
}

describe("splitGluedTokensOnLine", () => {
  it("expands a glued chord pair into two tokens with proportional bounding boxes", () => {
    const line = { y: 10, tokens: [token("Am7G/B", 0, 60)] };

    const result = splitGluedTokensOnLine(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["Am7", "G/B"]);
    // "Am7" is 3 chars, "G/B" is 3 chars, of 6 total -> even split of width 60.
    expect(result.tokens[0]).toMatchObject({ x: 0, width: 30, height: 20 });
    expect(result.tokens[1]).toMatchObject({ x: 30, width: 30, height: 20 });
  });

  it("leaves already-separate tokens untouched", () => {
    const line = { y: 10, tokens: [token("Am7", 0, 20), token("G/B", 30, 20)] };

    const result = splitGluedTokensOnLine(line);

    expect(result.tokens).toEqual(line.tokens);
  });

  it("leaves lyric tokens untouched", () => {
    const line = { y: 10, tokens: [token("Amazing", 0, 80), token("grace", 90, 40)] };

    const result = splitGluedTokensOnLine(line);

    expect(result.tokens).toEqual(line.tokens);
  });

  it("expands a four-way over-merge into four positioned tokens (real case: '그 패턴' intro)", () => {
    const line = { y: 10, tokens: [token("C#m7AEF#m7", 100, 100)] };

    const result = splitGluedTokensOnLine(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["C#m7", "A", "E", "F#m7"]);
    // 10 chars total across width 100 -> 10px per char, laid out left to right
    // from the original merged box's x instead of all four sharing one spot.
    expect(result.tokens.map((t) => t.x)).toEqual([100, 140, 150, 160]);
  });
});
