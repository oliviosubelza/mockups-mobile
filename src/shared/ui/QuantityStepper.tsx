import { View, TextInput, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { useAppTheme } from '@/theme';

export interface QuantityStepperProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Recibe +1 o -1. El padre decide el clamp y el paso. */
  onAdjust: (delta: number) => void;
  /** Color del borde del input. Por defecto, el borde neutro del theme. */
  accent?: string;
  /** Ancho fijo del input. Si se omite, el input ocupa el espacio disponible. */
  inputWidth?: number;
  disabled?: boolean;
  placeholder?: string;
}

const BUTTON_WIDTH = 32;
const CONTROL_HEIGHT = 34;

/**
 * Control estándar de cantidad (− / input / +) de la app.
 * Origen del patrón: Auditoría a Ciegas Semáforo.
 * Solo maneja el control: la etiqueta y el layout los pone el contenedor.
 */
export const QuantityStepper = ({
  value,
  onChangeText,
  onAdjust,
  accent,
  inputWidth,
  disabled = false,
  placeholder = '0',
}: QuantityStepperProps) => {
  const theme = useAppTheme();
  const borderColor = accent ?? theme.colors.border;

  const renderButton = (delta: number) => (
    <TouchableOpacity
      onPress={() => onAdjust(delta)}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={{
        width: BUTTON_WIDTH,
        height: CONTROL_HEIGHT,
        borderRadius: 8,
        backgroundColor: theme.colors.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {delta < 0 ? (
        <Minus size={15} color={theme.colors.foreground} />
      ) : (
        <Plus size={15} color={theme.colors.foreground} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {renderButton(-1)}

      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedForeground}
        keyboardType="number-pad"
        style={{
          ...(inputWidth ? { width: inputWidth } : { flex: 1 }),
          height: CONTROL_HEIGHT,
          paddingVertical: 0,
          paddingHorizontal: 0,
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor,
          textAlign: 'center',
          textAlignVertical: 'center',
          includeFontPadding: false,
          fontSize: 14,
          fontWeight: '800',
          color: accent ?? theme.colors.foreground,
        }}
      />

      {renderButton(1)}
    </View>
  );
};
