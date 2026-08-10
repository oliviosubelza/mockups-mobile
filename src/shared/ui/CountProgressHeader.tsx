import { View } from 'react-native';

import { Text, useAppTheme } from '@/theme';

export interface CountProgressHeaderProps {
  title: string;
  counted: number;
  total: number;
  /** Sustantivo que se cuenta. Por defecto "ítems". */
  unitLabel?: string;
}

/**
 * Cabecera estándar de avance de conteo: título + "N/M ítems · P%" + barra fina.
 * Origen del patrón: vista de Conteo del chofer (ChequeoScreen).
 */
export const CountProgressHeader = ({
  title,
  counted,
  total,
  unitLabel = 'ítems',
}: CountProgressHeaderProps) => {
  const theme = useAppTheme();

  const pct = total === 0 ? 0 : Math.round((counted / total) * 100);
  const isComplete = pct >= 100;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text variant="title" style={{ fontSize: 16, flexShrink: 1 }} numberOfLines={1}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: isComplete ? theme.colors.success : theme.colors.mutedForeground,
          }}
        >
          {counted}/{total} {unitLabel} · {pct}%
        </Text>
      </View>

      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.colors.secondary,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            backgroundColor: isComplete ? theme.colors.success : theme.colors.primary,
          }}
        />
      </View>
    </View>
  );
};
