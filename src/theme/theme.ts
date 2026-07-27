import { createTheme } from '@shopify/restyle';

import { palette } from './palette';

/**
 * Application theme (Restyle).
 *
 * Semantic color naming (background/foreground/primary/...) mirrors the web
 * app so tokens stay in sync across platforms. Borders are intentionally thin
 * — the default `hairline` width keeps the UI light and crisp.
 */
const theme = createTheme({
  colors: {
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
    ring: palette.cobalt,

    danger: palette.danger,
    dangerForeground: palette.white,
    success: palette.success,
    warning: palette.warning,

    primarySoft: palette.cobaltSoft,
    successSoft: palette.successSoft,
    warningSoft: palette.warningSoft,
    dangerSoft: palette.dangerSoft,

    transparent: palette.transparent,
  },
  spacing: {
    none: 0,
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  borderRadii: {
    none: 0,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },
  breakpoints: {
    phone: 0,
    tablet: 768,
  },
  textVariants: {
    defaults: {
      fontSize: 14,
      lineHeight: 20,
      color: 'foreground',
    },
    header: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
      color: 'foreground',
    },
    title: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '600',
      color: 'foreground',
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      color: 'foreground',
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      color: 'foreground',
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      color: 'mutedForeground',
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: 'foreground',
    },
  },
});

export type Theme = typeof theme;

export const darkTheme: Theme = {
  ...theme,
  colors: {
    ...theme.colors,
    mainBackground: palette.gray850,
    cardBackground: palette.gray800,
    foreground: palette.white,
    mutedBackground: palette.gray750,
    mutedForeground: palette.slate400,

    primary: palette.cobaltBright,
    primaryForeground: palette.white,
    secondary: palette.gray750,
    secondaryForeground: palette.white,
    accent: palette.gray700,

    border: palette.gray700,
    ring: palette.cobaltBright,

    danger: palette.dangerBright,

    primarySoft: palette.cobaltSoftDark,
    successSoft: palette.successSoftDark,
    warningSoft: palette.warningSoftDark,
    dangerSoft: palette.dangerSoftDark,
  },
};

export default theme;
