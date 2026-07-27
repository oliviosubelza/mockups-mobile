import { Box, Text } from '@/theme';
import type { Theme } from '@/theme';

export type ChipTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

type ColorKey = keyof Theme['colors'];

type Props = {
  label: string;
  tone?: ChipTone;
};

const toneMap: Record<ChipTone, { bg: ColorKey; fg: ColorKey }> = {
  neutral: { bg: 'mutedBackground', fg: 'mutedForeground' },
  primary: { bg: 'primarySoft', fg: 'primary' },
  success: { bg: 'successSoft', fg: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
};

/** Soft status pill: tinted background with a matching colored label. */
export function Chip({ label, tone = 'neutral' }: Props) {
  const { bg, fg } = toneMap[tone];

  return (
    <Box
      backgroundColor={bg}
      borderRadius="full"
      paddingHorizontal="m"
      paddingVertical="xs"
      alignSelf="flex-start"
    >
      <Text color={fg} fontSize={12} lineHeight={16} fontWeight="600">
        {label}
      </Text>
    </Box>
  );
}
