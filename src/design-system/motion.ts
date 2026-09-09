/**
 * Motion/animation timing extracted from the mockup's CSS transitions and
 * its `fadeIn` keyframe. These are timing values only — the mockup's actual
 * transitions (CSS `transition`, `@keyframes`) don't port directly to React
 * Native; reproduce the same feel with the `Animated` API (or
 * `react-native-reanimated`) using these durations.
 */
export const duration = {
  /** Hover/press feedback (card shadow, tab underline) — `.15s` in the mockup. */
  fast: 150,
  /** Progress-bar fill — `.16s` in the mockup. */
  base: 160,
} as const;

/**
 * The mockup's `fadeIn` keyframe: opacity 0 → 1 while translating up 4px.
 * Reproduce with `Animated.timing` on `opacity` and `translateY`, from
 * `fadeIn.from` to `fadeIn.to`, over `duration.base`.
 */
export const fadeIn = {
  from: { opacity: 0, translateY: 4 },
  to: { opacity: 1, translateY: 0 },
} as const;
