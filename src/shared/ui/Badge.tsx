import { Box, Text } from '@/theme';

type Props = {
  count?: number;
};

/** Small count pill. Renders nothing when `count` is falsy or non-positive. */
export function Badge({ count }: Props) {
  if (!count || count <= 0) return null;

  return (
    <Box
      minWidth={20}
      height={20}
      paddingHorizontal="xs"
      borderRadius="full"
      backgroundColor="danger"
      alignItems="center"
      justifyContent="center"
    >
      <Text color="dangerForeground" fontSize={11} lineHeight={14} fontWeight="700">
        {count > 99 ? '99+' : count}
      </Text>
    </Box>
  );
}
