import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

import { useEffectiveColorScheme } from '@/theme';

/**
 * Sincroniza las barras del sistema con el tema que la app está usando.
 *
 * El problema que resuelve: el store de apariencia permite forzar claro u
 * oscuro sin importar el sistema operativo, pero las barras del sistema se
 * pintan según el SO. Con la app en claro y el SO en oscuro, los iconos del
 * sistema quedan claros sobre un fondo claro y prácticamente no se ven.
 *
 * OJO con las dos APIs, porque nombran los valores al revés:
 *  - `StatusBar.style`: 'dark' = CONTENIDO oscuro (para fondo claro).
 *  - `NavigationBar.setStyle`: 'light' = BARRA clara con contenido oscuro.
 *
 * `setStyle` solo funciona con edge-to-edge activo y
 * `enforceNavigationBarContrast: false` en el plugin react-native-edge-to-edge
 * (ver app.json). Es exclusivo de Android.
 */
export function SystemBars() {
  const scheme = useEffectiveColorScheme();
  const isDark = scheme === 'dark';

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setStyle(isDark ? 'dark' : 'light');
  }, [isDark]);

  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
