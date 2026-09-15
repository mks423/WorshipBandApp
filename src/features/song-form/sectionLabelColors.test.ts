import { getSectionLabelColor } from "./sectionLabelColors";

describe("getSectionLabelColor", () => {
  it("gives verse and chorus different colors", () => {
    expect(getSectionLabelColor("Verse 1")).not.toBe(getSectionLabelColor("Chorus"));
  });

  it("groups numbered verses under the same color", () => {
    const v1 = getSectionLabelColor("Verse 1");
    const v2 = getSectionLabelColor("Verse 2");
    const v3 = getSectionLabelColor("Verse 3");
    expect(v1).toBe(v2);
    expect(v2).toBe(v3);
  });

  it("is case-insensitive for presets", () => {
    expect(getSectionLabelColor("chorus")).toBe(getSectionLabelColor("Chorus"));
  });

  it("gives Pre-Chorus a different color than Chorus", () => {
    expect(getSectionLabelColor("Pre-Chorus")).not.toBe(getSectionLabelColor("Chorus"));
  });

  it("is stable for the same custom label", () => {
    expect(getSectionLabelColor("후렴 2")).toBe(getSectionLabelColor("후렴 2"));
  });

  it("gives different custom labels a decent chance of differing colors", () => {
    expect(getSectionLabelColor("후렴")).not.toBe(getSectionLabelColor("간주"));
  });
});
