import { Pressable, StyleSheet } from 'react-native';

import { navigateTo } from '@/navigation/registry';
import type { RouteInterface } from '@/navigation/types';
import { Box, Text, useAppTheme } from '@/theme';

import { Badge } from './Badge';

type Props = {
  route: RouteInterface;
  /** Overrides `route.badge` (e.g. a live count). */
  badge?: number;
};

/** Home dashboard tile (2-column grid). Tapping navigates through the registry. */
export function CardMenu({ route, badge }: Props) {
  const theme = useAppTheme();
  const Icon = route.icon;
  const badgeCount = badge ?? route.badge;

  return (
    <Pressable
      onPress={() => navigateTo(route)}
      style={({ pressed }) => ({
        width: '48%',
        marginBottom: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Box
        backgroundColor="cardBackground"
        borderColor="border"
        borderWidth={StyleSheet.hairlineWidth}
        borderRadius="lg"
        padding="l"
        gap="m"
        minHeight={120}
        justifyContent="space-between"
      >
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box
            width={44}
            height={44}
            borderRadius="md"
            backgroundColor="primarySoft"
            alignItems="center"
            justifyContent="center"
          >
            <Icon size={22} color={theme.colors.primary} />
          </Box>
          <Badge count={badgeCount} />
        </Box>

        <Box gap="xs">
          <Text variant="subtitle">{route.title}</Text>
          {route.description ? (
            <Text variant="caption" numberOfLines={2}>
              {route.description}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Pressable>
  );
}
