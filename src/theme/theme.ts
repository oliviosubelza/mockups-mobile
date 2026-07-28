import { createTheme } from '@shopify/restyle';

import { darkColors, lightColors } from './colors';
import {
  BASE_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  badgeSizes,
  baseTextVariants,
  borderRadii,
  borderWidths,
  controlSizes,
  iconSizes,
  mapRecord,
  spacing,
  zIndices,
} from './tokens';

export type ColorScheme = 'light' | 'dark';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Application theme factory (Restyle).
 *
 * Everything size-related is derived from `baseFontSize` so the whole UI
 * scales from one number — the React Native counterpart of the web app's
 * user-adjustable `--app-font-size`. Note this composes with the OS font
 * scale rather than replacing it: `Text` keeps `allowFontScaling` on, and
 * control heights are `minHeight`, so large accessibility settings grow the
 * control instead of clipping its label.
 */
export function createAppTheme(
  scheme: ColorScheme = 'light',
  baseFontSize: number = BASE_FONT_SIZE,
) {
  const base = clamp(baseFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE);
  const k = base / BASE_FONT_SIZE;
  const px = (value: number) => Math.round(value * k);

  return createTheme({
    colors: scheme === 'dark' ? darkColors : lightColors,

    spacing,
    borderRadii,
    borderWidths,
    zIndices,
    breakpoints: {
      phone: 0,
      tablet: 768,
    },

    iconSizes: mapRecord(iconSizes, px),

    controlSizes: mapRecord(controlSizes, (spec) => ({
      ...spec,
      height: px(spec.height),
      fontSize: px(spec.fontSize),
      lineHeight: px(spec.lineHeight),
      iconSize: px(spec.iconSize),
    })),

    badgeSizes: mapRecord(badgeSizes, (spec) => ({
      ...spec,
      height: px(spec.height),
      fontSize: px(spec.fontSize),
      lineHeight: px(spec.lineHeight),
      iconSize: px(spec.iconSize),
    })),

    textVariants: mapRecord(baseTextVariants, (spec) => ({
      ...spec,
      fontSize: px(spec.fontSize),
      lineHeight: px(spec.lineHeight),
    })),

    /** The resolved base size, so screens can report/debug the active scale. */
    baseFontSize: base,
    /** Multiplier applied to every derived size. */
    fontScale: k,
  });
}

export type Theme = ReturnType<typeof createAppTheme>;

/** Default light/dark themes at the default font scale. */
export const theme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');

export default theme;
