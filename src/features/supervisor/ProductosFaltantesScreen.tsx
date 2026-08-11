import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  PackageSearch,
  Snowflake,
  User,
  X
} from "lucide-react-native";
import React, { useState } from "react";
import {
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
  EMPTY_BOX_UNIT,
  SearchField,
  type BoxUnitValue,
} from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";

import { DISCREPANCY_CAUSES } from "./ConsolidacionConteoScreen";

export interface FlatMissingProductItem {
  id: string;
  orderId: string;
  orderCode: string;
  driverName: string;
  zonaRuta: string;
  date: string; // ISO YYYY-MM-DD
  dateFormatted: string;
  codigo: string;
  nombre: string;
  categoria: string;
  isColdChain: boolean;
  expectedQty: number;
  expectedBoxes: number;
  cajaSize: number; // unidades por caja

  countedQty: number;
  countedBoxes: number;
  countedUnits: number;
  difference: number; // e.g. -3 or +2
  differenceType: string;
}

// CADA OCURRENCIA DE UN PRODUCTO EN UNA OT ES UN ÍTEM INDEPENDIENTE
const FLAT_MOCK_DISCREPANCIES: FlatMissingProductItem[] = [
  {
    id: "disc-1",
    orderId: "sup-1",
    orderCode: "OT-4892",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Norte • Santa Cruz",
    date: "2026-08-05",
    dateFormatted: "Hoy, 14:20",
    codigo: "PROD-005",
    nombre: "Salsa de Tomate Ketchup 5kg",
    categoria: "Salsas y Aderezos",
    isColdChain: false,
    expectedQty: 96,
    expectedBoxes: 8,
    cajaSize: 12,
    countedQty: 93,
    countedBoxes: 7,
    countedUnits: 9,
    difference: -3,
    differenceType: "Diferencia",
  },
  {
    id: "disc-2",
    orderId: "sup-3",
    orderCode: "OT-5109",
    driverName: "Roberto Gómez",
    zonaRuta: "Ruta Plan 3000 • Sector Comercial",
    date: "2026-08-04",
    dateFormatted: "Ayer, 11:15",
    codigo: "PROD-005",
    nombre: "Salsa de Tomate Ketchup 5kg",
    categoria: "Salsas y Aderezos",
    isColdChain: false,
    expectedQty: 48,
    expectedBoxes: 4,
    cajaSize: 12,
    countedQty: 46,
    countedBoxes: 3,
    countedUnits: 10,
    difference: -2,
    differenceType: "Diferencia",
  },
  {
    id: "disc-3",
    orderId: "sup-1",
    orderCode: "OT-4892",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Norte • Santa Cruz",
    date: "2026-08-05",
    dateFormatted: "Hoy, 14:20",
    codigo: "PROD-002",
    nombre: "Salsa Mayonesa Industrial 10kg",
    categoria: "Salsas y Aderezos",
    isColdChain: true,
    expectedQty: 144,
    expectedBoxes: 12,
    cajaSize: 12,
    countedQty: 146,
    countedBoxes: 12,
    countedUnits: 2,
    difference: 2,
    differenceType: "Conteo",
  },
  {
    id: "disc-4",
    orderId: "sup-2",
    orderCode: "OT-5011",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Equipetrol",
    date: "2026-08-01",
    dateFormatted: "01 Ago 12:45",
    codigo: "PROD-014",
    nombre: "Harina de Trigo Especial Panificación 25kg",
    categoria: "Insumos de Panificación",
    isColdChain: false,
    expectedQty: 120,
    expectedBoxes: 10,
    cajaSize: 12,
    countedQty: 116,
    countedBoxes: 9,
    countedUnits: 8,
    difference: -4,
    differenceType: "Quiebre",
  },
  {
    id: "disc-5",
    orderId: "sup-3",
    orderCode: "OT-5109",
    driverName: "Roberto Gómez",
    zonaRuta: "Ruta Plan 3000 • Sector Comercial",
    date: "2026-08-04",
    dateFormatted: "Ayer, 11:15",
    codigo: "PROD-021",
    nombre: "Levadura Fresca en Barra 500g",
    categoria: "Insumos de Panificación",
    isColdChain: true,
    expectedQty: 60,
    expectedBoxes: 5,
    cajaSize: 12,
    countedQty: 57,
    countedBoxes: 4,
    countedUnits: 9,
    difference: -3,
    differenceType: "Conteo",
  },
  {
    id: "disc-6",
    orderId: "sup-4",
    orderCode: "OT-4750",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Equipetrol",
    date: "2026-07-28",
    dateFormatted: "28 Jul 09:30",
    codigo: "PROD-033",
    nombre: "Salsa Barbacoa BBQ Ahumada 4L",
    categoria: "Salsas y Aderezos",
    isColdChain: false,
    expectedQty: 50,
    expectedBoxes: 5,
    cajaSize: 10,
    countedQty: 49,
    countedBoxes: 4,
    countedUnits: 9,
    difference: -1,
    differenceType: "Cruce",
  },
];

export default function ProductosFaltantesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<
    "all" | "shortage" | "surplus" | "cold"
  >("all");

  /**
   * Chofer abierto, o `null` mientras se ve el listado de choferes.
   *
   * La pantalla tiene dos pasos sobre los mismos datos: primero a quién
   * reclamarle, después qué reclamarle. Vive en estado local y no en una ruta
   * porque el catch-all navega por slug y no transporta parámetros.
   */
  const [choferAbierto, setChoferAbierto] = useState<string | null>(null);

  // CANTIDAD CONSOLIDADA POR ÍTEM EN CAJAS + UNIDADES (ARRANCA CON LO CONTADO POR EL CHOFER)
  const [corrections, setCorrections] = useState<Record<string, BoxUnitValue>>(
    () =>
      Object.fromEntries(
        FLAT_MOCK_DISCREPANCIES.map((item) => [
          item.id,
          {
            cajas: item.countedBoxes.toString(),
            unidades: item.countedUnits.toString(),
          },
        ]),
      ),
  );

  // CLASIFICACIÓN DE LA DIFERENCIA POR ÍTEM
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        FLAT_MOCK_DISCREPANCIES.map((item) => [item.id, item.differenceType]),
      ),
  );

  /** Cantidad tecleada por ítem, sin confirmar todavía. */
  const [draftCorrections, setDraftCorrections] = useState<
    Record<string, BoxUnitValue>
  >({});

  // MODAL SELECTOR DE TIPO DE DIFERENCIA
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    activeItemId: string | null;
  }>({
    visible: false,
    activeItemId: null,
  });

  const handleCorrectionChange = (itemId: string, next: BoxUnitValue) => {
    setDraftCorrections((prev) => ({ ...prev, [itemId]: next }));
  };

  /**
   * Guardar abre el clasificador en lugar de confirmar de una: una corrección
   * sin causa no sirve para nada río abajo, así que la causa deja de ser un
   * control suelto en la card y pasa a ser el paso que cierra el guardado.
   */
  const commitCorrection = (itemId: string) => {
    setPickerState({ visible: true, activeItemId: itemId });
  };

  // ELEGIR LA CAUSA CIERRA LA CORRECCIÓN: CANTIDAD Y CLASIFICACIÓN JUNTAS
  const handleSelectType = (type: string) => {
    const itemId = pickerState.activeItemId;
    setPickerState({ visible: false, activeItemId: null });
    if (!itemId) return;

    const draftCount = draftCorrections[itemId];

    setSelectedTypes((prev) => ({ ...prev, [itemId]: type }));
    if (draftCount) {
      setCorrections((prev) => ({ ...prev, [itemId]: draftCount }));
    }

    // El borrador se descarta: la card vuelve a leer del valor confirmado.
    setDraftCorrections((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  // FILTRADO PLANO DE ÍTEMS DE DISCREPANCIA (CADA OCURRENCIA POR SEPARADO)
  const filteredDiscrepancies = FLAT_MOCK_DISCREPANCIES.filter((item) => {
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
   * Las diferencias se leen por chofer, no por ítem suelto: la pregunta de esta
   * pantalla es a quién reclamarle, y un mismo chofer arrastra varias OT.
   * Ordena por cantidad de diferencias para que el caso más pesado quede arriba.
   */
  const discrepanciasPorChofer = (() => {
    const porChofer = new Map<string, FlatMissingProductItem[]>();
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

  const totalShortageCount = FLAT_MOCK_DISCREPANCIES.filter(
    (p) => p.difference < 0,
  ).length;
  const totalSurplusCount = FLAT_MOCK_DISCREPANCIES.filter(
    (p) => p.difference > 0,
  ).length;
  const totalColdCount = FLAT_MOCK_DISCREPANCIES.filter(
    (p) => p.isColdChain,
  ).length;

  const handleNavigateToConsolidation = (orderCode: string) => {
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
        {/* BANNER INFORMATIVO */}
        {/* <View
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
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: theme.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PackageSearch size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="label"
                style={{ fontSize: 13, fontWeight: '800', color: theme.colors.foreground }}
              >
                Productos con Diferencia
              </Text>
              <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                Listado individual de ítems y las órdenes de transporte (OT) a las que pertenecen.
              </Text>
            </View>
          </View>
        </View> */}

        {/* CABECERA DEL CHOFER ABIERTO + VUELTA AL LISTADO */}
        {choferAbierto && (
          <TouchableOpacity
            onPress={() => setChoferAbierto(null)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <ChevronLeft size={20} color={theme.colors.foreground} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="subtitle" numberOfLines={1}>
                {choferAbierto}
              </Text>
              <Text variant="caption">
                {grupoAbierto
                  ? `${grupoAbierto.items.length} ${grupoAbierto.items.length === 1 ? "producto" : "productos"} · ${grupoAbierto.ordenes} ${grupoAbierto.ordenes === 1 ? "orden" : "órdenes"}`
                  : "Sin resultados para el filtro actual"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* CAMPO DE BÚSQUEDA */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            choferAbierto
              ? "Buscar por SKU, producto u orden (OT)..."
              : "Buscar por chofer, SKU, producto u orden (OT)..."
          }
        />

        {/* BARRA DE FILTROS SOLICITADA POR KEY USERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ flexGrow: 0 }}
        >
          {/* 1. TODOS */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter("all")}
            style={{
              paddingHorizontal: 13,
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
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  activeTypeFilter === "all"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              Todos ({filteredDiscrepancies.length})
            </Text>
          </TouchableOpacity>

          {/* 2. FALTANTES */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter("shortage")}
            style={{
              paddingHorizontal: 13,
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
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  activeTypeFilter === "shortage"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              Faltantes ({totalShortageCount})
            </Text>
          </TouchableOpacity>

          {/* 3. SOBRANTES */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter("surplus")}
            style={{
              paddingHorizontal: 13,
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
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  activeTypeFilter === "surplus"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              Sobrantes ({totalSurplusCount})
            </Text>
          </TouchableOpacity>

          {/* 4. CADENA DE FRÍO */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter("cold")}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === "cold"
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === "cold"
                  ? theme.colors.primary
                  : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  activeTypeFilter === "cold"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              ❄️ Cadena de Frío ({totalColdCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* LISTADO PLANO Y COMPACTO DE ÍTEMS CON DIFERENCIA */}
        {/* El chofer abierto puede quedar sin ítems si el filtro los excluye:
            cae al mismo vacío, y la cabecera de arriba sigue dando la vuelta. */}
        {filteredDiscrepancies.length === 0 ||
        (choferAbierto && !grupoAbierto) ? (
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 14,
              padding: 20,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginVertical: 16,
            }}
          >
            <PackageSearch size={36} color={theme.colors.mutedForeground} />
            <Text
              variant="label"
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: theme.colors.foreground,
              }}
            >
              Sin coincidencias encontradas
            </Text>
            <Text
              variant="caption"
              style={{
                textAlign: "center",
                color: theme.colors.mutedForeground,
                fontSize: 12,
              }}
            >
              No se encontraron registros de faltantes para el filtro
              seleccionado.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setActiveTypeFilter("all");
                setSearchQuery("");
              }}
              style={{
                marginTop: 4,
                backgroundColor: theme.colors.primarySoft,
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
              const accentColor = isShortage
                ? theme.colors.danger
                : theme.colors.warning;
              // Lo confirmado, y encima lo tecleado si la card está en edición.
              const savedCorrection = corrections[item.id] ?? EMPTY_BOX_UNIT;
              const currentCorrection =
                draftCorrections[item.id] ?? savedCorrection;

              const isMatched =
                boxUnitTotal(currentCorrection, item.cajaSize) ===
                item.expectedQty;
              const correccionSucia =
                currentCorrection.cajas !== savedCorrection.cajas ||
                currentCorrection.unidades !== savedCorrection.unidades;

              return (
                <Card
                  key={item.id}
                  onPress={() => handleNavigateToConsolidation(item.orderCode)}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={1}
                  style={{ gap: 8 }}
                >
                  {/* FILA 1: IDENTIFICACIÓN (SKU + OT) + SALIDA AL DETALLE */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 1,
                      }}
                    >
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: theme.colors.mutedForeground,
                          flexShrink: 1,
                        }}
                      >
                        {item.codigo} · {item.orderCode}
                      </Text>
                      {item.isColdChain && (
                        <Badge label="Frío" tone="neutral" size="sm" icon={Snowflake} />
                      )}
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: theme.colors.primary,
                        }}
                      >
                        Ver detalle
                      </Text>
                      <ArrowRight size={13} color={theme.colors.primary} />
                    </View>
                  </View>

                  {/* FILA 2: PRODUCTO + MAGNITUD DE LA DIFERENCIA */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <Text
                      variant="subtitle"
                      numberOfLines={2}
                      style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                    >
                      {item.nombre}
                    </Text>

                    <Badge
                      label={
                        item.difference > 0
                          ? `+${item.difference} Sobrante`
                          : `${item.difference} Faltante`
                      }
                      tone={item.difference > 0 ? 'warning' : 'danger'}
                      size="sm"
                    />
                  </View>

                  {/* FILA 3: COMPARATIVO ESPERADO VS CONTADO */}
                  <View
                    style={{
                      backgroundColor: theme.colors.secondary,
                      borderRadius: 8,
                      paddingHorizontal: 9,
                      paddingVertical: 7,
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          fontSize: 11,
                          color: theme.colors.mutedForeground,
                        }}
                      >
                        Esperado en OT
                      </Text>
                      <Text
                        variant="label"
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                        }}
                      >
                        {formatBoxUnit(item.expectedBoxes, item.expectedQty - item.expectedBoxes * item.cajaSize, item.expectedQty)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 6,
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
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: accentColor,
                        }}
                      >
                        {formatBoxUnit(item.countedBoxes, item.countedUnits, item.countedQty)}
                      </Text>
                    </View>
                  </View>

                  {/* FILA 4: CANTIDAD CONSOLIDADA */}
                  <View
                    style={{
                      gap: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <BoxUnitCounter
                      value={currentCorrection}
                      onChange={(next) => handleCorrectionChange(item.id, next)}
                      cajaSize={item.cajaSize}
                      totalLabel="Total consolidado"
                      targetQty={item.expectedQty}
                      /* El botón comparte la fila del total en vez de gastar
                         una propia, y el hueco reserva su alto siempre para
                         que la card no crezca al aparecer. */
                      action={
                        <View
                          style={{
                            minHeight: theme.controlSizes.xs.height,
                            justifyContent: "center",
                          }}
                        >
                          {correccionSucia && (
                            <Button
                              label="Guardar corrección"
                              icon={Check}
                              variant="primary"
                              size="xs"
                              onPress={() => commitCorrection(item.id)}
                            />
                          )}
                        </View>
                      }
                    />
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
              {/* Elegir una causa es lo que confirma la corrección, así que el
                  copy lo dice: cerrar sin elegir la deja sin guardar. */}
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
                const isSelected =
                  pickerState.activeItemId != null &&
                  selectedTypes[pickerState.activeItemId] === cause;

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
