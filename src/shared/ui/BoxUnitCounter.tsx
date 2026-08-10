import { View } from 'react-native';
import { Layers, Package } from 'lucide-react-native';

import { Text, useAppTheme } from '@/theme';

import { QuantityStepper } from './QuantityStepper';

/** Conteo expresado como cajas cerradas + unidades sueltas. */
export interface BoxUnitValue {
  cajas: string;
  unidades: string;
}

export const EMPTY_BOX_UNIT: BoxUnitValue = { cajas: '', unidades: '' };

/** Total en unidades de un conteo caja/unidad. */
export const boxUnitTotal = (value: BoxUnitValue, cajaSize: number): number => {
  const cajas = parseInt(value.cajas || '0', 10) || 0;
  const unidades = parseInt(value.unidades || '0', 10) || 0;
  return cajas * cajaSize + unidades;
};

/** Reparte un total en cajas cerradas + el resto como unidades sueltas. */
export const splitBoxUnit = (total: number, cajaSize: number): BoxUnitValue => {
  const safeTotal = Math.max(0, total);
  if (cajaSize <= 0) return { cajas: '0', unidades: safeTotal.toString() };
  return {
    cajas: Math.floor(safeTotal / cajaSize).toString(),
    unidades: (safeTotal % cajaSize).toString(),
  };
};

/**
 * Normaliza un conteo para que las unidades sueltas nunca lleguen al tamaño
 * de la caja: 7 cajas + 12 sueltas (de 12) es 8 cajas + 0 sueltas.
 *
 * Sin esto el total puede cuadrar mientras el desglose describe un estado
 * físicamente imposible.
 */
export const normalizeBoxUnit = (value: BoxUnitValue, cajaSize: number): BoxUnitValue =>
  splitBoxUnit(boxUnitTotal(value, cajaSize), cajaSize);

export interface BoxUnitCounterProps {
  value: BoxUnitValue;
  onChange: (next: BoxUnitValue) => void;
  /** Unidades por caja. Se muestra como pista junto a "Cajas". */
  cajaSize: number;
  /** Cuando se define, se muestra la fila de total con esta etiqueta. */
  totalLabel?: string;
  /** Cantidad objetivo. Si el total coincide, el total se pinta en success. */
  targetQty?: number;
}

/**
 * Captura estándar de cantidad en cajas + unidades sueltas.
 * Origen del patrón: Auditoría a Ciegas Semáforo.
 *
 * Ocupa el ancho completo en dos columnas: el label va arriba y el control
 * abajo, para que los steppers no queden apretados contra el borde derecho.
 */
export const BoxUnitCounter = ({
  value,
  onChange,
  cajaSize,
  totalLabel,
  targetQty,
}: BoxUnitCounterProps) => {
  const theme = useAppTheme();

  const total = boxUnitTotal(value, cajaSize);
  const isMatched = targetQty !== undefined && total === targetQty;

  const renderField = (
    field: keyof BoxUnitValue,
    label: string,
    hint: string | null,
    icon: React.ReactNode
  ) => (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text variant="label" style={{ fontSize: 12, color: theme.colors.foreground }}>
          {label}
        </Text>
        {hint && (
          <Text variant="caption" style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
            {hint}
          </Text>
        )}
      </View>

      <QuantityStepper
        value={value[field]}
        // Mientras se teclea no se normaliza, para no pelear con el usuario
        // a mitad de un número. El acarreo se aplica al salir del input.
        onChangeText={(next) => onChange({ ...value, [field]: next })}
        onBlur={() => onChange(normalizeBoxUnit(value, cajaSize))}
        onAdjust={(delta) => {
          // Un paso en "cajas" mueve cajaSize unidades; uno en "unidades", una.
          const step = field === 'cajas' ? cajaSize : 1;
          const nextTotal = boxUnitTotal(value, cajaSize) + delta * step;
          onChange(splitBoxUnit(nextTotal, cajaSize));
        }}
      />
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {renderField('cajas', 'Cajas', `(${cajaSize} u/cj)`, <Layers size={13} color={theme.colors.primary} />)}
        {renderField('unidades', 'Unidades', null, <Package size={13} color={theme.colors.primary} />)}
      </View>

      {totalLabel && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ fontSize: 11, color: theme.colors.mutedForeground, flexShrink: 1 }}
          >
            {totalLabel}
          </Text>
          <Text
            variant="label"
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: isMatched ? theme.colors.success : theme.colors.foreground,
            }}
          >
            {total} u.
          </Text>
        </View>
      )}
    </View>
  );
};
