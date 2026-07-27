import { StyleSheet } from 'react-native';

import { Box } from '@/theme';

type Variant = 'elevated' | 'flat';

type Props = React.ComponentProps<typeof Box> & {
  /** `elevated` (hairline border, default) or `flat` (muted, borderless). */
  variant?: Variant;
};

/** Surface container. Borders stay hairline-thin for a light, crisp look. */
export function Card({ variant = 'elevated', children, ...rest }: Props) {
  const flat = variant === 'flat';
  return (
    <Box
      backgroundColor={flat ? 'mutedBackground' : 'cardBackground'}
      borderColor="border"
      borderWidth={flat ? 0 : StyleSheet.hairlineWidth}
      borderRadius="lg"
      padding="l"
      {...rest}
    >
      {children}
    </Box>
  );
}
