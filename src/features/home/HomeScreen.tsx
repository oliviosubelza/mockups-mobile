import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHomeRoutes } from '@/navigation/registry';
import { selectPendientesCount, useDespachos } from '@/features/despachos/store';
import { useUser } from '@/shared/stores/user';
import { CardMenu } from '@/shared/ui';
import { Box, Text } from '@/theme';
import { LoginScreen } from '@/features/auth/LoginScreen';

import { HeaderProfile } from './HeaderProfile';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const user = useUser((state) => state.user);
  const pendientes = useDespachos(selectPendientesCount);

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  const allRoutes = getHomeRoutes();

  // FILTRAR RUTAS SEGÚN EL ROL DEL USUARIO
  const items = allRoutes.filter((route) => {
    if (user.role === 'SUPERVISOR') {
      // El supervisor únicamente ve "Órdenes para Revisar"
      return route.id === 'supervisor.ordenes' || route.id === 'gallery';
    }
    // El chofer ve "Revisión a ciegas", "Mis Entregas" y galería
    return route.id === 'despachos' || route.id === 'entregas' || route.id === 'gallery';
  });

  const firstName = user.name.split(' ')[0];

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 20 }}
      >
        <HeaderProfile />

        <Box gap="xs">
          <Text variant="header">Hola, {firstName}</Text>
          <Text variant="caption">
            {user.role === 'SUPERVISOR'
              ? 'Panel de Supervisor: Gestiona y consolida revisiones pendientes.'
              : 'Panel de Chofer: Selecciona una opción para comenzar tu ruta.'}
          </Text>
        </Box>

        <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between">
          {items.map((route) => (
            <CardMenu
              key={route.id}
              route={route}
              badge={
                route.id === 'despachos'
                  ? pendientes
                  : route.id === 'supervisor.ordenes'
                    ? 2
                    : undefined
              }
            />
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
}
