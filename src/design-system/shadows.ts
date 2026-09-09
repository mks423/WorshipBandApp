import { colors } from "./colors";

/**
 * Shadow presets converted from the mockup's CSS `box-shadow` values to
 * React Native's shadow props (iOS: shadowColor/Offset/Opacity/Radius,
 * Android: elevation — RN has no single cross-platform box-shadow
 * equivalent, so both are set on every preset). Spread one into a
 * component's style.
 */
export const shadows = {
  /** Card hover/raised state — `0 6px 18px rgba(27,28,24,.12)` in the mockup. */
  card: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  /** Active segmented-control tab — `0 1px 3px rgba(0,0,0,.12)` in the mockup. */
  tabActive: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  /** Dropdown/popover menu — `0 8px 24px rgba(0,0,0,.4)` in the mockup. */
  popover: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
