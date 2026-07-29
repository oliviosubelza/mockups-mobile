import { useState, useRef } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet, ScrollView, Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import {
  Building2,
  ArrowRight,
  MapPin,
  Snowflake,
  Plus,
  Minus,
  Compass,
  Phone,
  Clock,
  Package,
  User,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';

import { Button, Badge } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';
import {
  SANTA_CRUZ_DEPOT,
  SANTA_CRUZ_INITIAL_REGION,
  SANTA_CRUZ_STOPS_COORDINATES,
  SANTA_CRUZ_CLOSED_LOOP_POLYLINE,
  SANTA_CRUZ_COMPLETED_SEGMENT,
} from '../data/santa-cruz-route';
import type { DeliveryStop } from '../types';

const MAP_HEIGHT = 380;

type Props = {
  stops: DeliveryStop[];
  onSelectStopDetail: (stop: DeliveryStop) => void;
};

/** Coordenadas relativas en porcentaje para la capa web interactiva */
const WEB_PIN_PERCENTAGES: Record<number, { left: number; top: number }> = {
  1: { left: 42, top: 40 },  // Equipetrol Norte
  2: { left: 52, top: 25 },  // IC Norte
  3: { left: 50, top: 62 },  // Mercado Abasto Norte
  4: { left: 38, top: 76 },  // Mercado Mutualista (En Punto de Entrega / ARRIVED)
  5: { left: 62, top: 18 },  // Fidalga 4to Anillo
  6: { left: 78, top: 60 },  // Villa 1ro de Mayo
};

export function RouteMapView({ stops, onSelectStopDetail }: Props) {
  const theme = useAppTheme();
  const isDark = theme.colors.mainBackground === '#18181b';
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(SANTA_CRUZ_INITIAL_REGION);

  // SELECCIÓN AUTOMÁTICA POR DEFECTO: Prioriza la parada actual 'ARRIVED' (Llegó / Listo para descarga)
  const defaultActive =
    stops.find((s) => s.status === 'ARRIVED') ||
    stops.find((s) => s.status === 'EN_ROUTE') ||
    stops.find((s) => s.status === 'INCIDENT') ||
    stops[0];

  const [selectedStop, setSelectedStop] = useState<DeliveryStop>(defaultActive);

  // REGLA DE COLORES DE PARADA:
  // 🔵 Azul Cyan (#0284c7): ARRIVED (En Punto de Entrega / Listo para descarga)
  // 🟢 Verde (#22c55e): DELIVERED (Ya se entregó)
  // 🔴 Rojo (#ef4444): INCIDENT (Hubo incidencias)
  // 🟡 Amarillo (#eab308): PENDING / EN_ROUTE (Pendiente / En Camino)
  const getPinColor = (status: string) => {
    if (status === 'ARRIVED') return '#0284c7';   // Azul Cyan (Llegó a destino)
    if (status === 'DELIVERED') return '#22c55e'; // Verde (Entregado)
    if (status === 'INCIDENT') return '#ef4444';  // Rojo (Incidencia)
    return '#eab308';                             // Amarillo (Pendiente)
  };

  const getPinTextColor = (status: string) => {
    return '#ffffff';
  };

  // Acciones
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSelectStop = (stop: DeliveryStop) => {
    setSelectedStop(stop);
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

  // CONTROLES DE MAPA: Zoom +, Zoom -, Apuntar al Norte
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
  };

  const handleOrientNorth = () => {
    setCurrentRegion(SANTA_CRUZ_INITIAL_REGION);
    mapRef.current?.animateToRegion(SANTA_CRUZ_INITIAL_REGION, 400);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={{ gap: 12 }}>
      {/* 1. SELECTOR RÁPIDO DE PARADAS CON BADGE DE ESTADO */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
      >
        {stops.map((stop) => {
          const isSelected = selectedStop.id === stop.id;
          const pinColor = getPinColor(stop.status);

          return (
            <TouchableOpacity
              key={stop.id}
              activeOpacity={0.8}
              onPress={() => handleSelectStop(stop)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isSelected ? theme.colors.cardBackground : theme.colors.secondary,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                borderWidth: isSelected ? 2 : 1,
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 6,
                gap: 6,
                elevation: isSelected ? 2 : 0,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: pinColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', color: getPinTextColor(stop.status) }}>
                  #{stop.sequence}
                </Text>
              </View>
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: isSelected ? theme.colors.primary : theme.colors.foreground,
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                {stop.clientName.split(' - ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 2. CONTENEDOR DE GOOGLE MAPS NATUR / WEB */}
      <View
        style={{
          height: MAP_HEIGHT,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
          position: 'relative',
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
        }}
      >
        {isWeb ? (
          /* EMBED INTERACTIVO REAL DE GOOGLE MAPS PARA ENTORNO WEB CON CAPA DE PINS INTERACTIVOS */
          <View style={{ flex: 1, position: 'relative' }}>
            <iframe
              title="Google Maps Route Santa Cruz"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://maps.google.com/maps?q=${selectedStop ? SANTA_CRUZ_STOPS_COORDINATES[selectedStop.sequence]?.latitude || -17.778 : -17.778},${selectedStop ? SANTA_CRUZ_STOPS_COORDINATES[selectedStop.sequence]?.longitude || -63.18 : -63.18}&z=14&output=embed`}
            />

            {/* MARCADORES INTERACTIVOS SOBREPUESTOS EN WEB */}
            {stops.map((stop) => {
              const pos = WEB_PIN_PERCENTAGES[stop.sequence] || { left: 50, top: 50 };
              const isSelected = selectedStop.id === stop.id;
              const pinBg = getPinColor(stop.status);
              const pinTextColor = getPinTextColor(stop.status);

              return (
                <TouchableOpacity
                  key={stop.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedStop(stop)}
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
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: pinTextColor,
                        fontWeight: '900',
                        fontSize: isSelected ? 13 : 11,
                      }}
                    >
                      #{stop.sequence}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* NATIVE GOOGLE MAPS PROVIDER FOR MOBILE (ANDROID / IOS) */
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={SANTA_CRUZ_INITIAL_REGION}
            onRegionChangeComplete={setCurrentRegion}
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          >
            {/* RUTA CERRADA COMPLETA EN SANTA CRUZ */}
            <Polyline
              coordinates={SANTA_CRUZ_CLOSED_LOOP_POLYLINE}
              strokeColor="#94a3b8"
              strokeWidth={4}
              lineDashPattern={[6, 4]}
            />

            {/* TRAMO RECORRIDO ACTIVO */}
            <Polyline
              coordinates={SANTA_CRUZ_COMPLETED_SEGMENT}
              strokeColor="#2563eb"
              strokeWidth={5}
            />

            {/* CENTRO DE DISTRIBUCIÓN (PARQUE INDUSTRIAL) */}
            <Marker coordinate={SANTA_CRUZ_DEPOT} title="Centro de Distribución">
              <View
                style={{
                  backgroundColor: '#0f172a',
                  padding: 6,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: '#ffffff',
                  elevation: 5,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={16} color="#ffffff" />
              </View>
            </Marker>

            {/* MARCADORES INTERACTIVOS EN GOOGLE MAPS */}
            {stops.map((stop) => {
              const coords = SANTA_CRUZ_STOPS_COORDINATES[stop.sequence] || SANTA_CRUZ_DEPOT;
              const isSelected = selectedStop.id === stop.id;
              const pinBg = getPinColor(stop.status);
              const pinTextColor = getPinTextColor(stop.status);

              return (
                <Marker
                  key={stop.id}
                  coordinate={coords}
                  title={`#${stop.sequence} • ${stop.clientName}`}
                  description={stop.address}
                  onPress={() => setSelectedStop(stop)}
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
                      <Text
                        style={{
                          color: pinTextColor,
                          fontWeight: '900',
                          fontSize: isSelected ? 13 : 11,
                        }}
                      >
                        #{stop.sequence}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}

        {/* LEYENDA FLOTANTE COMPLETA DE GOOGLE MAPS CON LOS 4 ESTADOS */}
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: theme.colors.cardBackground,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            gap: 10,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#0284c7' }} />
            <Text variant="caption" style={{ fontSize: 10, fontWeight: '700', color: '#0284c7' }}>En Descarga</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e' }} />
            <Text variant="caption" style={{ fontSize: 10, fontWeight: '600' }}>Entregado</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#ef4444' }} />
            <Text variant="caption" style={{ fontSize: 10, fontWeight: '600' }}>Incidencia</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#eab308' }} />
            <Text variant="caption" style={{ fontSize: 10, fontWeight: '600' }}>Pendiente</Text>
          </View>
        </View>

        {/* BOTONES DE CONTROL DEL MAPA */}
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            gap: 6,
            zIndex: 99,
          }}
        >
          <TouchableOpacity
            onPress={handleOrientNorth}
            activeOpacity={0.8}
            style={{
              backgroundColor: theme.colors.cardBackground,
              width: 36,
              height: 36,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 4,
            }}
          >
            <Compass size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              elevation: 4,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={handleZoomIn}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Plus size={18} color={theme.colors.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleZoomOut}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 3. FLOATING PREVIEW CARD ENRIQUECIDA ACTUALIZADA INMEDIATAMENTE AL PRESIONAR CUALQUIER PARADA */}
      <View
        style={{
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: getPinColor(selectedStop.status),
          padding: 16,
          gap: 12,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }}
      >
        {/* ENCABEZADO CON SECUENCIA, CLIENTE Y BADGE DE ESTADO */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title" style={{ fontSize: 16, color: theme.colors.foreground }} numberOfLines={1}>
                {selectedStop.clientName}
              </Text>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                Punto de Entrega: <Text variant="label" style={{ fontSize: 11 }}>{selectedStop.deliveryPointId}</Text>
              </Text>
            </View>
          </View>

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
        </View>

        {/* DETALLES DE DIRECCIÓN Y CONTACTO DE LA PARADA SELECCIONADA */}
        <View style={{ gap: 6, backgroundColor: theme.colors.secondary, padding: 12, borderRadius: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <MapPin size={15} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <Text variant="bodySmall" style={{ color: theme.colors.foreground, flex: 1, fontSize: 13, lineHeight: 18 }}>
              {selectedStop.address}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Clock size={13} color={theme.colors.mutedForeground} />
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                Ventana: <Text variant="label" style={{ fontSize: 11 }}>{selectedStop.deliveryWindow}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <User size={13} color={theme.colors.mutedForeground} />
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                {selectedStop.contactName}
              </Text>
            </View>
          </View>
        </View>

        {/* MÉTRICAS DE CARGA Y MONTO NETO DE LA PARADA */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Package size={14} color={theme.colors.mutedForeground} />
            <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
              Carga Total: <Text variant="label" style={{ fontSize: 12 }}>{selectedStop.packagesCount}</Text>
            </Text>
          </View>

          <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
            Monto Neto: <Text variant="label" style={{ fontSize: 13, fontWeight: '700', color: theme.colors.foreground }}>{selectedStop.netTotal}</Text>
          </Text>
        </View>

        {selectedStop.notes && (
          <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11, fontStyle: 'italic' }}>
            {selectedStop.notes}
          </Text>
        )}

        {/* BOTONES DE ACCIÓN RÁPIDA: LLAMAR + VER PRODUCTOS A ENTREGAR */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <Button
            label="Llamar"
            icon={Phone}
            variant="outline"
            size="md"
            onPress={() => handleCall(selectedStop.contactPhone)}
          />

          <Button
            label="Ver Detalle de Parada"
            variant="primary"
            size="md"
            endIcon={ArrowRight}
            onPress={() => onSelectStopDetail(selectedStop)}
          />
        </View>
      </View>
    </View>
  );
}

// Custom Light Map JSON Style for Google Maps
const lightMapStyle = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
];

// Custom Dark Map JSON Style for Google Maps
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
