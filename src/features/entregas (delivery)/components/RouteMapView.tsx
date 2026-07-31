import { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ScrollView,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import {
  Building2,
  ArrowRight,
  MapPin,
  Plus,
  Minus,
  Compass,
  Phone,
  Clock,
  Package,
  User,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  List as ListIcon,
  Map as MapIcon,
  Snowflake,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Store,
  ChevronsUp,
  Locate,
  ClipboardList,
  Truck,
} from 'lucide-react-native';

import { Button, Badge } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';
import { updateStopStatus } from '../data/delivery-store';
import {
  SANTA_CRUZ_DEPOT,
  SANTA_CRUZ_INITIAL_REGION,
  SANTA_CRUZ_STOPS_COORDINATES,
  SANTA_CRUZ_CLOSED_LOOP_POLYLINE,
  SANTA_CRUZ_COMPLETED_SEGMENT,
} from '../data/santa-cruz-route';
import type { DeliveryStop } from '../types';

type Props = {
  stops: DeliveryStop[];
  onSelectStopDetail: (stop: DeliveryStop) => void;
  onRegistrarVisita?: (stop: DeliveryStop) => void;
  tripCode?: string;
  statsLabel?: string;
  onSwitchToLista?: () => void;
  onBack?: () => void;
};

type SheetState = 'collapsed' | 'medium' | 'expanded';

/** Coordenadas relativas en porcentaje para la capa web interactiva */
const WEB_PIN_PERCENTAGES: Record<number, { left: number; top: number }> = {
  1: { left: 42, top: 40 }, // Equipetrol Norte
  2: { left: 52, top: 25 }, // IC Norte
  3: { left: 50, top: 62 }, // Mercado Abasto Norte
  4: { left: 38, top: 76 }, // Mercado Mutualista
  5: { left: 62, top: 18 }, // Fidalga 4to Anillo
  6: { left: 78, top: 60 }, // Villa 1ro de Mayo
};

export function RouteMapView({
  stops,
  onSelectStopDetail,
  onRegistrarVisita,
  tripCode = 'OT-98421',
  statsLabel = '2/6 (33%)',
  onSwitchToLista,
  onBack,
}: Props) {
  const theme = useAppTheme();
  const isDark = theme.colors.mainBackground === '#18181b';
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(SANTA_CRUZ_INITIAL_REGION);

  // SELECCIÓN AUTOMÁTICA DE PARADA POR DEFECTO
  const defaultActive =
    stops.find((s) => s.status === 'ARRIVED') ||
    stops.find((s) => s.status === 'EN_ROUTE') ||
    stops.find((s) => s.status === 'INCIDENT') ||
    stops[0];

  const [selectedStop, setSelectedStop] = useState<DeliveryStop>(defaultActive);

  // ALTURA ANIMADA EN TIEMPO REAL CON EL DEDO DEL CHOFER
  const currentHeightRef = useRef<number>(290); // 290px por defecto (medium)
  const sheetHeight = useRef(new Animated.Value(290)).current;
  const [sheetState, setSheetState] = useState<SheetState>('medium');

  const animateToHeight = (targetHeight: number) => {
    currentHeightRef.current = targetHeight;
    if (targetHeight <= 120) {
      setSheetState('collapsed');
    } else if (targetHeight >= 380) {
      setSheetState('expanded');
    } else {
      setSheetState('medium');
    }

    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      friction: 7,
      tension: 65,
    }).start();
  };

  const cycleSheetState = (direction?: 'up' | 'down') => {
    const current = currentHeightRef.current;
    if (direction === 'up') {
      if (current < 200) animateToHeight(290);
      else animateToHeight(480);
    } else if (direction === 'down') {
      if (current > 380) animateToHeight(290);
      else animateToHeight(80);
    } else {
      if (current < 200) animateToHeight(290);
      else if (current < 380) animateToHeight(480);
      else animateToHeight(80);
    }
  };

  // PAN RESPONDER CON SEGUIMIENTO CONTINUO EN TIEMPO REAL AL DEDO
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // En cada movimiento del dedo (dy), la altura cambia en tiempo real a 60fps
        let newHeight = currentHeightRef.current - gestureState.dy;
        if (newHeight < 75) newHeight = 75;
        if (newHeight > 520) newHeight = 520;
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalDragHeight = currentHeightRef.current - gestureState.dy;
        let target = 290;

        if (gestureState.vy < -0.4 || finalDragHeight > 360) {
          target = 480; // Snap a totalmente expandido
        } else if (gestureState.vy > 0.4 || finalDragHeight < 160) {
          target = 80; // Snap a colapsado
        } else {
          target = 290; // Snap a medio
        }

        animateToHeight(target);
      },
    }),
  ).current;

  const getPinColor = (status: string) => {
    if (status === 'ARRIVED') return '#0284c7';
    if (status === 'DELIVERED') return '#22c55e';
    if (status === 'INCIDENT') return '#ef4444';
    return '#eab308';
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSelectStop = (stop: DeliveryStop) => {
    setSelectedStop(stop);
    if (currentHeightRef.current < 200) {
      animateToHeight(290);
    }
    const coords = SANTA_CRUZ_STOPS_COORDINATES[stop.sequence];
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        300,
      );
    }
  };

  const handleZoomIn = () => {
    const nextRegion = {
      ...currentRegion,
      latitudeDelta: Math.max(0.008, currentRegion.latitudeDelta * 0.6),
      longitudeDelta: Math.max(0.008, currentRegion.longitudeDelta * 0.6),
    };
    setCurrentRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 300);
  };

  const handleZoomOut = () => {
    const nextRegion = {
      ...currentRegion,
      latitudeDelta: Math.min(0.3, currentRegion.latitudeDelta * 1.6),
      longitudeDelta: Math.min(0.3, currentRegion.longitudeDelta * 1.6),
    };
    setCurrentRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 300);
  };  const handleOrientNorth = () => {
    setCurrentRegion(SANTA_CRUZ_INITIAL_REGION);
    mapRef.current?.animateToRegion(SANTA_CRUZ_INITIAL_REGION, 400);
  };

  const handleMyLocation = () => {
    const driverStop =
      stops.find((s) => s.status === 'ARRIVED') ||
      stops.find((s) => s.status === 'EN_ROUTE') ||
      stops[0];

    if (driverStop) {
      handleSelectStop(driverStop);
      const coords = SANTA_CRUZ_STOPS_COORDINATES[driverStop.sequence];
      if (coords && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          400,
        );
      }
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={{ flex: 1, position: 'relative', backgroundColor: theme.colors.mainBackground }}>
      {/* 1. MAPA FULL SCREEN */}
      <View style={{ flex: 1, position: 'relative', backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}>
        {isWeb ? (
          <View style={{ flex: 1, position: 'relative' }}>
            <iframe
              title="Google Maps Route Santa Cruz"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${selectedStop ? SANTA_CRUZ_STOPS_COORDINATES[selectedStop.sequence]?.latitude || -17.778 : -17.778},${selectedStop ? SANTA_CRUZ_STOPS_COORDINATES[selectedStop.sequence]?.longitude || -63.18 : -63.18}&z=14&output=embed`}
            />

            {stops.map((stop) => {
              const pos = WEB_PIN_PERCENTAGES[stop.sequence] || { left: 50, top: 50 };
              const isSelected = selectedStop.id === stop.id;
              const pinBg = getPinColor(stop.status);

              return (
                <TouchableOpacity
                  key={stop.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectStop(stop)}
                  style={{
                    position: 'absolute',
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: isSelected ? 99 : 10,
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        position: 'absolute',
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: pinBg,
                        opacity: 0.35,
                      }}
                    />
                  )}

                  <View
                    style={{
                      width: isSelected ? 36 : 30,
                      height: isSelected ? 36 : 30,
                      borderRadius: isSelected ? 18 : 15,
                      backgroundColor: pinBg,
                      borderWidth: 2.5,
                      borderColor: isSelected ? '#ffffff' : '#00000022',
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 8,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: isSelected ? 13 : 11 }}>
                      #{stop.sequence}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={SANTA_CRUZ_INITIAL_REGION}
            onRegionChangeComplete={setCurrentRegion}
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          >
            <Polyline
              coordinates={SANTA_CRUZ_CLOSED_LOOP_POLYLINE}
              strokeColor="#94a3b8"
              strokeWidth={4}
              lineDashPattern={[6, 4]}
            />
            <Polyline
              coordinates={SANTA_CRUZ_COMPLETED_SEGMENT}
              strokeColor="#2563eb"
              strokeWidth={5}
            />

            <Marker coordinate={SANTA_CRUZ_DEPOT} title="Centro de Distribución">
              <View
                style={{
                  backgroundColor: '#0f172a',
                  padding: 6,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: '#ffffff',
                  elevation: 5,
                }}
              >
                <Building2 size={16} color="#ffffff" />
              </View>
            </Marker>

            {stops.map((stop) => {
              const coords = SANTA_CRUZ_STOPS_COORDINATES[stop.sequence] || SANTA_CRUZ_DEPOT;
              const isSelected = selectedStop.id === stop.id;
              const pinBg = getPinColor(stop.status);

              return (
                <Marker
                  key={stop.id}
                  coordinate={coords}
                  title={`#${stop.sequence} • ${stop.clientName}`}
                  description={stop.address}
                  onPress={() => handleSelectStop(stop)}
                >
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && (
                      <View
                        style={{
                          position: 'absolute',
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: pinBg,
                          opacity: 0.3,
                        }}
                      />
                    )}

                    <View
                      style={{
                        width: isSelected ? 36 : 30,
                        height: isSelected ? 36 : 30,
                        borderRadius: isSelected ? 18 : 15,
                        backgroundColor: pinBg,
                        borderWidth: 2.5,
                        borderColor: isSelected ? '#ffffff' : '#00000022',
                        alignItems: 'center',
                        justifyContent: 'center',
                        elevation: isSelected ? 8 : 4,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: isSelected ? 13 : 11 }}>
                        #{stop.sequence}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}
      </View>

      {/* 2. GRADIENTE DEGRADADO SUAVE DESDE ARRIBA HACIA ABAJO (ADAPTATIVO MODO CLARO / OSCURO) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 160,
          zIndex: 15,
        }}
      >
        <Svg height="100%" width="100%">
          <Defs>
            <SvgGradient id="topGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={isDark ? '#18181b' : '#ffffff'} stopOpacity={isDark ? 0.92 : 0.95} />
              <Stop offset="0.55" stopColor={isDark ? '#18181b' : '#ffffff'} stopOpacity={isDark ? 0.55 : 0.65} />
              <Stop offset="1" stopColor={isDark ? '#18181b' : '#ffffff'} stopOpacity="0.0" />
            </SvgGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGradient)" />
        </Svg>
      </View>

      <View
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          gap: 10,
          zIndex: 30,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            padding: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            elevation: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 10 }}>
                HOJA DE RUTA
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="header" style={{ fontSize: 16, fontWeight: '700', color: theme.colors.foreground }}>
                  {tripCode}
                </Text>
                <Badge label={statsLabel} tone="primary" emphasis="soft" size="sm" />
              </View>
            </View>
          </View>

          {onSwitchToLista && (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.colors.secondary,
                borderRadius: 8,
                padding: 2,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <TouchableOpacity
                onPress={onSwitchToLista}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ListIcon size={14} color={theme.colors.mutedForeground} />
                <Text variant="label" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                  Lista
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: theme.colors.cardBackground,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  elevation: 1,
                }}
              >
                <MapIcon size={14} color={theme.colors.primary} />
                <Text variant="label" style={{ fontSize: 11, color: theme.colors.primary, fontWeight: '700' }}>
                  Mapa
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* LEYENDA POR COLOR DE ESTADOS DE ENTREGA */}
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            paddingHorizontal: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0284c7' }} />
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: theme.colors.foreground }}>
              En Sitio / Llegada
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#eab308' }} />
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: theme.colors.foreground }}>
              Pendientes
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: theme.colors.foreground }}>
              Entregados
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              gap: 5,
              elevation: 2,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
            <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: theme.colors.foreground }}>
              Incidencias
            </Text>
          </View>
        </View>
      </View>

      {/* 3. BOTONES DE CONTROL DE MAPA: COMPÁS, MI UBICACIÓN Y ZOOM +, - */}
      <View
        style={{
          position: 'absolute',
          top: 140,
          right: 12,
          gap: 8,
          zIndex: 30,
        }}
      >
        {/* BOTÓN COMPÁS */}
        {/* <TouchableOpacity
          onPress={handleOrientNorth}
          activeOpacity={0.8}
          style={{
            backgroundColor: theme.colors.cardBackground,
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
          }}
        >
          <Compass size={20} color={theme.colors.foreground} />
        </TouchableOpacity> */}

        {/* 4TO BOTÓN: MI UBICACIÓN (CHOFER) */}
        <TouchableOpacity
          onPress={handleMyLocation}
          activeOpacity={0.8}
          style={{
            backgroundColor: theme.colors.cardBackground,
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
          }}
        >
          <Locate size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* BOTONES DE ZOOM +, - */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            elevation: 5,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            onPress={handleZoomIn}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Plus size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleZoomOut}
            activeOpacity={0.8}
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Minus size={20} color={theme.colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. DRAGGABLE BOTTOM SHEET EN TIEMPO REAL PEGADO ABAJO DE LA PANTALLA */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: sheetHeight,
          overflow: 'hidden',
          backgroundColor: theme.colors.cardBackground,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 2.5,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: getPinColor(selectedStop.status),
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          zIndex: 40,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
        }}
      >
        {/* ZONA DRAGGABLE ASIDERO CON GESTOS Y SENSACIÓN TÁCTIL */}
        <View
          {...panResponder.panHandlers}
          style={{
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <TouchableOpacity
            onPress={() => cycleSheetState()}
            activeOpacity={0.7}
            style={{
              width: '100%',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <View
              style={{
                width: 52,
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.colors.mutedForeground + '60',
              }}
            />
            {sheetState === 'medium' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                <ChevronsUp size={12} color={theme.colors.mutedForeground} />
                <Text variant="caption" style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
                  Deslizar arriba para ver detalles completos
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* CABECERA RESUMEN PRINCIPAL */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => cycleSheetState()}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: sheetState === 'collapsed' ? 0 : 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor:
                  selectedStop.status === 'ARRIVED'
                    ? '#e0f2fe'
                    : selectedStop.status === 'DELIVERED'
                    ? '#dcfce7'
                    : selectedStop.status === 'INCIDENT'
                    ? '#fee2e2'
                    : '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color:
                    selectedStop.status === 'ARRIVED'
                      ? '#0369a1'
                      : selectedStop.status === 'DELIVERED'
                      ? '#166534'
                      : selectedStop.status === 'INCIDENT'
                      ? '#991b1b'
                      : '#92400e',
                }}
              >
                #{selectedStop.sequence}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text variant="title" style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                {selectedStop.clientName}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }} numberOfLines={1}>
                {selectedStop.address}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Badge
              label={
                selectedStop.status === 'ARRIVED'
                  ? 'En Descarga'
                  : selectedStop.status === 'DELIVERED'
                  ? 'Entregado'
                  : selectedStop.status === 'INCIDENT'
                  ? 'Incidencia'
                  : 'Pendiente'
              }
              tone={
                selectedStop.status === 'ARRIVED'
                  ? 'primary'
                  : selectedStop.status === 'DELIVERED'
                  ? 'success'
                  : selectedStop.status === 'INCIDENT'
                  ? 'danger'
                  : 'neutral'
              }
              emphasis="soft"
              size="sm"
            />
            {sheetState === 'expanded' ? (
              <ChevronDown size={20} color={theme.colors.mutedForeground} />
            ) : (
              <ChevronUp size={20} color={theme.colors.mutedForeground} />
            )}
          </View>
        </TouchableOpacity>

        {/* CONTENIDO INTERMEDIO (sheetState === 'medium') */}
        {sheetState === 'medium' && (
          <View style={{ gap: 10, marginTop: 2 }}>
            <View style={{ gap: 6, backgroundColor: theme.colors.secondary, padding: 10, borderRadius: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={14} color={theme.colors.primary} style={{ marginTop: 2 }} />
                <Text variant="bodySmall" style={{ color: theme.colors.foreground, flex: 1, fontSize: 12 }}>
                  Punto de Entrega: <Text variant="label" style={{ fontSize: 12 }}>{selectedStop.deliveryPointId}</Text>
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color={theme.colors.mutedForeground} />
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                    {selectedStop.deliveryWindow}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <User size={12} color={theme.colors.mutedForeground} />
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                    {selectedStop.contactName}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Package size={13} color={theme.colors.mutedForeground} />
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                  Carga: <Text variant="label" style={{ fontSize: 11 }}>{selectedStop.packagesCount}</Text>
                </Text>
              </View>

              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                Monto: <Text variant="label" style={{ fontSize: 12, fontWeight: '700' }}>{selectedStop.netTotal}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              {selectedStop.status === 'PENDING' && (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Llamar"
                      icon={Phone}
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => handleCall(selectedStop.contactPhone)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Button
                      label="Estoy en camino"
                      icon={Truck}
                      variant="primary"
                      size="sm"
                      fullWidth
                      onPress={() => updateStopStatus(selectedStop.id, 'EN_ROUTE')}
                    />
                  </View>
                </>
              )}

              {selectedStop.status === 'EN_ROUTE' && (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Llamar"
                      icon={Phone}
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => handleCall(selectedStop.contactPhone)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Button
                      label="Marcar llegada"
                      icon={CheckCircle2}
                      variant="primary"
                      size="sm"
                      fullWidth
                      onPress={() => updateStopStatus(selectedStop.id, 'ARRIVED')}
                    />
                  </View>
                </>
              )}

              {(selectedStop.status === 'ARRIVED' || selectedStop.status === 'DELIVERED') && (
                <>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Llamar"
                      icon={Phone}
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => handleCall(selectedStop.contactPhone)}
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Button
                      label={selectedStop.status === 'ARRIVED' ? 'Ver detalle y cobrar' : 'Ver detalle'}
                      variant="primary"
                      size="sm"
                      fullWidth
                      endIcon={ArrowRight}
                      onPress={() => onSelectStopDetail(selectedStop)}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* CONTENIDO TOTALMENTE EXPANDIDO BIEN ALTO (sheetState === 'expanded' ~ 70% DE LA PANTALLA) */}
        {sheetState === 'expanded' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
          >
            {/* TARJETA DETALLADA DE UBICACIÓN Y CONTACTO */}
            <View style={{ gap: 8, backgroundColor: theme.colors.secondary, padding: 12, borderRadius: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontWeight: '700' }}>
                  DATOS DE ENTREGA
                </Text>
                {selectedStop.isCold && (
                  <Badge label="Cadena de Frío" tone="primary" emphasis="soft" size="sm" />
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <MapPin size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
                    {selectedStop.address}
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                    Código de Punto: {selectedStop.deliveryPointId}
                  </Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 2 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <User size={14} color={theme.colors.primary} />
                  <Text variant="label" style={{ fontSize: 12 }}>
                    {selectedStop.contactName}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleCall(selectedStop.contactPhone)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: theme.colors.primarySoft,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Phone size={12} color={theme.colors.primary} />
                  <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 11 }}>
                    Llamar
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color={theme.colors.mutedForeground} />
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                  Ventana Horaria: <Text variant="label" style={{ fontSize: 12 }}>{selectedStop.deliveryWindow}</Text>
                </Text>
              </View>
            </View>

            {/* NOTAS OPERATIVAS PARA EL CHOFER */}
            {selectedStop.notes && (
              <View
                style={{
                  backgroundColor: '#fef3c7',
                  borderRadius: 10,
                  padding: 10,
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'flex-start',
                  borderWidth: 1,
                  borderColor: '#f59e0b',
                }}
              >
                <FileText size={16} color="#92400e" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" style={{ color: '#78350f', fontWeight: '700', fontSize: 11 }}>
                    Instrucciones de Entrega:
                  </Text>
                  <Text variant="caption" style={{ color: '#92400e', fontSize: 12, lineHeight: 16 }}>
                    {selectedStop.notes}
                  </Text>
                </View>
              </View>
            )}

            {/* RESUMEN COMPLETO DE CARGA Y MONTO NETO */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
                justifyContent: 'space-between',
              }}
            >
              <View style={{ gap: 2 }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                  Bultos / Unidades
                </Text>
                <Text variant="label" style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
                  {selectedStop.totalUnits} unidades
                </Text>
              </View>

              <View style={{ height: 30, width: 1, backgroundColor: theme.colors.border }} />

              <View style={{ gap: 2 }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                  Peso & Volumen
                </Text>
                <Text variant="label" style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
                  {selectedStop.packagesCount}
                </Text>
              </View>

              <View style={{ height: 30, width: 1, backgroundColor: theme.colors.border }} />

              <View style={{ gap: 2 }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                  Monto Neto
                </Text>
                <Text variant="label" style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>
                  {selectedStop.netTotal}
                </Text>
              </View>
            </View>

            {/* BOTONES DE ACCIÓN PRINCIPALES */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Llamar"
                    icon={Phone}
                    variant="outline"
                    fullWidth
                    onPress={() => handleCall(selectedStop.contactPhone)}
                  />
                </View>

                {onRegistrarVisita && (
                  <View style={{ flex: 1.2 }}>
                    <Button
                      label="Registrar Visita"
                      icon={ClipboardList}
                      variant="secondary"
                      fullWidth
                      onPress={() => onRegistrarVisita(selectedStop)}
                    />
                  </View>
                )}
              </View>

              {selectedStop.status === 'PENDING' && (
                <Button
                  label="Estoy en camino"
                  icon={Truck}
                  variant="primary"
                  fullWidth
                  onPress={() => updateStopStatus(selectedStop.id, 'EN_ROUTE')}
                />
              )}

              {selectedStop.status === 'EN_ROUTE' && (
                <Button
                  label="Marcar llegada"
                  icon={CheckCircle2}
                  variant="primary"
                  fullWidth
                  onPress={() => updateStopStatus(selectedStop.id, 'ARRIVED')}
                />
              )}

              {(selectedStop.status === 'ARRIVED' || selectedStop.status === 'DELIVERED') && (
                <Button
                  label={selectedStop.status === 'ARRIVED' ? 'Ver detalle y cobrar' : 'Ver detalle'}
                  variant="primary"
                  fullWidth
                  endIcon={ArrowRight}
                  onPress={() => onSelectStopDetail(selectedStop)}
                />
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

// Estilos JSON para Google Maps
const lightMapStyle = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#212121' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#212121' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
];
