import { ThemeProvider } from '@shopify/restyle';
import { useMemo, type ReactNode } from 'react';

import { useAppearance } from '@/shared/stores/appearance';

import { createAppTheme } from './theme';
import { useEffectiveColorScheme } from './useEffectiveColorScheme';

type Props = {
  children: ReactNode;
};

/**
 * Provides the Restyle theme driven by the persisted appearance store.
 * `system` follows the OS scheme; `light`/`dark` force a theme. The theme is
 * rebuilt whenever the scheme or the base font size changes.
 */
export function AppThemeProvider({ children }: Props) {
  const baseFontSize = useAppearance((state) => state.baseFontSize);
  const scheme = useEffectiveColorScheme();

  const active = useMemo(
    () => createAppTheme(scheme, baseFontSize),
    [scheme, baseFontSize],
  );

  return <ThemeProvider theme={active}>{children}</ThemeProvider>;
}
