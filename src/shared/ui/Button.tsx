import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Box, Text, useAppTheme } from '@/theme';
import type { Theme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type ColorKey = keyof Theme['colors'];

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

const sizeMap: Record<Size, { py: 's' | 'm'; px: 'm' | 'l'; font: number }> = {
  sm: { py: 's', px: 'm', font: 14 },
  md: { py: 'm', px: 'l', font: 15 },
  lg: { py: 'm', px: 'l', font: 16 },
};

const bgByVariant: Record<Variant, ColorKey> = {
  primary: 'primary',
  danger: 'danger',
  ghost: 'transparent',
  secondary: 'secondary',
};

const fgByVariant: Record<Variant, ColorKey> = {
  primary: 'primaryForeground',
  danger: 'dangerForeground',
  ghost: 'primary',
  secondary: 'secondaryForeground',
};

/**
 * Themed pressable button with a small, explicit API over Pressable.
 * Borders stay hairline-thin for a light, crisp look.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...pressable
}: Props) {
  const theme = useAppTheme();
  const s = sizeMap[size];
  const bg = bgByVariant[variant];
  const fg = fgByVariant[variant];
  const showBorder = variant === 'secondary' || variant === 'ghost';
  const isDisabled = disabled || loading;

  return (
    <Pressable disabled={isDisabled} {...pressable}>
      {({ pressed }) => (
        <Box
          backgroundColor={bg}
          borderColor="border"
          borderWidth={showBorder ? StyleSheet.hairlineWidth : 0}
          borderRadius="md"
          paddingVertical={s.py}
          paddingHorizontal={s.px}
          alignItems="center"
          justifyContent="center"
          flexDirection="row"
          opacity={isDisabled ? 0.5 : pressed ? 0.85 : 1}
          style={fullWidth ? { alignSelf: 'stretch' } : undefined}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors[fg]} />
          ) : (
            <Text color={fg} fontSize={s.font} fontWeight="600">
              {label}
            </Text>
          )}
        </Box>
      )}
    </Pressable>
  );
}
