/**
 * Design tokens extracted from the "Worship App" mockup (Worship
 * App.dc.html) — colors, typography, spacing, radii, shadows, and motion
 * timing, with no layout/component logic attached.
 *
 * This is a token library only. No existing screen has been switched over
 * to it yet — the app's current screens keep their own inline colors
 * (`#2f6feb`, `#eee`, ...) until/unless someone deliberately migrates a
 * screen to these tokens. Import what you need:
 *
 *   import { colors, spacing, textStyles } from "../../design-system";
 */

export { colors } from "./colors";
export { fontFamily, fontSize, fontWeight, letterSpacing, textStyles } from "./typography";
export { spacing, spacingFine } from "./spacing";
export { radii } from "./radii";
export { shadows } from "./shadows";
export { duration, fadeIn } from "./motion";
