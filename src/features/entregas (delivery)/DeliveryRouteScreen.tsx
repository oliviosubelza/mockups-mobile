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
    status: 'DELIVERED',
    isCold: true,
    packagesCount: '180.5 kg • 0.6 m³',
    weightKg: 180.5,
    volumeM3: 0.6,
    totalUnits: 96,
    netTotal: 'Bs. 2,450.00',
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
    status: 'DELIVERED',
    isCold: false,
    packagesCount: '340.0 kg • 1.1 m³',
    weightKg: 340.0,
    volumeM3: 1.1,
    totalUnits: 180,
    netTotal: 'Bs. 5,120.00',
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
    status: 'INCIDENT',
    isCold: true,
    packagesCount: '520.0 kg • 1.8 m³',
    weightKg: 520.0,
    volumeM3: 1.8,
    totalUnits: 264,
    netTotal: 'Bs. 8,900.00',
    notes: 'Incidencia reportada en parada anterior.',
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
    status: 'ARRIVED',
    isCold: false,
    packagesCount: '210.0 kg • 0.7 m³',
    weightKg: 210.0,
    volumeM3: 0.7,
    totalUnits: 120,
    netTotal: 'Bs. 3,100.00',
    notes: 'Chofer en destino listo para descarga de carga.',
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
    netTotal: 'Bs. 1,850.00',
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
    netTotal: 'Bs. 4,200.00',
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
    return stops.find((s) => s.status === 'ARRIVED' || s.status === 'EN_ROUTE') || stops.find((s) => s.status === 'PENDING');
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

  const paradasFiltradas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return stops.filter((stop) => {
      const matchesSearch =
        !query ||
        stop.clientName.toLowerCase().includes(query) ||
        stop.address.toLowerCase().includes(query) ||
        stop.deliveryPointId.toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === 'todos' || stop.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [stops, searchQuery, selectedStatus]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenDetail = (stop: DeliveryStop) => {
    setSelectedStop(stop);
    const route = findRouteById('entregas.detalle');
    if (route) navigateTo(route);
  };

  const markArrived = (stopId: string) => {
    setStops((current) =>
      current.map((s) => (s.id === stopId ? { ...s, status: 'EN_ROUTE' as EstadoEntrega } : s)),
    );
    setDialogConfig({
      visible: true,
      title: 'Estado Actualizado',
      message: 'La parada ha sido marcada en camino exitosamente.',
      type: 'info',
    });
  };

  if (viewMode === 'mapa') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground, position: 'relative' }}>
        <RouteMapView
          stops={stops}
          onSelectStopDetail={handleOpenDetail}
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
      {/* BOTÓN VOLVER */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={20} color={theme.colors.foreground} />
        <Text variant="label" style={{ fontWeight: '600', color: theme.colors.foreground }}>
          Volver a Mis Entregas
        </Text>
      </TouchableOpacity>

      {/* HEADER DE RUTA */}
      <View
        style={{
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 14,
          gap: viewMode === 'mapa' ? 0 : 10,
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
                label={viewMode === 'mapa' ? `${stats.delivered}/${stats.total} (${stats.progressPercent}%)` : 'EN RUTA'}
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
                backgroundColor: viewMode === 'lista' ? theme.colors.cardBackground : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ListIcon
                size={15}
                color={viewMode === 'lista' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: viewMode === 'lista' ? theme.colors.primary : theme.colors.mutedForeground,
                  fontWeight: viewMode === 'lista' ? '700' : '500',
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
                backgroundColor: viewMode === 'mapa' ? theme.colors.cardBackground : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <MapIcon
                size={15}
                color={viewMode === 'mapa' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: viewMode === 'mapa' ? theme.colors.primary : theme.colors.mutedForeground,
                  fontWeight: viewMode === 'mapa' ? '700' : '500',
                }}
              >
                Mapa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'lista' && (
          <>
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
          </>
        )}
      </View>

      {/* MODO MAPA VS MODO LISTA */}
      {viewMode === 'mapa' ? (
        <RouteMapView stops={stops} onSelectStopDetail={handleOpenDetail} />
      ) : (
        <>
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

              <View style={{ gap: 4, backgroundColor: theme.colors.secondary, padding: 8, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} color={theme.colors.primary} />
                  <Text variant="caption" style={{ color: theme.colors.foreground, fontSize: 11, flex: 1 }} numberOfLines={1}>
                    {activeStop.address}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      {activeStop.deliveryWindow}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Weight size={12} color={theme.colors.mutedForeground} />
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Carga: {activeStop.packagesCount}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Button
                  label="Llamar"
                  icon={Phone}
                  variant="outline"
                  size="sm"
                  onPress={() => handleCall(activeStop.contactPhone)}
                />

                <Button
                  label={activeStop.status === 'EN_ROUTE' || activeStop.status === 'ARRIVED' ? 'Ver Detalle de Parada' : 'En Camino'}
                  variant="primary"
                  size="sm"
                  endIcon={ArrowRight}
                  onPress={() => {
                    if (activeStop.status !== 'EN_ROUTE' && activeStop.status !== 'ARRIVED') {
                      markArrived(activeStop.id);
                    } else {
                      handleOpenDetail(activeStop);
                    }
                  }}
                />
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
                          {stop.isCold && <Snowflake size={12} color={theme.colors.primary} />}
                        </View>

                        <Text variant="bodySmall" style={{ color: theme.colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>
                          {stop.address}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                          <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                            Carga: <Text variant="label" style={{ fontSize: 11 }}>{stop.packagesCount}</Text>
                          </Text>
                          <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                            Ventana: <Text variant="label" style={{ fontSize: 11 }}>{stop.deliveryWindow}</Text>
                          </Text>
                        </View>
                      </View>

                      <View style={{ marginLeft: 6 }}>
                        <ChevronRight size={20} color={theme.colors.mutedForeground} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

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
