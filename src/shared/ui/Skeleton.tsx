import { useEffect, useRef } from 'react';
import { Animated, View, DimensionValue } from 'react-native';

import { useAppTheme } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

// ==========================================
// 1. COMPONENTE BASE: El bloque gris que palpita con soporte de tema
// ==========================================
export const SkeletonBase = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) => {
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.mutedBackground,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ==========================================
// 2. SKELETON DE FORMULARIO (Soporta modo claro y oscuro)
// ==========================================
export const FormSkeleton = () => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.cardBackground,
        borderColor: theme.colors.border,
        borderWidth: 1,
        padding: 20,
        borderRadius: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        gap: 16,
      }}
    >
      {/* Label del buscador */}
      <SkeletonBase width="40%" height={16} />
      {/* Input grande del buscador */}
      <SkeletonBase height={44} borderRadius={10} />

      {/* Fila de Cantidad y Unidad */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBase width="60%" height={16} />
          <SkeletonBase height={42} borderRadius={8} />
        </View>
        <View style={{ flex: 1.8, gap: 8 }}>
          <SkeletonBase width="40%" height={16} />
          <SkeletonBase height={42} borderRadius={8} />
        </View>
      </View>

      {/* Botón de añadir */}
      <SkeletonBase height={44} borderRadius={8} />
    </View>
  );
};

// ==========================================
// 3. SKELETON DE LISTA (Soporta modo claro y oscuro)
// ==========================================
export const ListSkeleton = () => {
  const theme = useAppTheme();

  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {/* Cabecera de la lista */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <SkeletonBase width="50%" height={24} />
        <SkeletonBase width="20%" height={24} borderRadius={16} />
      </View>

      {/* Filas simuladas */}
      {[1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.cardBackground,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          {/* Icono circular a la izquierda */}
          <SkeletonBase width={28} height={28} borderRadius={14} style={{ marginRight: 12 }} />

          {/* Textos centrales */}
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBase width="75%" height={15} />
            <SkeletonBase width="45%" height={12} />
          </View>

          {/* Icono a la derecha */}
          <SkeletonBase width={20} height={20} borderRadius={4} />
        </View>
      ))}
    </View>
  );
};