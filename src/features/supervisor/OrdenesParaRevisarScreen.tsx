import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
  Truck,
  MapPin,
} from 'lucide-react-native';

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
  hasDiscrepancy: boolean;
  discrepancyCount: number;
  shortageCount: number; // Cantidad de ítems con faltante
  surplusCount: number; // Cantidad de ítems con sobrante
  totalItems: number;
  isColdChain?: boolean;
}

// ÓRDENES PARA REVISAR (CONTENIENDO FALTANTES Y SOBRANTES SIMULTÁNEAMENTE)
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
    shortageCount: 1, // 1 Faltante (Salsa Ketchup)
    surplusCount: 1, // 1 Sobrante (Salsa Mayonesa)
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
    shortageCount: 1, // 1 Faltante (Harina de Trigo)
    surplusCount: 0,
    totalItems: 12,
    isColdChain: false,
  },
  {
    id: 'sup-3',
    code: 'OT-5109',
    puntosCount: 5,
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    driverName: 'Roberto Gómez',
    time: 'Ayer, 11:15',
    status: 'PENDING_REVIEW',
    hasDiscrepancy: true,
    discrepancyCount: 3,
    shortageCount: 2, // 2 Faltantes (Salsa Ketchup + Levadura)
    surplusCount: 1, // 1 Sobrante (Queso)
    totalItems: 10,
    isColdChain: true,
  },
];

export default function OrdenesParaRevisarScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [activeFilter, setActiveFilter] = useState<'all' | 'shortage' | 'surplus' | 'cold'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = MOCK_SUPERVISOR_ORDERS.filter((order) => {
    const matchesSearch =
      order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.zonaRuta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.driverName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'shortage') return order.shortageCount > 0;
    if (activeFilter === 'surplus') return order.surplusCount > 0;
    if (activeFilter === 'cold') return order.isColdChain;
    return true;
  });

  const totalShortageOrders = MOCK_SUPERVISOR_ORDERS.filter((o) => o.shortageCount > 0).length;
  const totalSurplusOrders = MOCK_SUPERVISOR_ORDERS.filter((o) => o.surplusCount > 0).length;
  const totalColdOrders = MOCK_SUPERVISOR_ORDERS.filter((o) => o.isColdChain).length;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          gap: 14,
        }}
      >
        {/* BANNER INFORMATIVO COMPACTO */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={18} color={theme.colors.primary} />
            <Text
              variant="label"
              style={{ fontSize: 13, fontWeight: '700', color: theme.colors.foreground, flex: 1 }}
              numberOfLines={1}
            >
              Consolidación de Revisiones
            </Text>
          </View>
          <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
            Órdenes de transporte con diferencias (faltantes y sobrantes) pendientes de tu visto bueno.
          </Text>
        </View>

        {/* CAMPO DE BÚSQUEDA */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar orden, ruta o chofer..."
        />

        {/* FILTROS RÁPIDOS (SIN CALENDARIO) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ flexGrow: 0 }}
        >
          {/* CHIP 1: TODAS CON DIFERENCIA */}
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeFilter === 'all' ? theme.colors.primary : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeFilter === 'all' ? theme.colors.primary : theme.colors.border,
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

          {/* CHIP 2: CON FALTANTES */}
          <TouchableOpacity
            onPress={() => setActiveFilter('shortage')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeFilter === 'shortage' ? theme.colors.danger : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeFilter === 'shortage' ? theme.colors.danger : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeFilter === 'shortage' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              🔴 Con Faltantes ({totalShortageOrders})
            </Text>
          </TouchableOpacity>

          {/* CHIP 3: CON SOBRANTES */}
          <TouchableOpacity
            onPress={() => setActiveFilter('surplus')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeFilter === 'surplus' ? theme.colors.warning : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeFilter === 'surplus' ? theme.colors.warning : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeFilter === 'surplus' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              🟡 Con Sobrantes ({totalSurplusOrders})
            </Text>
          </TouchableOpacity>

          {/* CHIP 4: CADENA DE FRÍO */}
          <TouchableOpacity
            onPress={() => setActiveFilter('cold')}
            style={{
              paddingHorizontal: 13,
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
              ❄️ Cadena de Frío ({totalColdOrders})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* LISTADO DE ÓRDENES CON SOBRANTES Y FALTANTES */}
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
              {/* FILA SUPERIOR: CÓDIGO + BADGES DE DIFERENCIAS (FALTANTE Y/O SOBRANTE) */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                  <Text
                    variant="label"
                    style={{ fontSize: 15, fontWeight: '800', color: theme.colors.foreground }}
                  >
                    {order.code}
                  </Text>
                  {order.isColdChain && (
                    <Badge label="❄️ Frío" tone="neutral" emphasis="soft" size="sm" />
                  )}
                </View>

                {/* BADGES SEPARADOS PARA FALTANTES Y SOBRANTES EN LA MISMA ORDEN */}
                <View style={{ flexDirection: 'row', gap: 4, flexShrink: 0 }}>
                  {order.shortageCount > 0 && (
                    <Badge
                      label={`${order.shortageCount} Faltante${order.shortageCount > 1 ? 's' : ''}`}
                      tone="danger"
                      emphasis="soft"
                      size="sm"
                    />
                  )}
                  {order.surplusCount > 0 && (
                    <Badge
                      label={`+${order.surplusCount} Sobrante${order.surplusCount > 1 ? 's' : ''}`}
                      tone="warning"
                      emphasis="soft"
                      size="sm"
                    />
                  )}
                </View>
              </View>

              {/* DETALLES DE LOGÍSTICA Y PUNTOS DE ENTREGA */}
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color={theme.colors.primary} />
                  <Text
                    variant="subtitle"
                    numberOfLines={1}
                    style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground, flex: 1 }}
                  >
                    {order.puntosCount} Puntos de entrega
                  </Text>
                </View>

                {/* LOGÍSTICA: CHOFER Y RUTA EN FILAS SEPARADAS */}
                <View
                  style={{
                    backgroundColor: theme.colors.secondary,
                    borderRadius: 8,
                    padding: 8,
                    gap: 3,
                    marginTop: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Truck size={13} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.foreground }}>
                      Chofer: {order.driverName}
                    </Text>
                  </View>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground, marginLeft: 19 }}>
                    Ruta: {order.zonaRuta} • {order.time}
                  </Text>
                </View>
              </View>

              {/* RESUMEN DE DIFERENCIA (DESGLOSE DE FALTANTE Y SOBRANTE) */}
              <View
                style={{
                  backgroundColor: theme.colors.dangerSoft,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={{ fontSize: 12, color: theme.colors.foreground, flexShrink: 1, fontWeight: '600' }}
                >
                  {order.shortageCount > 0 && order.surplusCount > 0
                    ? `Diferencias: ${order.shortageCount} Faltante • ${order.surplusCount} Sobrante`
                    : order.shortageCount > 0
                    ? `Diferencias: ${order.shortageCount} Faltante`
                    : `Diferencias: ${order.surplusCount} Sobrante`}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <AlertTriangle size={13} color={theme.colors.danger} />
                  <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.danger }}>
                    Por Consolidar
                  </Text>
                </View>
              </View>

              {/* BOTÓN DE ACCIÓN ROJO OUTLINE */}
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
