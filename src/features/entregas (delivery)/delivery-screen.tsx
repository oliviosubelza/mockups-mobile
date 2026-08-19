import { useState, useMemo } from 'react';
import { ScrollView, View, TouchableOpacity, Modal } from 'react-native';
import {
  PackageOpen,
  CheckCircle2,
  ChevronRight,
  ListOrdered,
  Clock,
  Weight,
  PlayCircle,
  MapPin,
  XCircle,
  X,
  Truck,
  ShieldCheck,
} from 'lucide-react-native';

import { findRouteById, navigateTo } from '@/navigation/registry';
import { Badge, SearchField, AppDialog } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';
import { useDespachos } from '@/features/despachos/store';
import type { Despacho } from '@/features/despachos/types';

const INITIAL_DELIVERY_ORDERS: Despacho[] = [
  {
    id: 'ENT-98421',
    codigo: '98421',
    puntosCount: 6,
    zonaRuta: 'Ruta Equipetrol • San Martín',
    estado: 'finalizado',
    placa: '3721-KPZ',
    pesoAsignadoKg: 1250,
    capacidadPesoKg: 3500,
    volumenAsignadoM3: 4.2,
    capacidadVolumenM3: 18,
  },
  {
    id: 'ENT-1000450',
    codigo: '1000450',
    puntosCount: 4,
    zonaRuta: 'Ruta Cristo Redentor • Banzer',
    estado: 'finalizado',
    placa: '1184-HTR',
    pesoAsignadoKg: 890,
    capacidadPesoKg: 3500,
    volumenAsignadoM3: 2.8,
    capacidadVolumenM3: 18,
  },
  {
    id: 'ENT-1000451',
    codigo: '1000451',
    puntosCount: 5,
    zonaRuta: 'Ruta Villa 1ro de Mayo • Cumavi',
    estado: 'finalizado',
    placa: '2905-FDL',
    pesoAsignadoKg: 1640,
    capacidadPesoKg: 8000,
    volumenAsignadoM3: 5.1,
    capacidadVolumenM3: 30,
  },
];

export function DeliveryScreen() {
  const theme = useAppTheme();
  const despachos = useDespachos((state) => state.despachos);
  const anularDespacho = useDespachos((state) => state.anular);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Despacho | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // COMBINAR LAS 3 ÓRDENES INICIALES DE ENTREGAS CON LAS FINALIZADAS EN CONTEO A CIEGAS
  const ordenesAprobadas = useMemo(() => {
    const finalizadasDesdeConteo = despachos.filter((d) => d.estado === 'finalizado');
    const codigosExistentes = new Set(INITIAL_DELIVERY_ORDERS.map((d) => d.codigo));
    const nuevasFinalizadas = finalizadasDesdeConteo.filter((d) => !codigosExistentes.has(d.codigo));

    return [...INITIAL_DELIVERY_ORDERS, ...nuevasFinalizadas];
  }, [despachos]);

  // FILTRAR POR BÚSQUEDA
  const ordenesFiltradas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return ordenesAprobadas.filter(
      (d) =>
        !query ||
        d.codigo.toLowerCase().includes(query) ||
        d.zonaRuta.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query),
    );
  }, [ordenesAprobadas, searchQuery]);

  const handleSelectOrder = (order: Despacho) => {
    setSelectedOrder(order);
    setIsOptionsModalOpen(true);
  };

  const handleIniciarRuta = () => {
    setIsOptionsModalOpen(false);
    const route = findRouteById('entregas.ruta');
    if (route) navigateTo(route);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {/* HEADER DE LA PANTALLA */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              variant="header"
              style={{ fontSize: 20, fontWeight: '700', color: theme.colors.foreground }}
            >
              Mis Entregas
            </Text>
            <Badge label="Solo Aprobadas" tone="success" size="sm" icon={ShieldCheck} />
          </View>
          <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
            Órdenes de transporte finalizadas y listas para entrega.
          </Text>
        </View>

        {/* BUSCADOR */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por OT, ID o Cliente..."
        />

        {/* CONTEO DE RESULTADOS */}
        <View style={{ paddingHorizontal: 2 }}>
          <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
            {ordenesFiltradas.length === 1
              ? '1 orden de transporte aprobada'
              : `${ordenesFiltradas.length} órdenes de transporte aprobadas`}
          </Text>
        </View>

        {/* LISTA COMPACTA ESTILO LIST TILE */}
        {ordenesFiltradas.length === 0 ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 50,
              gap: 12,
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <PackageOpen color={theme.colors.mutedForeground} size={56} />
            <Text
              variant="label"
              style={{ color: theme.colors.mutedForeground, textAlign: 'center', fontSize: 15 }}
            >
              {searchQuery
                ? `No se encontraron órdenes para "${searchQuery}"`
                : 'No hay órdenes de transporte aprobadas actualmente'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {ordenesFiltradas.map((despacho, index) => (
              <TouchableOpacity
                key={despacho.id}
                activeOpacity={0.7}
                onPress={() => handleSelectOrder(despacho)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.cardBackground,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                {/* LEADING: Secuencia badge */}
                <View
                  style={{
                    backgroundColor: theme.colors.successSoft,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Text
                    variant="label"
                    style={{
                      fontWeight: '700',
                      color: theme.colors.success,
                      fontSize: 14,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>

                {/* BODY: Información compacta */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      variant="label"
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: theme.colors.foreground,
                      }}
                    >
                      OT-{despacho.codigo}
                    </Text>
                    <Badge label="Aprobado" tone="success" size="sm" icon={CheckCircle2} />
                  </View>

                  <Text
                    variant="label"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                    numberOfLines={1}
                  >
                    📍 {despacho.puntosCount} Puntos de entrega ({despacho.zonaRuta}) • ID: {despacho.id}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <ListOrdered color={theme.colors.mutedForeground} size={12} />
                      <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                        {despacho.puntosCount} paradas
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Clock color={theme.colors.mutedForeground} size={12} />
                      <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                        07:30 hs
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Weight color={theme.colors.mutedForeground} size={12} />
                      <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                        1,250 kg
                      </Text>
                    </View>
                  </View>
                </View>

                {/* TRAILING */}
                <View style={{ marginLeft: 8 }}>
                  <ChevronRight color={theme.colors.mutedForeground} size={20} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* DIÁLOGO / MODAL CON ÚNICA OPCIÓN: INICIAR RUTA */}
      <Modal
        visible={isOptionsModalOpen}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setIsOptionsModalOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsOptionsModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          {/* TARJETA DEL MODAL */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={{
              width: '100%',
              maxWidth: 390,
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 20,
              gap: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 8,
              position: 'relative',
            }}
          >
            {/* BOTÓN X DE CIERRE: POSICIONAMIENTO ABSOLUTO SEGURO DENTRO DE LA TARJETA */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsOptionsModalOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.mutedBackground,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
              }}
            >
              <X size={18} color={theme.colors.mutedForeground} />
            </TouchableOpacity>

            {/* ENCABEZADO DEL DIÁLOGO */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingRight: 40,
                width: '100%',
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Truck size={22} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  variant="label"
                  style={{ fontSize: 16, fontWeight: '700', color: theme.colors.foreground }}
                  numberOfLines={1}
                >
                  OT-{selectedOrder?.codigo}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 12 }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  📍 {selectedOrder?.puntosCount} Puntos • {selectedOrder?.zonaRuta}
                </Text>
              </View>
            </View>

            <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 13, lineHeight: 18 }}>
              Presiona la opción para iniciar el recorrido de esta orden de transporte:
            </Text>

            {/* ÚNICA OPCIÓN DEL DIÁLOGO: INICIAR RUTA */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleIniciarRuta}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.primarySoft,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: theme.colors.primary,
                gap: 12,
              }}
            >
              <PlayCircle size={26} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ fontSize: 16, fontWeight: '700', color: theme.colors.primary }}>
                  Iniciar Ruta
                </Text>
                <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 }}>
                  Ver el mapa en tiempo real, paradas y hoja de ruta oficial.
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MENSAJE FLOTANTE DE ANULACIÓN / INFORMACIÓN */}
      <AppDialog
        visible={toastConfig.visible}
        title={toastConfig.title}
        message={toastConfig.message}
        type="warning"
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
