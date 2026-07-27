import { ThemeProvider } from '@shopify/restyle';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useAppearance } from '@/shared/stores/appearance';

import theme, { darkTheme } from './theme';

type Props = {
  children: ReactNode;
};

/**
 * Provides the Restyle theme driven by the persisted appearance store.
 * `system` follows the OS scheme; `light`/`dark` force a theme.
 */
export function AppThemeProvider({ children }: Props) {
  const mode = useAppearance((state) => state.mode);
  const system = useColorScheme();
  const effective = mode === 'system' ? system : mode;
  const active = effective === 'dark' ? darkTheme : theme;

  return <ThemeProvider theme={active}>{children}</ThemeProvider>;
}
