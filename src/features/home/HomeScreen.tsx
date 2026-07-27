import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHomeRoutes } from '@/navigation/registry';
import { selectPendientesCount, useDespachos } from '@/features/despachos/store';
import { useUser } from '@/shared/stores/user';
import { CardMenu } from '@/shared/ui';
import { Box, Text } from '@/theme';

import { HeaderProfile } from './HeaderProfile';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const items = getHomeRoutes();
  const firstName = useUser((state) => state.user.name.split(' ')[0]);
  const pendientes = useDespachos(selectPendientesCount);

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 20 }}
      >
        <HeaderProfile />

        <Box gap="xs">
          <Text variant="header">Hola, {firstName}</Text>
          <Text variant="caption">Selecciona una opción para comenzar</Text>
        </Box>

        <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between">
          {items.map((route) => (
            <CardMenu
              key={route.id}
              route={route}
              badge={route.id === 'despachos' ? pendientes : undefined}
            />
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
}
