import { Image } from 'expo-image';

import { getInitials } from '@/shared/stores/user';
import { Box, Text } from '@/theme';

type Props = {
  name: string;
  uri?: string;
  size?: number;
};

/** Circular avatar: image when `uri` is set, otherwise initials on the brand color. */
export function Avatar({ name, uri, size = 44 }: Props) {
  return (
    <Box
      width={size}
      height={size}
      borderRadius="full"
      backgroundColor="primary"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {uri ? (
        <Image
          source={uri}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      ) : (
        <Text color="primaryForeground" fontWeight="700" fontSize={size * 0.36}>
          {getInitials(name)}
        </Text>
      )}
    </Box>
  );
}
