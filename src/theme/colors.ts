import { palette } from './palette';

/**
 * Semantic color tokens.
 *
 * Naming mirrors the web design system (`background`/`foreground`/`primary`/...)
 * so tokens stay in sync across platforms. Both schemes must expose the exact
 * same key set — `darkColors` is built by spreading `lightColors`.
 */
export const lightColors = {
  mainBackground: palette.white,
  cardBackground: palette.white,
  foreground: palette.ink,
  mutedBackground: palette.slate50,
  mutedForeground: palette.slate500,

  primary: palette.cobalt,
  primaryForeground: palette.white,
  secondary: palette.slate50,
  secondaryForeground: palette.slate900,
  accent: palette.slate50,

  border: palette.slate100,
  /** Un paso más visible que `border`: separadores de listas y divisores de sección. */
  borderStrong: palette.slate200,
  ring: palette.cobalt,

  danger: palette.danger,
  dangerForeground: palette.white,
  success: palette.success,
  successForeground: palette.white,
  warning: palette.warning,
  warningForeground: palette.ink,

  primarySoft: palette.cobaltSoft,
  successSoft: palette.successSoft,
  warningSoft: palette.warningSoft,
  dangerSoft: palette.dangerSoft,

  /**
   * Solid-fill tokens. Each scheme inverts the recipe so the pill stays
   * readable *and* stays visible against its card: the light scheme fills dark
   * and writes white, the dark scheme fills bright and writes near-black.
   * `warning` already followed this shape, which is why it keeps its own pair.
   */
  primarySolid: palette.cobalt,
  successSolid: palette.successStrong,
  dangerSolid: palette.dangerStrong,
  solidForeground: palette.white,

  transparent: palette.transparent,
};

/** Token key usable anywhere a theme color is expected. */
export type ColorToken = keyof typeof lightColors;

export const darkColors: typeof lightColors = {
  ...lightColors,

  // Elevation ramp: 10% page → 16% card → 18% muted → 20% accent → 22% border.
  // Six points between page and card is what makes cards legible without shadows.
  mainBackground: palette.gray950,
  cardBackground: palette.gray850,
  foreground: palette.white,
  mutedBackground: palette.gray800,
  mutedForeground: palette.slate400,

  primary: palette.cobaltBright,
  primaryForeground: palette.white,
  secondary: palette.gray800,
  secondaryForeground: palette.white,
  accent: palette.gray750,

  border: palette.gray700,
  borderStrong: palette.gray650,
  ring: palette.cobaltBright,

  danger: palette.dangerBright,
  // `warningForeground` is not overridden here: it only ever sits on `warning`,
  // and `warning` is the same amber in both schemes. White on that amber is
  // 2.15:1 — below the 4.5:1 AA floor for badge-sized text — so it keeps the
  // near-black `ink` from `lightColors`, which measures 8.5:1.
  // Use `warning` (not `warningForeground`) for warning-colored text on a card.

  primarySoft: palette.cobaltSoftDark,
  successSoft: palette.successSoftDark,
  warningSoft: palette.warningSoftDark,
  dangerSoft: palette.dangerSoftDark,

  // Bright fill + near-black label: on the dark elevation ramp this both
  // clears 4.5:1 for the label and keeps the pill distinct from the card,
  // which a darkened fill does not (it sinks to ~1.1:1 against gray850).
  primarySolid: palette.cobaltBright,
  successSolid: palette.success,
  dangerSolid: palette.dangerBright,
  solidForeground: palette.ink,
};
