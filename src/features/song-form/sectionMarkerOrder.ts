import type { SectionMarker } from "../../types/song";

/**
 * Reading order for section markers as they appear on the chart: top to
 * bottom, then left to right for markers that land on roughly the same row.
 * Markers are stored in the order they were placed (see addSectionMarker),
 * which has nothing to do with where they actually sit on the page, so any
 * "song structure at a glance" display (the summary row, the edit modal's
 * list) needs to re-sort by position first.
 */
export function orderSectionMarkers(markers: SectionMarker[]): SectionMarker[] {
  return [...markers].sort((a, b) => a.y - b.y || a.x - b.x);
}
