import { classifyLines } from "./classifyLines";
import type { OcrToken } from "./types";

function token(text: string, x = 0): OcrToken {
  return { text, x, y: 0, width: 10, height: 20 };
}

describe("classifyLines", () => {
  it("recognizes Korean section labels seen on real charts (e.g. '섹션')", () => {
    const [line] = classifyLines([{ y: 0, tokens: [token("섹션")] }]);
    expect(line.type).toBe("section");
  });

  it("still recognizes English section labels", () => {
    const [line] = classifyLines([{ y: 0, tokens: [token("Verse"), token("1", 20)] }]);
    expect(line.type).toBe("section");
  });

  it("classifies a mostly-chord line as chord even with one exotic-syntax chord", () => {
    const [line] = classifyLines([
      { y: 0, tokens: [token("B"), token("C#m7", 20), token("A", 50), token("B(SUS4)", 70)] },
    ]);
    expect(line.type).toBe("chord");
  });
});
