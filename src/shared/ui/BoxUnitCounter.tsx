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

/**
 * Total en unidades de un conteo caja/unidad.
 *
 * Las unidades son la cantidad real: las cajas son solo un atajo para contar
 * de a `cajaSize`. Por eso los dos campos son independientes y las sueltas
 * PUEDEN superar el tamaño de la caja — quien cuenta 7 cajas y 14 sueltas
 * contó 98 unidades, y 98 es el número que importa.
 */
export const boxUnitTotal = (value: BoxUnitValue, cajaSize: number): number => {
  const cajas = parseInt(value.cajas || '0', 10) || 0;
  const unidades = parseInt(value.unidades || '0', 10) || 0;
  return cajas * cajaSize + unidades;
};

/**
 * Describe un conteo dejando explícita la equivalencia: "7 cajas + 9 u. = 93 u.".
 *
 * Escribir "93 u. · 7 cajas" se lee como dos exigencias distintas (93 unidades
 * Y ADEMÁS 8 cajas) en vez de la misma cantidad expresada de dos formas, y
 * además esconde las unidades sueltas.
 */
export const formatBoxUnit = (boxes: number, loose: number, total: number): string => {
  const cajas = `${boxes} ${boxes === 1 ? 'caja' : 'cajas'}`;
  return loose > 0 ? `${cajas} + ${loose} u. = ${total} u.` : `${cajas} = ${total} u.`;
};

export interface BoxUnitCounterProps {
  value: BoxUnitValue;
  onChange: (next: BoxUnitValue) => void;
  /** Unidades que aporta cada caja. Se muestra como pista junto a "Cajas". */
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
        // Cada campo mueve SOLO su propio valor. Un acarreo de sueltas a cajas
        // haría que tocar "+" en Unidades cambie Cajas, y el control mentiría
        // sobre lo que hace.
        onAdjust={(delta) => {
          const parsed = parseInt(value[field] || '0', 10);
          const safe = isNaN(parsed) ? 0 : parsed;
          onChange({ ...value, [field]: Math.max(0, safe + delta).toString() });
        }}
      />
    </View>
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {renderField('cajas', 'Cajas', `(x${cajaSize} u.)`, <Layers size={13} color={theme.colors.primary} />)}
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
            {targetQty === undefined ? `${total} u.` : `${total} / ${targetQty} u.`}
          </Text>
        </View>
      )}
    </View>
  );
};
