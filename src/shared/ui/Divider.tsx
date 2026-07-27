import { Box } from '@/theme';

type Props = {
  /** Horizontal (default) or vertical rule. */
  orientation?: 'horizontal' | 'vertical';
  /** Spacing applied on the cross axis. */
  spacing?: 'none' | 'xs' | 's' | 'm' | 'l';
};

/** Hairline separator line. */
export function Divider({ orientation = 'horizontal', spacing = 'm' }: Props) {
  const vertical = orientation === 'vertical';
  return (
    <Box
      backgroundColor="border"
      width={vertical ? 1 : undefined}
      height={vertical ? undefined : 1}
      alignSelf="stretch"
      marginVertical={vertical ? 'none' : spacing}
      marginHorizontal={vertical ? spacing : 'none'}
    />
  );
}
