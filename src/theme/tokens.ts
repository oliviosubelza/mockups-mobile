import { StyleSheet, type TextStyle } from 'react-native';

import type { ColorToken } from './colors';

/**
 * Scale-independent design tokens plus the *base* (unscaled) specs that
 * `createAppTheme` multiplies by the user's font scale.
 *
 * Density targets the web design system rather than stock React Native:
 * controls land at 24–38px tall instead of the 36–44px a default RN button
 * produces. Touch accessibility is preserved by `hitSlop`, not by padding —
 * see `MIN_TOUCH_TARGET`.
 */

/** Spacing scale on a 4px grid. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Corner radii. `md` is the control default; `lg` is the surface default. */
export const borderRadii = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof borderRadii;

/** Border widths. Hairline is the house style — never use `thick` on controls. */
export const borderWidths = {
  none: 0,
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
} as const;

/** Stacking order for overlays. */
export const zIndices = {
  base: 0,
  sticky: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
} as const;

/** Standalone icon sizes, for icons not owned by a control. */
export const iconSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

/**
 * Minimum tappable edge (Apple HIG / Material). Controls shorter than this
 * keep their compact visual box and expand their touch area with `hitSlop`.
 */
export const MIN_TOUCH_TARGET = 44;

/** Default text size the whole scale is authored against. */
export const BASE_FONT_SIZE = 14;
/** Bounds for the user-adjustable text size, mirroring the web app's 12–18. */
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 18;

export type ControlSize = 'xs' | 'sm' | 'md' | 'lg';

export type ControlSpec = {
  /** Applied as `minHeight` so OS font scaling can grow the control. */
  height: number;
  paddingHorizontal: SpacingToken;
  gap: SpacingToken;
  fontSize: number;
  lineHeight: number;
  iconSize: number;
  borderRadius: RadiusToken;
};

/** Height/type pairing for every interactive control (Button, Input, Select...). */
export const controlSizes = {
  xs: {
    height: 24,
    paddingHorizontal: 's',
    gap: 'xs',
    fontSize: 11,
    lineHeight: 14,
    iconSize: 12,
    borderRadius: 'sm',
  },
  sm: {
    height: 28,
    paddingHorizontal: 'm',
    gap: 'xs',
    fontSize: 12,
    lineHeight: 16,
    iconSize: 14,
    borderRadius: 'md',
  },
  md: {
    height: 32,
    paddingHorizontal: 'm',
    gap: 's',
    fontSize: 13,
    lineHeight: 18,
    iconSize: 16,
    borderRadius: 'md',
  },
  lg: {
    height: 38,
    paddingHorizontal: 'l',
    gap: 's',
    fontSize: 15,
    lineHeight: 20,
    iconSize: 18,
    borderRadius: 'md',
  },
} satisfies Record<ControlSize, ControlSpec>;

export type BadgeSize = 'sm' | 'md';

export type BadgeSpec = {
  height: number;
  paddingHorizontal: SpacingToken;
  gap: SpacingToken;
  fontSize: number;
  lineHeight: number;
  iconSize: number;
};

/** Badges sit below the control scale — they label, they are not tapped. */
export const badgeSizes = {
  sm: {
    height: 16,
    paddingHorizontal: 'xs',
    gap: 'xxs',
    fontSize: 10,
    lineHeight: 12,
    iconSize: 10,
  },
  md: {
    height: 20,
    paddingHorizontal: 's',
    gap: 'xs',
    fontSize: 11,
    lineHeight: 14,
    iconSize: 12,
  },
} satisfies Record<BadgeSize, BadgeSpec>;

// 1. AÑADIMOS fontFamily AL TIPO
type TextVariantSpec = {
  fontSize: number;
  lineHeight: number;
  fontWeight?: TextStyle['fontWeight'];
  color?: ColorToken;
  fontFamily?: string; 
};

/**
 * Typographic scale at font scale 1. Tightened from the previous set
 * (header 28→26, title 20→19, subtitle 16→15, label 13→12) to match the
 * information density of the web app.
 */
// 2. AÑADIMOS EL PESO DE MONTSERRAT CORRESPONDIENTE A CADA VARIANTE
export const baseTextVariants = {
  defaults: { fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 20, color: 'foreground' },
  header: { fontFamily: 'Montserrat_700Bold', fontSize: 26, lineHeight: 32, fontWeight: '700', color: 'foreground' },
  title: { fontFamily: 'Montserrat_600SemiBold', fontSize: 19, lineHeight: 25, fontWeight: '600', color: 'foreground' },
  subtitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15, lineHeight: 21, fontWeight: '600', color: 'foreground' },
  body: { fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 20, color: 'foreground' },
  bodySmall: { fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 18, color: 'foreground' },
  caption: { fontFamily: 'Montserrat_400Regular', fontSize: 12, lineHeight: 16, color: 'mutedForeground' },
  label: { fontFamily: 'Montserrat_500Medium', fontSize: 12, lineHeight: 16, fontWeight: '500', color: 'foreground' },
} satisfies Record<string, TextVariantSpec>;

/**
 * Maps a record's values while preserving its key literals.
 *
 * The result type is generic in the output value because scaling widens
 * `as const` literals to `number`. `Object.fromEntries` erases keys to
 * `string`, so the cast is load-bearing.
 */
export function mapRecord<T extends Record<string, unknown>, R>(
  source: T,
  transform: (value: T[keyof T]) => R,
): { [K in keyof T]: R } {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, transform(value as T[keyof T])]),
  ) as { [K in keyof T]: R };
}