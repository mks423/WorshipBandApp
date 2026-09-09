import { repairMisreadTokensOnLine } from "./repairMisreadTokens";
import type { OcrToken } from "./types";

function token(text: string, x: number, width = text.length * 8): OcrToken {
  return { text, x, y: 0, width, height: 20 };
}

describe("repairMisreadTokensOnLine", () => {
  it("repairs a misread chord token's text, leaving its bounding box untouched", () => {
    const line = { y: 10, tokens: [token("8m7", 0)] };

    const result = repairMisreadTokensOnLine(line);

    expect(result.tokens).toEqual([{ ...line.tokens[0], text: "Bm7" }]);
  });

  it("leaves lyric tokens on the same line untouched", () => {
    const line = { y: 10, tokens: [token("8m7", 0), token("saved", 30)] };

    const result = repairMisreadTokensOnLine(line);

    expect(result.tokens.map((t) => t.text)).toEqual(["Bm7", "saved"]);
  });
});
