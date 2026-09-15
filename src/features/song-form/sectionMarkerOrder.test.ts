import { orderSectionMarkers } from "./sectionMarkerOrder";
import type { SectionMarker } from "../../types/song";

function marker(id: string, x: number, y: number): SectionMarker {
  return { id, label: id, x, y };
}

describe("orderSectionMarkers", () => {
  it("orders top to bottom regardless of placement order", () => {
    const markers = [marker("chorus", 100, 400), marker("intro", 50, 50), marker("verse", 80, 200)];
    expect(orderSectionMarkers(markers).map((m) => m.id)).toEqual(["intro", "verse", "chorus"]);
  });

  it("breaks ties on the same row left to right", () => {
    const markers = [marker("b", 300, 100), marker("a", 50, 100)];
    expect(orderSectionMarkers(markers).map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const markers = [marker("second", 0, 200), marker("first", 0, 100)];
    const original = [...markers];
    orderSectionMarkers(markers);
    expect(markers).toEqual(original);
  });
});
