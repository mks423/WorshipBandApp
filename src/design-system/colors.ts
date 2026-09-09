/**
 * Color palette extracted from the "Worship App" design mockup
 * (Worship App.dc.html). Not yet wired into any existing screen — this is
 * just the token layer, extracted so it can be adopted incrementally.
 *
 * Two color contexts appear in the mockup: a light, warm "paper" surface
 * used for browsing/editing (list, chart detail, sharing), and a dark
 * "stage" surface used for the live-performance view. They're kept as
 * separate token groups (`colors` and `colors.live`) rather than merged
 * into one light/dark pair, since the app doesn't switch between them as a
 * theme — a screen is either the paper UI or the stage UI by design.
 */

export const colors = {
  /** Warm off-white app background. */
  background: "#F5F4EF",
  /** Card/panel/header surface on the light background. */
  surface: "#FFFFFF",

  textPrimary: "#1B1C18",
  textSecondary: "rgba(27,28,24,0.55)",
  textTertiary: "rgba(27,28,24,0.5)",
  textMuted: "rgba(27,28,24,0.45)",
  textFaint: "rgba(27,28,24,0.4)",
  textGhost: "rgba(27,28,24,0.35)",

  border: "rgba(27,28,24,0.1)",
  borderSubtle: "rgba(27,28,24,0.08)",
  borderStrong: "rgba(27,28,24,0.15)",
  /** Fill for a segmented-control track or an inactive chip. */
  fillMuted: "rgba(27,28,24,0.06)",

  /** Primary brand accent — active nav item, primary buttons, active chip. */
  accent: "#8BB13A",
  /** Accent-colored text on a light or tinted background. */
  accentText: "#5E7A24",
  /** Darker accent text for higher-contrast small text on a tint fill. */
  accentTextStrong: "#3F5019",
  accentTint: "rgba(139,177,58,0.1)",
  accentTintStrong: "rgba(139,177,58,0.16)",
  accentTintStrongest: "rgba(139,177,58,0.22)",
  accentBorder: "rgba(139,177,58,0.35)",

  /** Chord-symbol text color on the light "paper" chart view. */
  chordText: "#5E7A24",

  shadowColor: "#1B1C18",

  /** Dark "stage" surface used by the live-performance view. */
  live: {
    background: "#14150F",
    surface: "#1F2116",

    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.85)",
    textTertiary: "rgba(255,255,255,0.7)",
    textMuted: "rgba(255,255,255,0.45)",
    textFaint: "rgba(255,255,255,0.4)",
    textGhost: "rgba(255,255,255,0.25)",

    border: "rgba(255,255,255,0.12)",
    borderSubtle: "rgba(255,255,255,0.08)",
    fillMuted: "rgba(255,255,255,0.1)",

    /** Bright accent for chords and active state on the dark stage surface. */
    accent: "#A9D14D",
    accentBorder: "rgba(169,209,77,0.35)",
    accentTint: "rgba(169,209,77,0.12)",
    accentTintStrong: "rgba(169,209,77,0.22)",

    shadowColor: "#000000",
  },
} as const;
