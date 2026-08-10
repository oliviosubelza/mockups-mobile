import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { useAppTheme } from '@/theme';

export interface ScreenActionBarProps {
  /** Contenido informativo del lado izquierdo: progreso, totales, badges. */
  children?: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  actionIcon?: LucideIcon;
  tone?: 'primary' | 'success';
}

/**
 * Barra de acción anclada al pie de pantalla. A la izquierda el estado, a la
 * derecha la única acción que corresponde.
 *
 * Va como HERMANO del ScrollView en un contenedor `flex: 1`, no como elemento
 * absoluto: así ocupa su propio alto y el contenido no necesita reservar
 * espacio ni queda tapado.
 *
 * El `paddingBottom` absorbe el inset inferior a propósito. Con
 * `edgeToEdgeEnabled` la app dibuja debajo de la barra de navegación del
 * sistema, y esa barra no se puede pintar desde la app en esta versión de Expo.
 * Extender aquí una superficie opaca con borde superior es lo que le da un
 * fondo definido y un límite visible, sobre todo en tema claro, donde la barra
 * del sistema es casi del mismo blanco que el fondo de la app.
 */
export function ScreenActionBar({
  children,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionIcon,
  tone = 'primary',
}: ScreenActionBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: theme.colors.cardBackground,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderStrong,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <View style={{ flexShrink: 1, gap: 3 }}>{children}</View>

      <View style={{ flexShrink: 0 }}>
        <Button
          label={actionLabel}
          icon={actionIcon}
          variant={tone === 'success' ? 'success' : 'primary'}
          size="lg"
          disabled={actionDisabled}
          onPress={onAction}
        />
      </View>
    </View>
  );
}
