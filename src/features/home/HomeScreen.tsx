import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHomeRoutes } from '@/navigation/registry';
import { selectPendientesCount, useDespachos } from '@/features/despachos/store';
import { useDevSettings } from '@/shared/stores/devSettings';
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
  const showGallery = useDevSettings((state) => state.showGallery);

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  const allRoutes = getHomeRoutes();

  // FILTRAR RUTAS SEGÚN EL ROL DEL USUARIO
  // La Galería de componentes es exclusiva para desarrollo y se controla desde Configuración -> Opciones de Desarrollador.
  const items = allRoutes.filter((route) => {
    if (route.id === 'gallery') {
      return showGallery;
    }
    if (user.role === 'SUPERVISOR') {
      // El supervisor ve "Órdenes para Revisar", "Productos Faltantes" y "Revisión Semáforo"
      return (
        route.id === 'supervisor.ordenes' ||
        route.id === 'supervisor.productosFaltantes' ||
        route.id === 'supervisor.semaforo'
      );
    }
    // El chofer ve "Revisión de Despacho" y "Mis Entregas"
    return route.id === 'despachos' || route.id === 'entregas';
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
              ? 'Panel de Supervisor: Consolidación, Revisión Semáforo y Productos Faltantes.'
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
                    : route.id === 'supervisor.productosFaltantes'
                      ? 5
                      : route.id === 'supervisor.semaforo'
                        ? 3
                        : undefined
              }
            />
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
}
