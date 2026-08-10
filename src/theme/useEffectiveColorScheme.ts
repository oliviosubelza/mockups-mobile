import { useColorScheme } from 'react-native';

import { useAppearance } from '@/shared/stores/appearance';

import type { ColorScheme } from './theme';

/**
 * Esquema que la app está usando REALMENTE.
 *
 * `mode: 'system'` sigue al sistema operativo; `light`/`dark` lo fuerzan. Esa
 * distinción importa fuera del theme: las barras del sistema (status bar y
 * barra de navegación de Android) se pintan según el SO, así que si la app
 * fuerza claro con el SO en oscuro, los iconos del sistema quedan claros sobre
 * un fondo claro y desaparecen. Cualquier cosa que sincronice con el sistema
 * debe leer este valor, no `useColorScheme()` a secas.
 */
export function useEffectiveColorScheme(): ColorScheme {
  const mode = useAppearance((state) => state.mode);
  const system = useColorScheme();

  const effective = mode === 'system' ? system : mode;
  return effective === 'dark' ? 'dark' : 'light';
}
