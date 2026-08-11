/**
 * Raw color palette ported from the keel web app design tokens.
 * Values are the exact HSL sources from the web theme; keep this file
 * palette-only (no semantic meaning) so themes can remap freely.
 */
export const palette = {
  // Brand
  cobalt: 'hsl(226, 68%, 46%)',
  cobaltBright: 'hsl(222, 90%, 68%)',

  // Neutrals (light)
  white: 'hsl(0, 0%, 100%)',
  ink: 'hsl(222, 84%, 5%)',
  slate50: 'hsl(210, 40%, 96%)',
  slate100: 'hsl(220, 13%, 91%)',
  slate200: 'hsl(220, 13%, 84%)',
  slate400: 'hsl(215, 20%, 65%)',
  slate500: 'hsl(215, 16%, 47%)',
  slate900: 'hsl(222, 47%, 11%)',

  // Neutrals (dark) — a monotonic elevation ramp. Surfaces separate by
  // luminance alone because the UI is intentionally shadowless.
  gray950: 'hsl(220, 14%, 10%)',
  gray900: 'hsl(220, 13%, 14%)',
  gray850: 'hsl(220, 13%, 16%)',
  gray800: 'hsl(220, 13%, 18%)',
  gray750: 'hsl(220, 13%, 20%)',
  gray700: 'hsl(220, 16%, 22%)',
  gray650: 'hsl(220, 16%, 29%)',

  // Feedback
  danger: 'hsl(0, 84%, 60%)',
  dangerBright: 'hsl(0, 72%, 60%)',
  success: 'hsl(142, 71%, 45%)',
  warning: 'hsl(38, 92%, 50%)',

  // Darkened feedback shades, for solid fills carrying white text in the light
  // scheme. `success`/`danger` at their base lightness measure 2.30:1 and
  // 3.78:1 against white — below the 4.5:1 floor for badge-sized text.
  successStrong: 'hsl(142, 71%, 29%)',
  dangerStrong: 'hsl(0, 84%, 47%)',

  // Soft tints (light) — subtle chip/accent backgrounds
  cobaltSoft: 'hsl(226, 68%, 95%)',
  successSoft: 'hsl(142, 55%, 92%)',
  warningSoft: 'hsl(38, 92%, 91%)',
  dangerSoft: 'hsl(0, 84%, 95%)',

  // Soft tints (dark) — desaturated, still readable as tinted
  cobaltSoftDark: 'hsl(226, 40%, 24%)',
  successSoftDark: 'hsl(142, 28%, 20%)',
  warningSoftDark: 'hsl(38, 45%, 22%)',
  dangerSoftDark: 'hsl(0, 40%, 26%)',

  transparent: 'transparent',
};
