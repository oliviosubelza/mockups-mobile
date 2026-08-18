import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Pencil,
  RotateCcw,
  Snowflake,
  User,
  X,
} from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  BackHandler,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findRouteById, navigateTo } from "@/navigation/registry";
import {
  Badge,
  BoxUnitCounter,
  boxUnitTotal,
  formatBoxUnit,
  Button,
  Card,
  SearchField,
  type BoxUnitValue,
} from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";

import {
  useSupervisorStore,
  DISCREPANCY_CAUSES,
  type SupervisorDiscrepancyItem,
} from "./store";

export type FlatMissingProductItem = SupervisorDiscrepancyItem;

export default function ProductosFaltantesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const allItems = useSupervisorStore((state) => state.items);
  const setCorrection = useSupervisorStore((state) => state.setCorrection);
  const setExpected = useSupervisorStore((state) => state.setExpected);
  const confirmItem = useSupervisorStore((state) => state.confirmItem);
  const setEditing = useSupervisorStore((state) => state.setEditing);
  const setActiveOrderCode = useSupervisorStore((state) => state.setActiveOrderCode);

  const discrepancyItems = allItems.filter((i) => i.difference !== 0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<
    "all" | "shortage" | "surplus" | "cold"
  >("all");

  /**
   * Chofer abierto, o `null` mientras se ve el listado de choferes.
   */
  const [choferAbierto, setChoferAbierto] = useState<string | null>(null);

  /**
   * El back del sistema cierra el chofer antes de salir de la pantalla.
   */
  useFocusEffect(
    useCallback(() => {
      if (!choferAbierto) return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          setChoferAbierto(null);
          return true;
        },
      );

      return () => subscription.remove();
    }, [choferAbierto]),
  );

  // MODAL SELECTOR DE TIPO DE DIFERENCIA
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    activeItemId: string | null;
  }>({
    visible: false,
    activeItemId: null,
  });

  const handleCorrectionChange = (itemId: string, next: BoxUnitValue) => {
    setCorrection(itemId, next.cajas, next.unidades);
  };

  /** Atajo para igualar la cantidad al esperado de la OT en 1 toque */
  const handleSetExpectedItem = (item: SupervisorDiscrepancyItem) => {
    setExpected(item.id);
  };

  const commitCorrection = (itemId: string) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;
    const currentCorrection: BoxUnitValue = {
      cajas: item.correctedBoxes,
      unidades: item.correctedUnits,
    };
    const isMatched =
      boxUnitTotal(currentCorrection, item.cajaSize) === item.expectedQty;
    if (isMatched) {
      confirmItem(itemId, "Error de Conteo Chofer");
    } else {
      setPickerState({ visible: true, activeItemId: itemId });
    }
  };

  // ELEGIR LA CAUSA CIERRA LA CORRECCIÓN: CANTIDAD Y CLASIFICACIÓN JUNTAS
  const handleSelectType = (type: string) => {
    const itemId = pickerState.activeItemId;
    setPickerState({ visible: false, activeItemId: null });
    if (!itemId) return;

    confirmItem(itemId, type);
  };

  // FILTRADO PLANO DE ÍTEMS DE DISCREPANCIA (CADA OCURRENCIA POR SEPARADO)
  const filteredDiscrepancies = discrepancyItems.filter((item) => {
    // Filtro por búsqueda
    const matchesSearch =
      item.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.zonaRuta.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filtro por tipo
    if (activeTypeFilter === "shortage") return item.difference < 0;
    if (activeTypeFilter === "surplus") return item.difference > 0;
    if (activeTypeFilter === "cold") return item.isColdChain;

    return true;
  });

  /**
   * Las diferencias se leen por chofer, no por ítem suelto.
   */
  const discrepanciasPorChofer = (() => {
    const porChofer = new Map<string, SupervisorDiscrepancyItem[]>();
    filteredDiscrepancies.forEach((item) => {
      const items = porChofer.get(item.driverName) ?? [];
      items.push(item);
      porChofer.set(item.driverName, items);
    });

    return [...porChofer.entries()]
      .map(([driverName, items]) => ({
        driverName,
        items,
        faltantes: items.filter((i) => i.difference < 0).length,
        sobrantes: items.filter((i) => i.difference > 0).length,
        ordenes: new Set(items.map((i) => i.orderCode)).size,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  })();

  const grupoAbierto =
    discrepanciasPorChofer.find((g) => g.driverName === choferAbierto) ?? null;

  const totalShortageCount = discrepancyItems.filter(
    (p) => p.difference < 0,
  ).length;
  const totalSurplusCount = discrepancyItems.filter(
    (p) => p.difference > 0,
  ).length;
  const totalColdCount = discrepancyItems.filter(
    (p) => p.isColdChain,
  ).length;

  const handleNavigateToConsolidation = (orderCode: string) => {
    setActiveOrderCode(orderCode);
    const route = findRouteById("supervisor.consolidacion");
    if (route) {
      navigateTo(route);
    }
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
      >
        {/* CABECERA DEL CHOFER ABIERTO + VUELTA AL LISTADO */}
        {choferAbierto && (
          <View style={{ gap: 4 }}>
            <TouchableOpacity
              onPress={() => setChoferAbierto(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-start",
                paddingVertical: 4,
                paddingHorizontal: 2,
              }}
            >
              <ChevronLeft size={16} color={theme.colors.primary} />
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Todos los choferes
              </Text>
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={18} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="subtitle" numberOfLines={1}>
                  {choferAbierto}
                </Text>
                <Text variant="caption">
                  {grupoAbierto?.items.length ?? 0}{" "}
                  {(grupoAbierto?.items.length ?? 0) === 1
                    ? "diferencia"
                    : "diferencias"}{" "}
                  en {grupoAbierto?.ordenes ?? 0}{" "}
                  {(grupoAbierto?.ordenes ?? 0) === 1 ? "orden" : "órdenes"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BUSCADOR */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por producto, código, OT o chofer..."
        />

        {/* FILTROS RÁPIDOS POR TIPO */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={() => setActiveTypeFilter("all")}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === "all"
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === "all"
                  ? theme.colors.primary
                  : theme.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  activeTypeFilter === "all"
                    ? "#ffffff"
                    : theme.colors.foreground,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Todos ({discrepancyItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTypeFilter("shortage")}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === "shortage"
                  ? theme.colors.danger
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === "shortage"
                  ? theme.colors.danger
                  : theme.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  activeTypeFilter === "shortage"
                    ? "#ffffff"
                    : theme.colors.foreground,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Faltantes ({totalShortageCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTypeFilter("surplus")}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === "surplus"
                  ? theme.colors.warning
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === "surplus"
                  ? theme.colors.warning
                  : theme.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  activeTypeFilter === "surplus"
                    ? "#ffffff"
                    : theme.colors.foreground,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Sobrantes ({totalSurplusCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTypeFilter("cold")}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === "cold"
                  ? theme.colors.primarySoft
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === "cold"
                  ? theme.colors.primary
                  : theme.colors.border,
            }}
          >
            <Text
              style={{
                color:
                  activeTypeFilter === "cold"
                    ? theme.colors.primary
                    : theme.colors.foreground,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              ❄️ Frío ({totalColdCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE CHOFERES O LISTA DE PRODUCTOS DEL CHOFER ABIERTO */}
        {filteredDiscrepancies.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 40,
              gap: 8,
            }}
          >
            <Text
              variant="label"
              style={{ color: theme.colors.mutedForeground, fontSize: 14 }}
            >
              No se encontraron productos con diferencias
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setActiveTypeFilter("all");
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                Restablecer Filtros
              </Text>
            </TouchableOpacity>
          </View>
        ) : grupoAbierto ? (
          /* PASO 2: QUÉ RECLAMARLE. Las cards del chofer abierto. */
          <View style={{ gap: 18 }}>
            {grupoAbierto.items.map((item) => {
              const isShortage = item.difference < 0;
              const currentCorrection: BoxUnitValue = {
                cajas: item.correctedBoxes,
                unidades: item.correctedUnits,
              };

              const currentTotal = boxUnitTotal(currentCorrection, item.cajaSize);
              const isSavedMatched = currentTotal === item.expectedQty;
              const isConfirmed = item.isConfirmed;
              const isEditing = item.isEditing;

              // ESTADO GUARDADO / CONFIRMADO: Los colores solo aparecen al guardar
              const isConfirmedAndSaved = isConfirmed && !isEditing;
              const isRectified = isConfirmedAndSaved && isSavedMatched;
              const isConfirmedDiscrepancy = isConfirmedAndSaved && !isSavedMatched;

              const cardBorderColor = isRectified
                ? theme.colors.success
                : isConfirmedDiscrepancy
                  ? (isShortage ? theme.colors.danger : theme.colors.warning)
                  : theme.colors.border;

              const cardBgColor = isRectified
                ? theme.colors.successSoft
                : isConfirmedDiscrepancy
                  ? (isShortage ? theme.colors.dangerSoft : theme.colors.cardBackground)
                  : theme.colors.cardBackground;

              return (
                <Card
                  key={item.id}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={isConfirmedAndSaved ? 1.5 : 1}
                  style={{
                    gap: 10,
                    backgroundColor: cardBgColor,
                    borderColor: cardBorderColor,
                    borderLeftWidth: isConfirmedAndSaved ? 5 : 1,
                    borderLeftColor: cardBorderColor,
                  }}
                >
                  {/* FILA 1: IDENTIFICACIÓN (SKU + OT) + SALIDA AL DETALLE */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 1,
                      }}
                    >
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: theme.colors.mutedForeground,
                          flexShrink: 1,
                        }}
                      >
                        {item.codigo} · {item.orderCode}
                      </Text>
                      {item.isColdChain && (
                        <Badge
                          label="Frío"
                          tone="neutral"
                          size="sm"
                          icon={Snowflake}
                        />
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        handleNavigateToConsolidation(item.orderCode)
                      }
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: theme.colors.primary,
                        }}
                      >
                        Ver detalle
                      </Text>
                      <ArrowRight size={13} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* FILA 2: PRODUCTO + BADGE (NEUTRO ANTES DE GUARDAR, VERDE/ROJO AL GUARDAR) */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text
                      variant="subtitle"
                      numberOfLines={2}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: "700",
                        color: theme.colors.foreground,
                      }}
                    >
                      {item.nombre}
                    </Text>

                    {isRectified ? (
                      <Badge
                        label="Rectificado (Conforme ✓)"
                        tone="success"
                        size="sm"
                        icon={CheckCircle2}
                      />
                    ) : isConfirmedDiscrepancy ? (
                      <Badge
                        label={
                          item.difference > 0
                            ? `+${item.difference} Sobrante Confirmado`
                            : `${item.difference} Faltante Confirmado`
                        }
                        tone={item.difference > 0 ? "warning" : "danger"}
                        size="sm"
                        icon={AlertTriangle}
                      />
                    ) : (
                      <Badge
                        label={
                          item.difference > 0
                            ? `+${item.difference} Sobrante`
                            : `${item.difference} Faltante`
                        }
                        tone="neutral"
                        size="sm"
                      />
                    )}
                  </View>

                  {/* FILA 3: COMPARATIVO ESPERADO EN OT VS CONTADO POR CHOFER */}
                  <View
                    style={{
                      backgroundColor: isConfirmedAndSaved
                        ? theme.colors.cardBackground
                        : theme.colors.secondary,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: isConfirmedAndSaved
                        ? (isRectified ? theme.colors.success + "40" : theme.colors.danger + "40")
                        : theme.colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 1,
                        }}
                      >
                        <Text
                          variant="caption"
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: theme.colors.mutedForeground,
                          }}
                        >
                          Esperado en OT
                        </Text>
                        {/* EL BOTÓN RECTIFICAR SOLO SE MUESTRA ANTES DE GUARDAR (DESAPARECE AL GUARDAR) */}
                        {!isConfirmedAndSaved && (
                          <TouchableOpacity
                            onPress={() => {
                              handleSetExpectedItem(item);
                            }}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: theme.colors.cardBackground,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                            }}
                          >
                            <RotateCcw size={10} color={theme.colors.primary} />
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              Rectificar a OT
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text
                        variant="label"
                        numberOfLines={1}
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: isRectified
                            ? theme.colors.success
                            : theme.colors.foreground,
                        }}
                      >
                        {formatBoxUnit(
                          item.expectedBoxes,
                          item.expectedQty - item.expectedBoxes * item.cajaSize,
                          item.expectedQty,
                        )}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border + "80",
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontSize: 11,
                          color: theme.colors.mutedForeground,
                        }}
                      >
                        Contado por el chofer
                      </Text>
                      <Text
                        variant="label"
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isConfirmedAndSaved
                            ? (isRectified
                                ? theme.colors.success
                                : isShortage
                                  ? theme.colors.danger
                                  : theme.colors.warning)
                            : theme.colors.foreground,
                        }}
                      >
                        {formatBoxUnit(
                          item.driverBoxes,
                          item.driverUnits,
                          item.driverQty,
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* FILA 4: CANTIDAD CONSOLIDADA / RESOLUCIÓN */}
                  <View
                    style={{
                      gap: 8,
                      paddingTop: 4,
                    }}
                  >
                    {!isEditing && isConfirmed ? (
                      /* ESTADO RESOLVIDO / CONFIRMADO */
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: isSavedMatched
                            ? theme.colors.cardBackground
                            : theme.colors.secondary,
                          borderColor: isSavedMatched
                            ? theme.colors.success
                            : theme.colors.border,
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            flex: 1,
                          }}
                        >
                          <CheckCircle2
                            size={18}
                            color={
                              isSavedMatched
                                ? theme.colors.success
                                : theme.colors.primary
                            }
                          />
                          <View style={{ flex: 1, gap: 1 }}>
                            <Text
                              variant="label"
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: isSavedMatched
                                  ? theme.colors.success
                                  : theme.colors.foreground,
                              }}
                            >
                              {isSavedMatched
                                ? `Total Conforme: ${formatBoxUnit(
                                    parseInt(item.correctedBoxes || "0", 10),
                                    parseInt(item.correctedUnits || "0", 10),
                                    item.expectedQty,
                                  )}`
                                : `Total Confirmado: ${formatBoxUnit(
                                    parseInt(item.correctedBoxes || "0", 10),
                                    parseInt(item.correctedUnits || "0", 10),
                                    boxUnitTotal(
                                      currentCorrection,
                                      item.cajaSize,
                                    ),
                                  )}`}
                            </Text>
                            <Text
                              variant="caption"
                              style={{
                                fontSize: 11,
                                color: isSavedMatched
                                  ? theme.colors.success
                                  : theme.colors.mutedForeground,
                              }}
                            >
                              {item.selectedType
                                ? `Clasificación: ${item.selectedType}`
                                : isSavedMatched
                                  ? "Diferencia rectificada • Coincide con OT (0 dif.)"
                                  : "Diferencia física confirmada"}
                            </Text>
                          </View>
                        </View>

                        <Button
                          label="Modificar"
                          icon={Pencil}
                          variant="secondary"
                          size="xs"
                          onPress={() => setEditing(item.id, true)}
                        />
                      </View>
                    ) : (
                      /* MODO EDICIÓN: STEPPERS INTERACTIVOS */
                      <View style={{ gap: 8 }}>
                        <BoxUnitCounter
                          value={currentCorrection}
                          onChange={(next) =>
                            handleCorrectionChange(item.id, next)
                          }
                          cajaSize={item.cajaSize}
                          totalLabel="Total corregido"
                          targetQty={item.expectedQty}
                          action={
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                minHeight: theme.controlSizes.xs.height,
                                justifyContent: "center",
                              }}
                            >
                              {isConfirmed && (
                                <Button
                                  label="Cancelar"
                                  variant="secondary"
                                  size="xs"
                                  onPress={() => setEditing(item.id, false)}
                                />
                              )}
                              <Button
                                label="Guardar"
                                icon={Check}
                                variant="primary"
                                size="xs"
                                onPress={() => commitCorrection(item.id)}
                              />
                            </View>
                          }
                        />
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          /* PASO 1: A QUIÉN RECLAMARLE. El detalle llega al abrir un chofer. */
          <View style={{ gap: 10 }}>
            {discrepanciasPorChofer.map((grupo) => (
              <Card
                key={grupo.driverName}
                onPress={() => setChoferAbierto(grupo.driverName)}
                padding="m"
                borderRadius="xl"
                borderWidth={1}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: theme.colors.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={18} color={theme.colors.mutedForeground} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="subtitle" numberOfLines={1}>
                    {grupo.driverName}
                  </Text>
                  <Text variant="caption">
                    {grupo.items.length}{" "}
                    {grupo.items.length === 1 ? "producto" : "productos"} ·{" "}
                    {grupo.ordenes}{" "}
                    {grupo.ordenes === 1 ? "orden" : "órdenes"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
                    {grupo.faltantes > 0 && (
                      <Badge
                        label={`${grupo.faltantes} faltante${grupo.faltantes === 1 ? "" : "s"}`}
                        tone="danger"
                        size="sm"
                      />
                    )}
                    {grupo.sobrantes > 0 && (
                      <Badge
                        label={`${grupo.sobrantes} sobrante${grupo.sobrantes === 1 ? "" : "s"}`}
                        tone="warning"
                        size="sm"
                      />
                    )}
                  </View>
                </View>

                <ArrowRight size={18} color={theme.colors.mutedForeground} />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL SELECTOR DE TIPO DE DIFERENCIA */}
      <Modal
        visible={pickerState.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setPickerState({ visible: false, activeItemId: null })
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 18,
              gap: 14,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexShrink: 1, gap: 1 }}>
                <Text variant="subtitle">¿Por qué la diferencia?</Text>
                <Text variant="caption">Al elegir se guarda la corrección</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setPickerState({ visible: false, activeItemId: null })
                }
                style={{ padding: 4 }}
              >
                <X size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {DISCREPANCY_CAUSES.map((cause) => {
                const activeItem = allItems.find(
                  (i) => i.id === pickerState.activeItemId
                );
                const isSelected = activeItem?.selectedType === cause;

                return (
                  <TouchableOpacity
                    key={cause}
                    onPress={() => handleSelectType(cause)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isSelected
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                    }}
                  >
                    <Text
                      variant="label"
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? "800" : "600",
                        color: isSelected
                          ? theme.colors.primary
                          : theme.colors.foreground,
                        flex: 1,
                      }}
                    >
                      {cause}
                    </Text>
                    {isSelected && (
                      <Check size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Box>
  );
}
