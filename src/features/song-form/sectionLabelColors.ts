/**
 * A stable badge color per section-label *type*, so every Verse marker reads
 * the same color as every other Verse marker, but a visibly different color
 * from Chorus/Bridge/etc. — both on the chart overlay and in the song-form
 * summary row, so the two views read as the same information at a glance.
 */
const PRESET_COLORS: Record<string, string> = {
  intro: "#0ea5a4",
  verse: "#2f6feb",
  "pre-chorus": "#7c3aed",
  chorus: "#ea580c",
  bridge: "#db2777",
  interlude: "#65a30d",
  outro: "#64748b",
};

/** Custom/typed labels that don't match a preset still need a color, picked deterministically so the same label always gets the same color. */
const FALLBACK_PALETTE = [
  "#0ea5a4",
  "#2f6feb",
  "#7c3aed",
  "#ea580c",
  "#db2777",
  "#65a30d",
  "#64748b",
  "#ca8a04",
  "#0891b2",
  "#4d7c0f",
];

/** "Verse 1"/"Verse 2"/"Verse 3" all share one color, keyed on "verse" — only a trailing number is stripped, so unrelated custom labels aren't accidentally merged. */
function baseLabel(label: string): string {
  return label.trim().replace(/\s*\d+$/, "").toLowerCase();
}

export function getSectionLabelColor(label: string): string {
  const key = baseLabel(label);
  const preset = PRESET_COLORS[key];
  if (preset) return preset;

  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}
