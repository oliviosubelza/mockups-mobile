import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { Box, useAppTheme } from '@/theme';

type Variant = 'elevated' | 'flat';

/** Tono de la barra de estado izquierda. */
export type CardAccentTone = 'danger' | 'warning' | 'success' | 'primary' | 'neutral';

type Props = React.ComponentProps<typeof Box> & {
  /** `elevated` (hairline border, default) or `flat` (muted, borderless). */
  variant?: Variant;
  /**
   * Barra de estado de 4px pegada al filo izquierdo de la card.
   *
   * REGLA: úsala SOLO en cards que representan una entidad con estado —
   * una OT pendiente, un ítem contado o con diferencia. Nunca en banners,
   * paneles informativos ni contenedores de formulario. Si todo lleva
   * acento, el acento deja de significar algo.
   */
  accentTone?: CardAccentTone;
  /** Cuando se define, la card entera es tappable. */
  onPress?: () => void;
};

const ACCENT_WIDTH = 4;

/** Surface container. Borders stay hairline-thin for a light, crisp look. */
export function Card({
  variant = 'elevated',
  accentTone,
  onPress,
  style,
  children,
  ...rest
}: Props) {
  const theme = useAppTheme();
  const flat = variant === 'flat';

  const accentColor = accentTone
    ? accentTone === 'neutral'
      ? theme.colors.border
      : theme.colors[accentTone]
    : undefined;

  // Props que pertenecen a la SUPERFICIE (el marco) y no al contenido.
  const {
    padding = 'l',
    borderRadius = 'lg',
    borderWidth,
    borderColor = 'border',
    ...boxRest
  } = rest;

  const resolvedBorderWidth = borderWidth ?? (flat ? 0 : StyleSheet.hairlineWidth);

  let surface: React.ReactNode;

  if (!accentColor) {
    surface = (
      <Box
        backgroundColor={flat ? 'mutedBackground' : 'cardBackground'}
        borderColor={borderColor}
        borderWidth={resolvedBorderWidth}
        borderRadius={borderRadius}
        padding={padding}
        style={style}
        {...boxRest}
      >
        {children}
      </Box>
    );
  } else {
    // La barra es un hijo de layout dentro de una fila recortada por el radio.
    //
    // No se usa `borderLeftWidth`: mezclar anchos de borde distintos con
    // `borderRadius` obliga al modelo de caja a interpolar las esquinas y el
    // acento sale como una cuña diagonal. Tampoco se usa un `position:absolute`
    // dentro del padding box: ahí la curva le come las puntas y la barra se ve
    // como una lente flotando, despegada del filo de la card.
    surface = (
      <Box
        flexDirection="row"
        backgroundColor={flat ? 'mutedBackground' : 'cardBackground'}
        borderColor={borderColor}
        borderWidth={resolvedBorderWidth}
        borderRadius={borderRadius}
        style={{ overflow: 'hidden' }}
        {...boxRest}
      >
        <View style={{ width: ACCENT_WIDTH, backgroundColor: accentColor }} />

        <Box flex={1} padding={padding} style={style as StyleProp<ViewStyle>}>
          {children}
        </Box>
      </Box>
    );
  }

  if (!onPress) return <>{surface}</>;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {surface}
    </TouchableOpacity>
  );
}
