import React from 'react';
import { View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  SlideInLeft,
  SlideOutLeft,
  LinearTransition,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Text } from '@/theme';

const ICON_CONTAINER_WIDTH = 60;
const MAX_SWIPE_LIMIT = -90; // ~150% del ancho del ícono
const DELETE_THRESHOLD = -70;
const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  borderRadius?: number;
  containerStyle?: object;
};

/**
 * Reusable Swipe-to-Delete item container:
 * - Strictly left-only dragging (drag to right is completely blocked).
 * - Clamped drag limit with elastic resistance.
 * - Triggers deletion when dragged past ~150% icon width threshold.
 * - Displays clear "Eliminar" text in red background to avoid icon duplication.
 */
export function SwipeableItem({
  children,
  onDelete,
  borderRadius = 0,
  containerStyle,
}: Props) {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .onChange((event) => {
      // Bloquear 100% el movimiento a la derecha
      if (event.translationX < 0) {
        if (event.translationX < MAX_SWIPE_LIMIT) {
          // Resistencia elástica pasados los -90px
          translateX.value =
            MAX_SWIPE_LIMIT + (event.translationX - MAX_SWIPE_LIMIT) * 0.25;
        } else {
          translateX.value = event.translationX;
        }
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      // Si se arrastró más del umbral (-70px) o el envío fue rápido a la izquierda
      if (translateX.value <= DELETE_THRESHOLD || event.velocityX < -400) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(onDelete)();
          }
        });
      } else {
        // Regresar suavemente a 0
        translateX.value = withTiming(0, { duration: 180 });
      }
    });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bgStyle = useAnimatedStyle(() => {
    // El fondo rojo sólo se muestra progresivamente mientras se arrastra a la izquierda
    const opacity = interpolate(
      translateX.value,
      [0, -15],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
    };
  });

  const actionTextStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [0, DELETE_THRESHOLD, MAX_SWIPE_LIMIT],
      [0.85, 1.0, 1.1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View
      entering={SlideInLeft.duration(220)}
      exiting={SlideOutLeft.duration(180)}
      layout={LinearTransition.duration(200)}
      style={[{ position: 'relative' }, containerStyle]}
    >
      {/* Fondo rojo de eliminación con texto en blanco 'Eliminar' */}
      <Animated.View
        style={[
          bgStyle,
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ef4444',
            borderRadius,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingRight: 18,
          },
        ]}
      >
        <Animated.View style={actionTextStyle}>
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
            Eliminar
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Tarjeta frontal arrastrable */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedContentStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
