import type { LucideIcon } from 'lucide-react-native';

import {
  Box,
  Text,
  useAppTheme,
  type BadgeSize,
  type ColorToken,
} from '@/theme';

/** Semantic color family. */
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

/** Visual weight, independent of the tone. */
export type BadgeEmphasis = 'solid' | 'soft' | 'outline';

type BadgeStyle = {
  background: ColorToken;
  foreground: ColorToken;
  border: ColorToken | null;
};

/**
 * Solid fills use the `*Solid` tokens rather than the raw feedback colors:
 * those are tuned per scheme so the label clears 4.5:1 at badge text size.
 * `neutral` is the one pair that reads as a tint — a neutral fill on a neutral
 * surface has nowhere to go — but its label still measures 16:1 / 14:1.
 */
const solid: Record<BadgeTone, BadgeStyle> = {
  neutral: { background: 'secondary', foreground: 'secondaryForeground', border: null },
  primary: { background: 'primarySolid', foreground: 'solidForeground', border: null },
  success: { background: 'successSolid', foreground: 'solidForeground', border: null },
  warning: { background: 'warning', foreground: 'warningForeground', border: null },
  danger: { background: 'dangerSolid', foreground: 'solidForeground', border: null },
};

const soft: Record<BadgeTone, BadgeStyle> = {
  neutral: { background: 'mutedBackground', foreground: 'mutedForeground', border: null },
  primary: { background: 'primarySoft', foreground: 'primary', border: null },
  success: { background: 'successSoft', foreground: 'success', border: null },
  warning: { background: 'warningSoft', foreground: 'warning', border: null },
  danger: { background: 'dangerSoft', foreground: 'danger', border: null },
};

const outline: Record<BadgeTone, BadgeStyle> = {
  neutral: { background: 'mutedBackground', foreground: 'mutedForeground', border: 'border' },
  primary: { background: 'primarySoft', foreground: 'primary', border: 'primary' },
  success: { background: 'successSoft', foreground: 'success', border: 'success' },
  warning: { background: 'warningSoft', foreground: 'warning', border: 'warning' },
  danger: { background: 'dangerSoft', foreground: 'danger', border: 'danger' },
};

const emphasisStyles: Record<BadgeEmphasis, Record<BadgeTone, BadgeStyle>> = {
  solid,
  soft,
  outline,
};

type Props = {
  label: string | number;
  /** Color family. Default `neutral`. */
  tone?: BadgeTone;
  /** Visual weight. Default `solid` — filled background, contrasting label. */
  emphasis?: BadgeEmphasis;
  size?: BadgeSize;
  /** Icon rendered before the label. */
  icon?: LucideIcon;
  /** `pill` is fully rounded (default); `rounded` uses the control radius. */
  shape?: 'pill' | 'rounded';
};

/**
 * Status/label pill.
 *
 * Two independent axes — `tone` picks the color family, `emphasis` picks the
 * weight — so any status reads at any level of prominence without adding a
 * variant per combination.
 */
export function Badge({
  label,
  tone = 'neutral',
  emphasis = 'solid',
  size = 'md',
  icon: Icon,
  shape = 'pill',
}: Props) {
  const theme = useAppTheme();
  const spec = theme.badgeSizes[size];
  const style = emphasisStyles[emphasis][tone];

  return (
    <Box
      backgroundColor={style.background}
      borderColor={style.border ?? 'transparent'}
      borderWidth={style.border ? (emphasis === 'outline' ? 1.5 : theme.borderWidths.hairline) : 0}
      borderRadius={shape === 'pill' ? 'full' : 'sm'}
      minHeight={spec.height}
      paddingHorizontal={spec.paddingHorizontal}
      gap={spec.gap}
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      alignSelf="flex-start"
    >
      {Icon ? (
        <Icon size={spec.iconSize} color={theme.colors[style.foreground]} strokeWidth={2.25} />
      ) : null}
      <Text
        color={style.foreground}
        fontSize={spec.fontSize}
        lineHeight={spec.lineHeight}
        fontWeight={emphasis === 'outline' ? '700' : '600'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Box>
  );
}

type CountBadgeProps = {
  count?: number;
  /** Values above this render as `{max}+`. Default 99. */
  max?: number;
  tone?: BadgeTone;
  size?: BadgeSize;
};

/**
 * Numeric notification pill. Renders nothing when `count` is falsy or
 * non-positive, so callers can pass an optional count directly.
 */
export function CountBadge({
  count,
  max = 99,
  tone = 'danger',
  size = 'md',
}: CountBadgeProps) {
  const theme = useAppTheme();
  const spec = theme.badgeSizes[size];

  if (!count || count <= 0) return null;

  const style = solid[tone];

  return (
    <Box
      backgroundColor={style.background}
      borderRadius="full"
      minWidth={spec.height}
      minHeight={spec.height}
      paddingHorizontal="xxs"
      alignItems="center"
      justifyContent="center"
    >
      <Text
        color={style.foreground}
        fontSize={spec.fontSize}
        lineHeight={spec.lineHeight}
        fontWeight="700"
        numberOfLines={1}
      >
        {count > max ? `${max}+` : count}
      </Text>
    </Box>
  );
}
