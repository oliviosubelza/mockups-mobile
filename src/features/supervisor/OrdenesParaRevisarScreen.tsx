import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardCheck, AlertTriangle, ChevronRight, Truck, Clock, MapPin, Search } from 'lucide-react-native';

import { navigateTo, findRouteById } from '@/navigation/registry';
import { Badge, SearchField } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export interface SupervisorOrder {
  id: string;
  code: string;
  puntosCount: number;
  zonaRuta: string;
  driverName: string;
  time: string;
  status: 'PENDING_REVIEW';
  hasDiscrepancy: true;
  discrepancyCount: number;
  totalItems: number;
  isColdChain?: boolean;
}

// ÚNICAMENTE ÓRDENES CON DIFERENCIA PENDIENTES DE CONSOLIDACIÓN POR EL SUPERVISOR
const MOCK_SUPERVISOR_ORDERS: SupervisorOrder[] = [
  {
    id: 'sup-1',
    code: 'OT-4892',
    puntosCount: 6,
    zonaRuta: 'Ruta Norte • Santa Cruz',
    driverName: 'Cristhian Macchiavelli',
    time: 'Hoy, 14:20',
    status: 'PENDING_REVIEW',
    hasDiscrepancy: true,
    discrepancyCount: 2,
    totalItems: 8,
    isColdChain: true,
  },
  {
    id: 'sup-2',
    code: 'OT-5011',
    puntosCount: 4,
    zonaRuta: 'Ruta Equipetrol',
    driverName: 'Cristhian Macchiavelli',
    time: 'Hoy, 12:45',
    status: 'PENDING_REVIEW',
    hasDiscrepancy: true,
    discrepancyCount: 1,
    totalItems: 12,
    isColdChain: false,
  },
  {
    id: 'sup-3',
    code: 'OT-5109',
    puntosCount: 5,
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    driverName: 'Roberto Gómez',
    time: 'Hoy, 11:15',
    status: 'PENDING_REVIEW',
    hasDiscrepancy: true,
    discrepancyCount: 3,
    totalItems: 10,
    isColdChain: true,
  },
];

export default function OrdenesParaRevisarScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [activeFilter, setActiveFilter] = useState<'all' | 'cold' | 'standard'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = MOCK_SUPERVISOR_ORDERS.filter((order) => {
    const matchesSearch =
      order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.zonaRuta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.driverName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'cold') return order.isColdChain;
    if (activeFilter === 'standard') return !order.isColdChain;
    return true;
  });

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          gap: 16,
        }}
      >
        {/* BANNER INFORMATIVO PARA SUPERVISOR */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 14,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={20} color={theme.colors.primary} />
            <Text
              variant="label"
              style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
            >
              Consolidación de Revisiones con Diferencia
            </Text>
          </View>
          <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
            Se muestran únicamente las órdenes de transporte con diferencias de inventario detectadas en la revisión a ciegas que requieren tu consolidación y visto bueno.
          </Text>
        </View>

        {/* CAMPO DE BÚSQUEDA */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por orden, ruta o chofer..."
        />

        {/* FILTROS RÁPIDOS CON SCROLL HORIZONTAL */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ flexGrow: 0 }}
        >
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeFilter === 'all' ? theme.colors.danger : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeFilter === 'all' ? theme.colors.danger : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeFilter === 'all' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Todas con Diferencia ({MOCK_SUPERVISOR_ORDERS.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('cold')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeFilter === 'cold' ? theme.colors.primary : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeFilter === 'cold' ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeFilter === 'cold' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              ❄️ Cadena de Frío ({MOCK_SUPERVISOR_ORDERS.filter((o) => o.isColdChain).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('standard')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeFilter === 'standard' ? theme.colors.primary : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeFilter === 'standard' ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeFilter === 'standard' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Estándar ({MOCK_SUPERVISOR_ORDERS.filter((o) => !o.isColdChain).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* LISTADO DE ÓRDENES ÚNICAMENTE CON DIFERENCIA */}
        <View style={{ gap: 12 }}>
          {filteredOrders.map((order) => (
            <View
              key={order.id}
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 14,
                gap: 10,
              }}
            >
              {/* FILA SUPERIOR: CÓDIGO + BADGE DE DIFERENCIA */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    variant="label"
                    style={{ fontSize: 15, fontWeight: '800', color: theme.colors.foreground }}
                  >
                    {order.code}
                  </Text>
                  {order.isColdChain && (
                    <Badge label="❄️ Cadena de Frío" tone="neutral" emphasis="soft" size="sm" />
                  )}
                </View>

                <Badge
                  label={`${order.discrepancyCount} Diferencia(s)`}
                  tone="danger"
                  emphasis="soft"
                  size="md"
                />
              </View>

              {/* DETALLES DE PUNTOS DE ENTREGA EN RUTA */}
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color={theme.colors.primary} />
                  <Text
                    variant="subtitle"
                    numberOfLines={1}
                    style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                  >
                    {order.puntosCount} Puntos de entrega en ruta
                  </Text>
                </View>
                <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
                  Zona: {order.zonaRuta}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Truck size={14} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
                      Chofer: {order.driverName}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
                      {order.time}
                    </Text>
                  </View>
                </View>
              </View>

              {/* BARRA INFORMATIVA DE PRODUCTOS Y DIFERENCIA */}
              <View
                style={{
                  backgroundColor: theme.colors.dangerSoft,
                  borderRadius: 10,
                  padding: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
                  Total productos contados: <Text style={{ fontWeight: '700', color: theme.colors.foreground }}>{order.totalItems}</Text>
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={14} color={theme.colors.danger} />
                  <Text variant="caption" style={{ fontSize: 12, fontWeight: '700', color: theme.colors.danger }}>
                    Requiere consolidación
                  </Text>
                </View>
              </View>

              {/* BOTÓN DE ACCIÓN ROJO OUTLINE PARA ATENCIÓN INMEDIATA */}
              <TouchableOpacity
                onPress={() => {
                  const route = findRouteById('supervisor.consolidacion');
                  if (route) navigateTo(route);
                }}
                activeOpacity={0.8}
                style={{
                  backgroundColor: theme.colors.dangerSoft,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: theme.colors.danger,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text
                  style={{
                    color: theme.colors.danger,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  Revisar y Consolidar Conteo
                </Text>
                <ChevronRight size={16} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </Box>
  );
}
