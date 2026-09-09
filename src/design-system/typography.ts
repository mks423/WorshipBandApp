import { colors } from "./colors";

/**
 * Typography tokens extracted from the "Worship App" mockup.
 *
 * `fontFamily.brand` names the mockup's intended typeface (Pretendard, a
 * Korean-optimized family) but no font file is loaded by this app yet —
 * loading it is a separate step (an `expo-font` load in App.tsx plus the
 * font asset itself). Until then it falls back to the platform's default
 * system font, exactly like the rest of the app already does.
 */
export const fontFamily = {
  brand: "Pretendard",
  /** Chord symbols are set in a monospace face in the mockup, so stacked chord letters/extensions line up. */
  mono: "ui-monospace, monospace",
} as const;

/** Type scale (px), smallest to largest, named the way the mockup's sizes cluster. */
export const fontSize = {
  caption2: 8.5,
  caption: 10,
  footnote: 11,
  subhead: 12,
  callout: 13,
  body: 14,
  bodyLarge: 15,
  title4: 16,
  title3: 17,
  title2: 18,
  title1: 19,
  largeTitle: 20,
  display: 22,
} as const;

/** RN's `fontWeight` wants these as strings. Named by the mockup's actual weights — nothing lighter than 500 appears in it. */
export const fontWeight = {
  regular: "500",
  medium: "600",
  bold: "700",
  heavy: "800",
} as const;

export const letterSpacing = {
  /** Used on the mockup's small uppercase section-eyebrow labels. */
  eyebrow: 0.8,
} as const;

/**
 * Ready-to-spread text style presets for the combinations that repeat
 * throughout the mockup (`font: 700 15px 'Pretendard'` etc.), so a screen
 * doesn't have to re-assemble family/size/weight/color by hand each time.
 * Spread one into a StyleSheet entry and override what's screen-specific
 * (e.g. `{ ...textStyles.cardTitle, marginBottom: 4 }`).
 */
export const textStyles = {
  pageTitle: { fontFamily: fontFamily.brand, fontSize: fontSize.display, fontWeight: fontWeight.heavy, color: colors.textPrimary },
  screenTitle: { fontFamily: fontFamily.brand, fontSize: fontSize.title3, fontWeight: fontWeight.bold, color: colors.textPrimary },
  cardTitle: { fontFamily: fontFamily.brand, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.bold, color: colors.textPrimary },
  body: { fontFamily: fontFamily.brand, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.regular, color: colors.textPrimary, lineHeight: fontSize.bodyLarge * 1.5 },
  meta: { fontFamily: fontFamily.brand, fontSize: fontSize.subhead, fontWeight: fontWeight.regular, color: colors.textTertiary },
  metaSmall: { fontFamily: fontFamily.brand, fontSize: fontSize.footnote, fontWeight: fontWeight.regular, color: colors.textTertiary },
  hint: { fontFamily: fontFamily.brand, fontSize: fontSize.footnote, fontWeight: fontWeight.medium, color: colors.textFaint },
  buttonLabel: { fontFamily: fontFamily.brand, fontSize: fontSize.callout, fontWeight: fontWeight.bold, color: colors.surface },
  chip: { fontFamily: fontFamily.brand, fontSize: fontSize.footnote, fontWeight: fontWeight.bold },
  badge: { fontFamily: fontFamily.brand, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
  eyebrow: {
    fontFamily: fontFamily.brand,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.heavy,
    letterSpacing: letterSpacing.eyebrow,
    textTransform: "uppercase" as const,
    color: colors.textFaint,
  },
  chordText: { fontFamily: fontFamily.mono, fontSize: fontSize.callout, fontWeight: fontWeight.heavy, color: colors.chordText },
  chordTextLive: { fontFamily: fontFamily.mono, fontSize: fontSize.largeTitle, fontWeight: fontWeight.heavy, color: colors.live.accent },
  lyricText: { fontFamily: fontFamily.brand, fontSize: fontSize.bodyLarge, fontWeight: fontWeight.regular, color: colors.textPrimary, lineHeight: fontSize.bodyLarge * 1.5 },
  lyricTextLive: { fontFamily: fontFamily.brand, fontSize: fontSize.title1, fontWeight: fontWeight.medium, color: colors.live.text, lineHeight: fontSize.title1 * 1.5 },
} as const;
