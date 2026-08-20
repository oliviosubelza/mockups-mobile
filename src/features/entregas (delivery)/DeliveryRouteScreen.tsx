import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Snowflake,
  Store,
  Truck,
  User,
  Weight,
  FileSignature,
  Eye,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { findRouteById, navigateTo } from "@/navigation/registry";
import {
  AppDialog,
  Badge,
  Button,
  FilterChips,
  SearchField,
  getSignatureViewBox,
  SIGNATURE_PAPER_COLOR,
  SIGNATURE_INK_COLOR,
  type DialogType,
  type FilterChipOption,
} from "@/shared/ui";

import { Text, useAppTheme } from "@/theme";
import { router } from "expo-router";
import { RouteMapView } from "./components/RouteMapView";
import {
  setSelectedStop,
  useDeliveryStore
} from "./data/delivery-store";
import { SANTA_CRUZ_STOPS_COORDINATES } from "./data/santa-cruz-route";
import type { ActiveTrip, DeliveryStop, EstadoEntrega } from "./types";

const INITIAL_TRIP: ActiveTrip = {
  id: "TRIP-8842",
  transportOrderCode: "OT-98421",
  truckCode: "VOLVO FE-092",
  truckPlate: "ABC-1234",
  driverName: "Gino Baptista",
  helperName: "Carlos Pérez",
  status: "EN_RUTA",
  assignedWeightKg: 1250.5,
  assignedVolumeM3: 4.2,
  departureTime: "07:30 hs",
};



export function DeliveryRouteScreen() {
  const theme = useAppTheme();
  const [trip] = useState<ActiveTrip>(INITIAL_TRIP);
  const { stops, updateStopStatus: updateStoreStatus } = useDeliveryStore();
  const startRouteSignature = useDeliveryStore((state) => state.startRouteSignature);
  const [isSignaturePreviewOpen, setIsSignaturePreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"todos" | EstadoEntrega>(
    "todos",
  );
  const [viewMode, setViewMode] = useState<"lista" | "mapa">("lista");

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const stats = useMemo(() => {
    const total = stops.length;
    const delivered = stops.filter((s) => s.status === "DELIVERED").length;
    const incidents = stops.filter((s) => s.status === "INCIDENT").length;
    const pending = stops.filter(
      (s) =>
        s.status === "PENDING" ||
        s.status === "EN_ROUTE" ||
        s.status === "ARRIVED",
    ).length;
    const progressPercent =
      total > 0 ? Math.round((delivered / total) * 100) : 0;

    return { total, delivered, incidents, pending, progressPercent };
  }, [stops]);

  const activeStop = useMemo(() => {
    return (
      stops.find((s) => s.status === "ARRIVED") ||
      stops.find((s) => s.status === "EN_ROUTE") ||
      stops.find((s) => s.status === "PENDING") ||
      stops.find((s) => s.status === "INCIDENT") ||
      stops[0]
    );
  }, [stops]);

  const filterOptions: FilterChipOption<"todos" | EstadoEntrega>[] = useMemo(
    () => [
      { id: "todos", label: `Todas (${stats.total})` },
      { id: "ARRIVED", label: "En Descarga" },
      { id: "PENDING", label: `Pendientes (${stats.pending})` },
      { id: "DELIVERED", label: `Entregadas (${stats.delivered})` },
      { id: "INCIDENT", label: `Incidencias (${stats.incidents})` },
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
        selectedStatus === "todos" || stop.status === selectedStatus;

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

  const handleOpenGoogleMaps = (stop: DeliveryStop) => {
    const coords = SANTA_CRUZ_STOPS_COORDINATES[stop.sequence];
    const lat = coords?.latitude ?? stop.latitude ?? -17.783;
    const lng = coords?.longitude ?? stop.longitude ?? -63.182;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleOpenDetail = (stop: DeliveryStop) => {
    if (stop.status !== "ARRIVED" && stop.status !== "DELIVERED") {
      setDialogConfig({
        visible: true,
        title: "Llegada Requerida",
        message: `Debes marcar llegada a la parada de ${stop.clientName} para acceder a la verificación de productos y cobro.`,
        type: "warning",
      });
      return;
    }
    setSelectedStop(stop);
    const route = findRouteById("entregas.detalle");
    if (route) navigateTo(route);
  };

  const handleRegistrarVisita = (stop: DeliveryStop) => {
    setSelectedStop(stop);
    const route = findRouteById("entregas.registrarVisita");
    if (route) navigateTo(route);
  };

  // 1. INICIAR VIAJE (EN_ROUTE)
  const handleStartEnRoute = (stopId: string) => {
    updateStoreStatus(stopId, "EN_ROUTE");
    const target = stops.find((s) => s.id === stopId);
    setDialogConfig({
      visible: true,
      title: "Parada En Camino",
      message: `Te estás desplazando hacia la Parada #${target?.sequence || ""}: ${target?.clientName || ""}.`,
      type: "info",
    });
  };

  // 2. MARCAR LLEGADA EN SITIO (ARRIVED)
  const handleMarkArrived = (stopId: string) => {
    updateStoreStatus(stopId, "ARRIVED");
    const target = stops.find((s) => s.id === stopId);
    setDialogConfig({
      visible: true,
      title: "Llegada Confirmada",
      message: `Has llegado al destino de ${target?.clientName || ""}. Listo para descarga y cobro.`,
      type: "info",
    });
  };

  // 3. FINALIZAR ENTREGA (DELIVERED) Y AVANZAR AUTOMÁTICAMENTE A LA SIGUIENTE PARADA
  const handleMarkDelivered = (stopId: string) => {
    const currentStop = stops.find((s) => s.id === stopId);
    const nextSeq = currentStop ? currentStop.sequence + 1 : null;
    const nextTarget = stops.find((s) => s.sequence === nextSeq);

    updateStoreStatus(stopId, "DELIVERED");

    setDialogConfig({
      visible: true,
      title: "Entrega Completada",
      message: nextTarget
        ? `¡Parada completada! La siguiente parada es #${nextTarget.sequence}: ${nextTarget.clientName}.`
        : "¡Felicidades! Has completado todas las paradas de la hoja de ruta.",
      type: "info",
    });
  };

  if (viewMode === "mapa") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.mainBackground,
          position: "relative",
        }}
      >
        <RouteMapView
          stops={stops}
          onSelectStopDetail={handleOpenDetail}
          onRegistrarVisita={handleRegistrarVisita}
          tripCode={trip.transportOrderCode}
          statsLabel={`${stats.delivered}/${stats.total} (${stats.progressPercent}%)`}
          onSwitchToLista={() => setViewMode("lista")}
          onBack={() => router.back()}
        />
        <AppDialog
          visible={dialogConfig.visible}
          title={dialogConfig.title}
          message={dialogConfig.message}
          type={dialogConfig.type}
          onClose={() =>
            setDialogConfig((prev) => ({ ...prev, visible: false }))
          }
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              variant="caption"
              style={{
                color: theme.colors.mutedForeground,
                letterSpacing: 0.5,
              }}
            >
              HOJA DE RUTA ACTIVA
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                variant="header"
                style={{ color: theme.colors.foreground, fontSize: 20 }}
              >
                {trip.transportOrderCode}
              </Text>
              <Badge label="EN RUTA" tone="primary" size="sm" />
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.colors.secondary,
              borderRadius: 10,
              padding: 3,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setViewMode("lista")}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: theme.colors.cardBackground,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                elevation: 1,
              }}
            >
              <ListIcon size={15} color={theme.colors.primary} />
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: theme.colors.primary,
                  fontWeight: "700",
                }}
              >
                Lista
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode("mapa")}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 7,
                backgroundColor: "transparent",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <MapIcon size={15} color={theme.colors.mutedForeground} />
              <Text
                variant="label"
                style={{
                  fontSize: 12,
                  color: theme.colors.mutedForeground,
                  fontWeight: "500",
                }}
              >
                Mapa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Truck size={14} color={theme.colors.mutedForeground} />
            <Text
              variant="label"
              style={{ fontSize: 13, color: theme.colors.foreground }}
            >
              {trip.truckCode} ({trip.truckPlate})
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <User size={14} color={theme.colors.mutedForeground} />
            <Text
              variant="label"
              style={{ fontSize: 13, color: theme.colors.foreground }}
            >
              {trip.driverName}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Weight size={14} color={theme.colors.mutedForeground} />
            <Text
              variant="caption"
              style={{ fontSize: 12, color: theme.colors.mutedForeground }}
            >
              {trip.assignedWeightKg} kg • {trip.assignedVolumeM3} m³
            </Text>
          </View>

          {startRouteSignature && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsSignaturePreviewOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: theme.colors.successSoft,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.success + '40',
                alignSelf: 'flex-start',
              }}
            >
              <FileSignature size={13} color={theme.colors.success} />
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.colors.success,
                }}
              >
                Firma de salida: {startRouteSignature.signedBy} ({startRouteSignature.signedAt})
              </Text>
              <Eye size={12} color={theme.colors.success} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: 6, marginTop: 2 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              variant="caption"
              style={{ color: theme.colors.mutedForeground }}
            >
              Progreso de la Ruta:{" "}
              <Text variant="label" style={{ color: theme.colors.foreground }}>
                {stats.delivered} de {stats.total} Paradas
              </Text>
            </Text>
            <Text
              variant="label"
              style={{ color: theme.colors.primary, fontWeight: "700" }}
            >
              {stats.progressPercent}%
            </Text>
          </View>
          <View
            style={{
              height: 7,
              backgroundColor: theme.colors.secondary,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${stats.progressPercent}%`,
                height: "100%",
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flex: 1,
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{ color: "#ffffff", fontWeight: "800", fontSize: 11 }}
                >
                  #{activeStop.sequence}
                </Text>
              </View>
              <Text
                variant="title"
                style={{ fontSize: 15, fontWeight: "700", flex: 1 }}
                numberOfLines={1}
              >
                {activeStop.clientName}
              </Text>
              {activeStop.isCold && (
                <Badge label="Frío" tone="primary" size="sm" />
              )}
            </View>
          </View>

          <View
            style={{
              gap: 6,
              backgroundColor: theme.colors.secondary,
              padding: 8,
              borderRadius: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <MapPin size={13} color={theme.colors.primary} />
              <Text
                variant="caption"
                style={{
                  color: theme.colors.foreground,
                  fontSize: 11,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {activeStop.address}
              </Text>
            </View>

            <View style={{ gap: 3, marginTop: 2 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Weight size={12} color={theme.colors.mutedForeground} />
                <Text
                  variant="caption"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  Carga:{" "}
                  <Text variant="label" style={{ fontSize: 11 }}>
                    {activeStop.packagesCount}
                  </Text>
                </Text>
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <Clock size={12} color={theme.colors.mutedForeground} />
                <Text
                  variant="caption"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  Ventana horaria:{" "}
                  <Text variant="label" style={{ fontSize: 11 }}>
                    {activeStop.deliveryWindow}
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* ACCIONES RÁPIDAS DE LA PARADA EN HOJA DE RUTA */}
          <View style={{ gap: 8, marginTop: 4 }}>
            {activeStop.status === "PENDING" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cómo llegar"
                    icon={Navigation}
                    variant="outline"
                    size="md"
                    fullWidth
                    onPress={() => handleOpenGoogleMaps(activeStop)}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Button
                    label="Estoy en camino"
                    icon={Truck}
                    variant="primary"
                    size="md"
                    fullWidth
                    onPress={() => handleStartEnRoute(activeStop.id)}
                  />
                </View>
              </View>
            )}

            {activeStop.status === "EN_ROUTE" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cómo llegar"
                    icon={Navigation}
                    variant="outline"
                    size="md"
                    fullWidth
                    onPress={() => handleOpenGoogleMaps(activeStop)}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Button
                    label="Marcar llegada"
                    icon={CheckCircle2}
                    variant="primary"
                    size="md"
                    fullWidth
                    onPress={() => handleMarkArrived(activeStop.id)}
                  />
                </View>
              </View>
            )}

            {(activeStop.status === "ARRIVED" ||
              activeStop.status === "DELIVERED") && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cómo llegar"
                    icon={Navigation}
                    variant="outline"
                    size="md"
                    fullWidth
                    onPress={() => handleOpenGoogleMaps(activeStop)}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Button
                    label={
                      activeStop.status === "ARRIVED"
                        ? "Ver detalle y cobrar"
                        : "Ver detalle"
                    }
                    variant="primary"
                    size="md"
                    fullWidth
                    endIcon={ArrowRight}
                    onPress={() => handleOpenDetail(activeStop)}
                  />
                </View>
              </View>
            )}
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text variant="title" style={{ fontSize: 16 }}>
            Paradas en Hoja de Ruta ({paradasFiltradas.length})
          </Text>
        </View>

        {paradasFiltradas.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 14,
              padding: 24,
              alignItems: "center",
            }}
          >
            <Text
              variant="caption"
              style={{ color: theme.colors.mutedForeground }}
            >
              No se encontraron paradas con los criterios ingresados.
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
              overflow: "hidden",
            }}
          >
            {paradasFiltradas.map((stop, index) => {
              const isLast = index === paradasFiltradas.length - 1;
              const isActive = activeStop?.id === stop.id;

              let statusBg = theme.colors.secondary;
              let statusIcon = (
                <Clock size={16} color={theme.colors.mutedForeground} />
              );

              if (stop.status === "ARRIVED") {
                statusBg = "#e0f2fe";
                statusIcon = <Store size={17} color="#0284c7" />;
              } else if (stop.status === "DELIVERED") {
                statusBg = theme.colors.successSoft;
                statusIcon = (
                  <CheckCircle2 size={17} color={theme.colors.success} />
                );
              } else if (stop.status === "EN_ROUTE") {
                statusBg = theme.colors.primarySoft;
                statusIcon = <Truck size={17} color={theme.colors.primary} />;
              } else if (stop.status === "INCIDENT") {
                statusBg = theme.colors.dangerSoft;
                statusIcon = (
                  <AlertTriangle size={17} color={theme.colors.danger} />
                );
              }

              return (
                <TouchableOpacity
                  key={stop.id}
                  activeOpacity={0.7}
                  onPress={() => handleOpenDetail(stop)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
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
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    {statusIcon}
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        variant="label"
                        style={{
                          fontSize: 13,
                          color: theme.colors.mutedForeground,
                        }}
                      >
                        #{stop.sequence}
                      </Text>
                      <Text
                        variant="label"
                        style={{
                          fontSize: 14,
                          color: theme.colors.foreground,
                          fontWeight: "700",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {stop.clientName}
                      </Text>
                      {isActive && (
                        <Badge
                          label="Siguiente Parada"
                          tone="primary"
                          size="sm"
                        />
                      )}
                      {stop.isCold && (
                        <Snowflake size={12} color={theme.colors.primary} />
                      )}
                    </View>

                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.mutedForeground,
                        fontSize: 12,
                      }}
                      numberOfLines={1}
                    >
                      {stop.address}
                    </Text>

                    <View style={{ gap: 2, marginTop: 2 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Weight
                          size={11}
                          color={theme.colors.mutedForeground}
                        />
                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.mutedForeground,
                            fontSize: 11,
                          }}
                        >
                          Carga:{" "}
                          <Text variant="label" style={{ fontSize: 11 }}>
                            {stop.packagesCount}
                          </Text>
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={11} color={theme.colors.mutedForeground} />
                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.mutedForeground,
                            fontSize: 11,
                          }}
                        >
                          Ventana horaria:{" "}
                          <Text variant="label" style={{ fontSize: 11 }}>
                            {stop.deliveryWindow}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* TRAILING: ÚNICAMENTE LA FLECHA DERECHA */}
                  <View style={{ marginLeft: 8 }}>
                    <ChevronRight
                      size={20}
                      color={theme.colors.mutedForeground}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ACCESO A LA PANTALLA DE FINALIZACIÓN Y LIQUIDACIÓN */}
      <View
        style={{
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          padding: 16,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: theme.colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle2 size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ fontSize: 14, fontWeight: "700" }}>
              Cierre de Jornada y Retorno
            </Text>
            <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
              Conteo de bandeo/activos, arqueo de dinero y liquidación.
            </Text>
          </View>
        </View>

        <Button
          label="Finalizar Ruta y Liquidar"
          icon={CheckCircle2}
          variant="primary"
          size="lg"
          onPress={() => {
            const finalizacionRoute = findRouteById("entregas.finalizacion");
            if (finalizacionRoute) {
              navigateTo(finalizacionRoute);
            }
          }}
          fullWidth
        />
      </View>

      <AppDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onClose={() => setDialogConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* MODAL DE PREVISUALIZACIÓN DE FIRMA DE INICIO */}
      <Modal
        visible={isSignaturePreviewOpen}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setIsSignaturePreviewOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 20,
              gap: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileSignature size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text
                    variant="title"
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.colors.foreground,
                    }}
                  >
                    Firma de Salida Registrada
                  </Text>
                  <Text
                    variant="caption"
                    style={{ fontSize: 12, color: theme.colors.mutedForeground }}
                  >
                    {startRouteSignature?.signedBy} • {startRouteSignature?.signedAt}
                  </Text>
                </View>
              </View>
              <Badge label="Validada ✓" tone="success" size="sm" />
            </View>

            {startRouteSignature?.paths && (
              <View
                style={{
                  height: 120,
                  backgroundColor: SIGNATURE_PAPER_COLOR,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox={getSignatureViewBox(startRouteSignature.paths)}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {startRouteSignature.paths.map((d, idx) => (
                    <Path
                      key={`start-sig-${idx}`}
                      d={d}
                      stroke={SIGNATURE_INK_COLOR}
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </Svg>
              </View>
            )}

            <Text
              variant="caption"
              style={{ fontSize: 11, color: theme.colors.mutedForeground }}
            >
              Firma capturada digitalmente al momento de iniciar la hoja de ruta oficial.
            </Text>

            <Button
              label="Cerrar"
              variant="secondary"
              fullWidth
              onPress={() => setIsSignaturePreviewOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

