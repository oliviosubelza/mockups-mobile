import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import {
  Box,
  MIN_TOUCH_TARGET,
  Text,
  useAppTheme,
  type ColorToken,
  type ControlSize,
} from '@/theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'link';

export type ButtonSize = ControlSize;

type Props = Omit<PressableProps, 'children' | 'style'> & {
  /** Visible text. Omit it (and pass `icon`) for an icon-only button. */
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label, or the only content when `label` is omitted. */
  icon?: LucideIcon;
  /** Icon after the label. */
  endIcon?: LucideIcon;
  /** Swaps the content for a spinner and blocks presses. */
  loading?: boolean;
  fullWidth?: boolean;
};

type VariantStyle = {
  background: ColorToken;
  foreground: ColorToken;
  border: ColorToken | null;
  /** Background while pressed — tinted surfaces shift instead of fading. */
  pressedBackground: ColorToken | null;
  underline?: boolean;
};

const variantStyles: Record<ButtonVariant, VariantStyle> = {
  primary: {
    background: 'primary',
    foreground: 'primaryForeground',
    border: null,
    pressedBackground: null,
  },
  secondary: {
    background: 'secondary',
    foreground: 'secondaryForeground',
    border: null,
    pressedBackground: 'accent',
  },
  outline: {
    background: 'transparent',
    foreground: 'foreground',
    border: 'border',
    pressedBackground: 'accent',
  },
  ghost: {
    background: 'transparent',
    foreground: 'foreground',
    border: null,
    pressedBackground: 'accent',
  },
  danger: {
    background: 'danger',
    foreground: 'dangerForeground',
    border: null,
    pressedBackground: null,
  },
  link: {
    background: 'transparent',
    foreground: 'primary',
    border: null,
    pressedBackground: null,
    underline: true,
  },
};

/**
 * Themed pressable button.
 *
 * Sizes follow the compact web control scale (24/28/32/38px tall at font
 * scale 1) rather than the taller React Native default. Because the visual box
 * can be smaller than the 44px minimum tappable edge, the shortfall is
 * recovered with `hitSlop` — the button looks dense but stays accessible.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  endIcon: EndIcon,
  loading = false,
  fullWidth = false,
  disabled,
  accessibilityLabel,
  ...pressable
}: Props) {
  const theme = useAppTheme();
  const spec = theme.controlSizes[size];
  const style = variantStyles[variant];

  const isDisabled = disabled || loading;
  const iconOnly = !label && !!Icon;

  // Grow the touch area to MIN_TOUCH_TARGET without growing the visual box.
  // Icon-only buttons are as narrow as they are short, so they need slop on
  // both axes; labelled buttons are wide enough and only pad vertically —
  // horizontal slop there would overlap neighbouring buttons in a row.
  const slop = Math.max(0, Math.round((MIN_TOUCH_TARGET - spec.height) / 2));
  const hitSlop = iconOnly
    ? slop
    : { top: slop, bottom: slop, left: 0, right: 0 };

  return (
    <Pressable
      disabled={isDisabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      style={fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }}
      {...pressable}
    >
      {({ pressed }) => {
        const background =
          pressed && style.pressedBackground ? style.pressedBackground : style.background;

        return (
          <Box
            backgroundColor={background}
            borderColor={style.border ?? 'transparent'}
            borderWidth={style.border ? theme.borderWidths.hairline : 0}
            borderRadius={spec.borderRadius}
            minHeight={spec.height}
            paddingHorizontal={iconOnly ? 'none' : spec.paddingHorizontal}
            width={iconOnly ? spec.height : undefined}
            gap={spec.gap}
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            opacity={isDisabled ? 0.5 : pressed && !style.pressedBackground ? 0.9 : 1}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors[style.foreground]}
              />
            ) : (
              <>
                {Icon ? (
                  <Icon
                    size={spec.iconSize}
                    color={theme.colors[style.foreground]}
                    strokeWidth={2}
                  />
                ) : null}
                {label ? (
                  <Text
                    color={style.foreground}
                    fontSize={spec.fontSize}
                    lineHeight={spec.lineHeight}
                    fontWeight="600"
                    textDecorationLine={style.underline ? 'underline' : 'none'}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                ) : null}
                {EndIcon ? (
                  <EndIcon
                    size={spec.iconSize}
                    color={theme.colors[style.foreground]}
                    strokeWidth={2}
                  />
                ) : null}
              </>
            )}
          </Box>
        );
      }}
    </Pressable>
  );
}
