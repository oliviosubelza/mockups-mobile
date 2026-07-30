import { useState, useMemo } from 'react';
import { ScrollView, View, TouchableOpacity, Linking } from 'react-native';
import {
  Truck,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  User,
  Weight,
  Snowflake,
  ArrowRight,
  Map as MapIcon,
  List as ListIcon,
  Store,
  ArrowLeft,
  ClipboardList,
} from 'lucide-react-native';

import { router } from 'expo-router';
import { findRouteById, navigateTo } from '@/navigation/registry';
import { Badge, Button, SearchField, FilterChips, AppDialog, type FilterChipOption, type DialogType } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';
import { RouteMapView } from './components/RouteMapView';
import { setSelectedStop } from './data/delivery-store';
import type { ActiveTrip, DeliveryStop, EstadoEntrega } from './types';

const INITIAL_TRIP: ActiveTrip = {
  id: 'TRIP-8842',
  transportOrderCode: 'OT-98421',
  truckCode: 'VOLVO FE-092',
  truckPlate: 'ABC-1234',
  driverName: 'Gino Baptista',
  helperName: 'Carlos Pérez',
  status: 'EN_RUTA',
  assignedWeightKg: 1250.5,
  assignedVolumeM3: 4.2,
  departureTime: '07:30 hs',
};

const INITIAL_STOPS: DeliveryStop[] = [
  {
    id: 'DEL-101',
    sequence: 1,
    clientName: 'Hipermaxi - Equipetrol Norte',
    deliveryPointId: 'DP-4401',
    address: 'Av. San Martín #1420, Equipetrol Norte',
    contactName: 'Lic. Roberto Gómez (Almacén Alimentos)',
    contactPhone: '+591 71234567',
    deliveryWindow: '08:00 - 09:30 hs',
    status: 'EN_ROUTE',
    isCold: true,
    packagesCount: '180.5 kg • 0.6 m³',
    weightKg: 180.5,
    volumeM3: 0.6,
    totalUnits: 96,
    netTotal: 'Bs. 5,030.00',
    notes: 'Recibe en rampa de frío con sello.',
    latitude: -17.768,
    longitude: -63.195,
  },
  {
    id: 'DEL-102',
    sequence: 2,
    clientName: 'Supermercados IC Norte - Banzer',
    deliveryPointId: 'DP-4402',
    address: 'Av. Cristo Redentor y 3er Anillo Norte',
    contactName: 'Marcos Vargas (Recepción Abarrotes)',
    contactPhone: '+591 72345678',
    deliveryWindow: '09:30 - 11:00 hs',
    status: 'PENDING',
    isCold: false,
    packagesCount: '340.0 kg • 1.1 m³',
    weightKg: 340.0,
    volumeM3: 1.1,
    totalUnits: 180,
    netTotal: 'Bs. 3,450.00',
    notes: 'Descarga por rampa trasera de proveedores.',
    latitude: -17.752,
    longitude: -63.181,
  },
  {
    id: 'DEL-103',
    sequence: 3,
    clientName: 'Mercado Abasto Norte - Hortalizas',
    deliveryPointId: 'DP-4403',
    address: 'Av. Cristo Redentor y 5to Anillo Norte',
    contactName: 'Ing. Fernando Roca',
    contactPhone: '+591 73456789',
    deliveryWindow: '11:00 - 12:30 hs',
    status: 'PENDING',
    isCold: true,
    packagesCount: '520.0 kg • 1.8 m³',
    weightKg: 520.0,
    volumeM3: 1.8,
    totalUnits: 264,
    netTotal: 'Bs. 9,800.00',
    notes: 'Revisar temperatura de bultos al entregar.',
    latitude: -17.792,
    longitude: -63.184,
  },
  {
    id: 'DEL-104',
    sequence: 4,
    clientName: 'Mercado Mutualista - Sector Alimentos',
    deliveryPointId: 'DP-4404',
    address: 'Av. Mutualista y 3er Anillo Este',
    contactName: 'Lucía Fernández',
    contactPhone: '+591 74567890',
    deliveryWindow: '13:00 - 14:30 hs',
    status: 'PENDING',
    isCold: false,
    packagesCount: '210.0 kg • 0.7 m³',
    weightKg: 210.0,
    volumeM3: 0.7,
    totalUnits: 120,
    netTotal: 'Bs. 2,150.00',
    notes: 'Ingreso por portón lateral de carga.',
    latitude: -17.805,
    longitude: -63.201,
  },
  {
    id: 'DEL-105',
    sequence: 5,
    clientName: 'Micromarket Fidalga - 4to Anillo',
    deliveryPointId: 'DP-4405',
    address: 'Av. Banzer esquina 4to Anillo Norte',
    contactName: 'Gonzalo Morales',
    contactPhone: '+591 75678901',
    deliveryWindow: '15:00 - 16:30 hs',
    status: 'PENDING',
    isCold: true,
    packagesCount: '95.0 kg • 0.3 m³',
    weightKg: 95.0,
    volumeM3: 0.3,
    totalUnits: 60,
    netTotal: 'Bs. 1,680.00',
    notes: 'Ingreso por parqueo de clientes.',
    latitude: -17.741,
    longitude: -63.17,
  },
  {
    id: 'DEL-106',
    sequence: 6,
    clientName: 'Hipermaxi - Villa 1ro de Mayo',
    deliveryPointId: 'DP-4406',
    address: 'Av. Cumavi #5200, 3er Anillo Este',
    contactName: 'Dra. Patricia Silva',
    contactPhone: '+591 76789012',
    deliveryWindow: '16:30 - 17:30 hs',
    status: 'PENDING',
    isCold: false,
    packagesCount: '310.0 kg • 0.9 m³',
    weightKg: 310.0,
    volumeM3: 0.9,
    totalUnits: 168,
    netTotal: 'Bs. 7,320.00',
    notes: 'Recepción hasta las 17:30 imprevistos.',
    latitude: -17.789,
    longitude: -63.138,
  },
];

export function DeliveryRouteScreen() {
  const theme = useAppTheme();
  const [trip] = useState<ActiveTrip>(INITIAL_TRIP);
  const [stops, setStops] = useState<DeliveryStop[]>(INITIAL_STOPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'todos' | EstadoEntrega>('todos');
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista');

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const stats = useMemo(() => {
    const total = stops.length;
    const delivered = stops.filter((s) => s.status === 'DELIVERED').length;
    const incidents = stops.filter((s) => s.status === 'INCIDENT').length;
    const pending = stops.filter((s) => s.status === 'PENDING' || s.status === 'EN_ROUTE' || s.status === 'ARRIVED').length;
    const progressPercent = total > 0 ? Math.round((delivered / total) * 100) : 0;

    return { total, delivered, incidents, pending, progressPercent };
  }, [stops]);

  const activeStop = useMemo(() => {
    return (
      stops.find((s) => s.status === 'ARRIVED') ||
      stops.find((s) => s.status === 'EN_ROUTE') ||
      stops.find((s) => s.status === 'PENDING') ||
      stops.find((s) => s.status === 'INCIDENT') ||
      stops[0]
    );
  }, [stops]);

  const filterOptions: FilterChipOption<'todos' | EstadoEntrega>[] = useMemo(
    () => [
      { id: 'todos', label: `Todas (${stats.total})` },
      { id: 'ARRIVED', label: 'En Descarga' },
      { id: 'PENDING', label: `Pendientes (${stats.pending})` },
      { id: 'DELIVERED', label: `Entregadas (${stats.delivered})` },
      { id: 'INCIDENT', label: `Incidencias (${stats.incidents})` },
    ],
    [stats],
  );

  // FILTRADO Y ORDENADO: La parada activa (la que toca) SIEMPRE VA AL PRINCIPIO
  const paradasFiltradas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = stops.filter((stop) => {
      const matchesSearch =
        !query ||
        stop.clientName.toLowerCase().includes(query) ||
        stop.address.toLowerCase().includes(query) ||
        stop.deliveryPointId.toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === 'todos' || stop.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    if (!activeStop) return filtered;

    // PIN DE LA PARADA ACTIVA AL INICIO DE LA LISTA
    return [...filtered].sort((a, b) => {
      if (a.id === activeStop.id) return -1;
      if (b.id === activeStop.id) return 1;
      return a.sequence - b.sequence;
    });
  }, [stops, searchQuery, selectedStatus, activeStop]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenDetail = (stop: DeliveryStop) => {
    setSelectedStop(stop);
    const route = findRouteById('entregas.detalle');
    if (route) navigateTo(route);
  };

  const handleRegistrarVisita = (stop: DeliveryStop) => {
    setSelectedStop(stop);
    const route = findRouteById('entregas.registrarVisita');
    if (route) navigateTo(route);
  };

  // 1. INICIAR VIAJE (EN_ROUTE)
  const handleStartEnRoute = (stopId: string) => {
    setStops((current) =>
      current.map((s) => (s.id === stopId ? { ...s, status: 'EN_ROUTE' as EstadoEntrega } : s)),
    );
    const target = stops.find((s) => s.id === stopId);
    setDialogConfig({
      visible: true,
      title: '🚚 Parada En Camino',
      message: `Te estás desplazando hacia la Parada #${target?.sequence || ''}: ${target?.clientName || ''}.`,
      type: 'info',
    });
  };

  // 2. MARCAR LLEGADA EN SITIO (ARRIVED)
  const handleMarkArrived = (stopId: string) => {
    setStops((current) =>
      current.map((s) => (s.id === stopId ? { ...s, status: 'ARRIVED' as EstadoEntrega } : s)),
    );
    const target = stops.find((s) => s.id === stopId);
    setDialogConfig({
      visible: true,
      title: '🏬 Llegada Confirmada',
      message: `Has llegado al destino de ${target?.clientName || ''}. Listo para descarga y cobro.`,
      type: 'info',
    });
  };

  // 3. FINALIZAR ENTREGA (DELIVERED) Y AVANZAR AUTOMÁTICAMENTE A LA SIGUIENTE PARADA
  const handleMarkDelivered = (stopId: string) => {
    let nextStopSeq: number | null = null;
    let nextStopName: string = '';

    setStops((current) => {
      const currentStop = current.find((s) => s.id === stopId);
      const nextSeq = currentStop ? currentStop.sequence + 1 : null;

      return current.map((s) => {
        if (s.id === stopId) {
          return { ...s, status: 'DELIVERED' as EstadoEntrega };
        }
        if (nextSeq && s.sequence === nextSeq && s.status === 'PENDING') {
          nextStopSeq = s.sequence;
          nextStopName = s.clientName;
          return { ...s, status: 'EN_ROUTE' as EstadoEntrega };
        }
        return s;
      });
    });

    setDialogConfig({
      visible: true,
      title: '✅ Entrega Completada',
      message: nextStopSeq
        ? `¡Parada completada! Avanzando automáticamente a la Parada #${nextStopSeq}: ${nextStopName}.`
        : '¡Felicidades! Has completado todas las paradas de la hoja de ruta.',
      type: 'info',
    });
  };

  if (viewMode === 'mapa') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground, position: 'relative' }}>
        <RouteMapView
          stops={stops}
          onSelectStopDetail={handleOpenDetail}
          onRegistrarVisita={handleRegistrarVisita}
          tripCode={trip.transportOrderCode}
          statsLabel={`${stats.delivered}/${stats.total} (${stats.progressPercent}%)`}
          onSwitchToLista={() => setViewMode('lista')}
          onBack={() => router.back()}
        />
        <AppDialog
          visible={dialogConfig.visible}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          onClose={() => setDialogConfig((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
    >
      {/* HEADER DE RUTA */}
      <View
        style={{
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 14,
          gap: 10,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}>
            <Text variant="caption" style={{ color: theme.colors.mutedForeground, letterSpacing: 0.5 }}>
              HOJA DE RUTA ACTIVA
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="header" style={{ color: theme.colors.foreground, fontSize: 20 }}>
                {trip.transportOrderCode}
              </Text>
              <Badge
                label="EN RUTA"
                tone="primary"
                emphasis="soft"
                size="sm"
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.secondary,
              borderRadius: 10,
              padding: 3,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setViewMode('lista')}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: theme.colors.cardBackground,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                elevation: 1,
              }}
            >
              <ListIcon
                size={15}
                color={theme.colors.primary}
              />
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: theme.colors.primary,
                  fontWeight: '700',
                }}
              >
                Lista
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('mapa')}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <MapIcon
                size={15}
                color={theme.colors.mutedForeground}
              />
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: theme.colors.mutedForeground,
                  fontWeight: '500',
                }}
              >
                Mapa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Truck size={14} color={theme.colors.mutedForeground} />
            <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
              {trip.truckCode} ({trip.truckPlate})
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <User size={14} color={theme.colors.mutedForeground} />
            <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
              {trip.driverName}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Weight size={14} color={theme.colors.mutedForeground} />
            <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }}>
              {trip.assignedWeightKg} kg • {trip.assignedVolumeM3} m³
            </Text>
          </View>
        </View>

        <View style={{ gap: 6, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
              Progreso de la Ruta: <Text variant="label" style={{ color: theme.colors.foreground }}>{stats.delivered} de {stats.total} Paradas</Text>
            </Text>
            <Text variant="label" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {stats.progressPercent}%
            </Text>
          </View>
          <View
            style={{
              height: 7,
              backgroundColor: theme.colors.secondary,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${stats.progressPercent}%`,
                height: '100%',
                backgroundColor: theme.colors.primary,
                borderRadius: 4,
              }}
            />
          </View>
        </View>
      </View>

      {/* VISTA EN MODO LISTA */}
      {activeStop && (
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: theme.colors.primary,
                padding: 12,
                gap: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 11 }}>
                      #{activeStop.sequence}
                    </Text>
                  </View>
                  <Text variant="title" style={{ fontSize: 15, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {activeStop.clientName}
                  </Text>
                  {activeStop.isCold && <Badge label="Frío" tone="primary" emphasis="soft" size="sm" />}
                </View>
              </View>

              <View style={{ gap: 6, backgroundColor: theme.colors.secondary, padding: 8, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} color={theme.colors.primary} />
                  <Text variant="caption" style={{ color: theme.colors.foreground, fontSize: 11, flex: 1 }} numberOfLines={1}>
                    {activeStop.address}
                  </Text>
                </View>

                <View style={{ gap: 3, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Weight size={12} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Carga: <Text variant="label" style={{ fontSize: 11 }}>{activeStop.packagesCount}</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Ventana horaria: <Text variant="label" style={{ fontSize: 11 }}>{activeStop.deliveryWindow}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* ÚNICAMENTE LAS 2 OPCIONES: LLAMAR AL CLIENTE Y VER DETALLE DE LA ENTREGA */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Llamar al cliente"
                    icon={Phone}
                    variant="outline"
                    size="sm"
                    fullWidth
                    onPress={() => handleCall(activeStop.contactPhone)}
                  />
                </View>

                <View style={{ flex: 1.2 }}>
                  <Button
                    label="Ver detalle de la entrega"
                    variant="primary"
                    size="sm"
                    fullWidth
                    endIcon={ArrowRight}
                    onPress={() => handleOpenDetail(activeStop)}
                  />
                </View>
              </View>
            </View>
          )}

          <View style={{ gap: 10, marginTop: 4 }}>
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar cliente, código o dirección..."
            />

            <FilterChips
              options={filterOptions}
              selectedId={selectedStatus}
              onSelect={(id) => setSelectedStatus(id)}
            />
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="title" style={{ fontSize: 16 }}>
                Paradas en Hoja de Ruta ({paradasFiltradas.length})
              </Text>
            </View>

            {paradasFiltradas.length === 0 ? (
              <View style={{ backgroundColor: theme.colors.cardBackground, borderRadius: 14, padding: 24, alignItems: 'center' }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                  No se encontraron paradas con los criterios ingresados.
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: theme.colors.cardBackground, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>
                {paradasFiltradas.map((stop, index) => {
                  const isLast = index === paradasFiltradas.length - 1;
                  const isActive = activeStop?.id === stop.id;

                  let statusBg = theme.colors.secondary;
                  let statusIcon = <Clock size={16} color={theme.colors.mutedForeground} />;

                  if (stop.status === 'ARRIVED') {
                    statusBg = '#e0f2fe';
                    statusIcon = <Store size={17} color="#0284c7" />;
                  } else if (stop.status === 'DELIVERED') {
                    statusBg = theme.colors.successSoft;
                    statusIcon = <CheckCircle2 size={17} color={theme.colors.success} />;
                  } else if (stop.status === 'EN_ROUTE') {
                    statusBg = theme.colors.primarySoft;
                    statusIcon = <Truck size={17} color={theme.colors.primary} />;
                  } else if (stop.status === 'INCIDENT') {
                    statusBg = theme.colors.dangerSoft;
                    statusIcon = <AlertTriangle size={17} color={theme.colors.danger} />;
                  }

                  return (
                    <TouchableOpacity
                      key={stop.id}
                      activeOpacity={0.7}
                      onPress={() => handleOpenDetail(stop)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.colors.cardBackground,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: theme.colors.border,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: statusBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        {statusIcon}
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text variant="label" style={{ fontSize: 13, color: theme.colors.mutedForeground }}>
                            #{stop.sequence}
                          </Text>
                          <Text
                            variant="label"
                            style={{ fontSize: 14, color: theme.colors.foreground, fontWeight: '700', flex: 1 }}
                            numberOfLines={1}
                          >
                            {stop.clientName}
                          </Text>
                          {isActive && <Badge label="Siguiente Parada" tone="primary" emphasis="soft" size="sm" />}
                          {stop.isCold && <Snowflake size={12} color={theme.colors.primary} />}
                        </View>

                        <Text variant="bodySmall" style={{ color: theme.colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
                          {stop.address}
                        </Text>

                        <View style={{ gap: 2, marginTop: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Weight size={11} color={theme.colors.mutedForeground} />
                            <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                              Carga: <Text variant="label" style={{ fontSize: 11 }}>{stop.packagesCount}</Text>
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} color={theme.colors.mutedForeground} />
                            <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                              Ventana horaria: <Text variant="label" style={{ fontSize: 11 }}>{stop.deliveryWindow}</Text>
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* TRAILING: ÚNICAMENTE LA FLECHA DERECHA */}
                      <View style={{ marginLeft: 8 }}>
                        <ChevronRight size={20} color={theme.colors.mutedForeground} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

      <AppDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onClose={() => setDialogConfig((prev) => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
}
