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
  // `ink` is near-black: legible on the light `warning` amber, unreadable on the
  // dark elevation ramp. Follows `dangerForeground`/`successForeground`, which
  // stay `white` in both schemes.
  warningForeground: palette.white,

  primarySoft: palette.cobaltSoftDark,
  successSoft: palette.successSoftDark,
  warningSoft: palette.warningSoftDark,
  dangerSoft: palette.dangerSoftDark,
};
