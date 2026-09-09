/**
 * Spacing scale (px) extracted from the "Worship App" mockup.
 *
 * `spacing` is the main layout scale — the padding/gap values used between
 * screen sections, cards, and list items, sitting on roughly a 4px grid.
 * `spacingFine` covers the tighter, odd-numbered gaps the mockup uses
 * *inside* a compact control (a stepper's icon-to-value gap, a segmented
 * control's inner padding) — kept separate so the main scale stays a clean
 * progression.
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  xxxxl: 32,
  section: 36,
} as const;

export const spacingFine = {
  xxs: 2,
  xs: 3,
  sm: 6,
  md: 9,
  lg: 10,
  xl: 14,
  xxl: 18,
} as const;
