import {
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  RotateCcw,
  StickyNote,
  X
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  TextInput,
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

const DATES_WITH_REPORTS = [
  "2026-08-05",
  "2026-08-04",
  "2026-08-01",
  "2026-07-28",
];

export type DateFilterMode = "ALL" | "RANGE";

export default function ProductosFaltantesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<
    "all" | "shortage" | "surplus" | "cold"
  >("all");

  // ESTADO DE FILTRADO POR FECHA (VÍA CALENDARIO)
  const [dateMode, setDateMode] = useState<DateFilterMode>("ALL");
  const [selectedStartDate, setSelectedStartDate] =
    useState<string>("2026-08-05");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("2026-08-05");
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // Agosto (0-indexed)

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

  // MODAL SELECTOR DE TIPO DE DIFERENCIA
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    activeItemId: string | null;
  }>({
    visible: false,
    activeItemId: null,
  });

  // OBSERVACIÓN DEL SUPERVISOR POR ÍTEM
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [noteState, setNoteState] = useState<{
    visible: boolean;
    activeItemId: string | null;
  }>({
    visible: false,
    activeItemId: null,
  });
  const [noteDraft, setNoteDraft] = useState("");

  const handleCorrectionChange = (itemId: string, next: BoxUnitValue) => {
    setCorrections((prev) => ({ ...prev, [itemId]: next }));
  };

  const handleSelectType = (type: string) => {
    if (pickerState.activeItemId) {
      setSelectedTypes((prev) => ({
        ...prev,
        [pickerState.activeItemId!]: type,
      }));
    }
    setPickerState({ visible: false, activeItemId: null });
  };

  const openNoteModal = (itemId: string) => {
    setNoteDraft(observations[itemId] ?? "");
    setNoteState({ visible: true, activeItemId: itemId });
  };

  const closeNoteModal = () => {
    setNoteState({ visible: false, activeItemId: null });
    setNoteDraft("");
  };

  // GUARDA LA OBSERVACIÓN; SI QUEDA VACÍA, LA ELIMINA DEL REGISTRO
  const handleSaveNote = () => {
    const { activeItemId } = noteState;
    if (!activeItemId) return;

    const trimmed = noteDraft.trim();
    setObservations((prev) => {
      const next = { ...prev };
      if (trimmed.length === 0) delete next[activeItemId];
      else next[activeItemId] = trimmed;
      return next;
    });

    closeNoteModal();
  };

  const isDateInActiveFilter = (dateStr: string): boolean => {
    if (dateMode === "ALL") return true;
    if (dateMode === "RANGE") {
      const minDate =
        selectedStartDate < selectedEndDate
          ? selectedStartDate
          : selectedEndDate;
      const maxDate =
        selectedStartDate < selectedEndDate
          ? selectedEndDate
          : selectedStartDate;
      return dateStr >= minDate && dateStr <= maxDate;
    }
    return true;
  };

  const getDateFilterTitle = (): string => {
    if (dateMode === "ALL") return "Todas las Fechas";
    if (selectedStartDate === selectedEndDate) {
      const parts = selectedStartDate.split("-");
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const startP = selectedStartDate.split("-");
    const endP = selectedEndDate.split("-");
    return `${startP[2]}/${startP[1]} - ${endP[2]}/${endP[1]}`;
  };

  const handleCalendarDayPress = (formattedDateStr: string) => {
    if (
      dateMode !== "RANGE" ||
      (selectedStartDate &&
        selectedEndDate &&
        selectedStartDate !== selectedEndDate)
    ) {
      setDateMode("RANGE");
      setSelectedStartDate(formattedDateStr);
      setSelectedEndDate(formattedDateStr);
    } else {
      if (formattedDateStr < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(formattedDateStr);
      } else {
        setSelectedEndDate(formattedDateStr);
      }
    }
  };

  // FILTRADO PLANO DE ÍTEMS DE DISCREPANCIA (CADA OCURRENCIA POR SEPARADO)
  const filteredDiscrepancies = FLAT_MOCK_DISCREPANCIES.filter((item) => {
    // Filtro por fecha
    if (!isDateInActiveFilter(item.date)) return false;

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

  // ÍTEM ACTIVO DEL MODAL DE OBSERVACIÓN
  const noteItem =
    FLAT_MOCK_DISCREPANCIES.find((i) => i.id === noteState.activeItemId) ??
    null;

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

  // GRID INTERACTIVA DE CALENDARIO VISUAL
  const renderCalendarGrid = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dayNumber: null, key: `empty-prev-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = (currentMonth + 1).toString().padStart(2, "0");
      const dayStr = day.toString().padStart(2, "0");
      const fullDateStr = `${currentYear}-${monthStr}-${dayStr}`;

      cells.push({
        dayNumber: day,
        dateStr: fullDateStr,
        key: fullDateStr,
        hasReport: DATES_WITH_REPORTS.includes(fullDateStr),
      });
    }

    const minSel =
      selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate;
    const maxSel =
      selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate;

    return (
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            style={{
              padding: 6,
              borderRadius: 8,
              backgroundColor: theme.colors.secondary,
            }}
          >
            <ChevronLeft size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <Text
            variant="label"
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: theme.colors.foreground,
            }}
          >
            {monthNames[currentMonth]} {currentYear}
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            style={{
              padding: 6,
              borderRadius: 8,
              backgroundColor: theme.colors.secondary,
            }}
          >
            <ChevronRight size={20} color={theme.colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(
            (dayName, idx) => (
              <View key={idx} style={{ width: 38, alignItems: "center" }}>
                <Text
                  variant="caption"
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color:
                      idx === 0 || idx === 6
                        ? theme.colors.primary
                        : theme.colors.mutedForeground,
                  }}
                >
                  {dayName}
                </Text>
              </View>
            ),
          )}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((cell) => {
            if (!cell.dayNumber) {
              return (
                <View
                  key={cell.key}
                  style={{ width: `${100 / 7}%`, height: 42 }}
                />
              );
            }

            const isSelected =
              dateMode === "RANGE" &&
              cell.dateStr >= minSel &&
              cell.dateStr <= maxSel;
            const isToday = cell.dateStr === "2026-08-05";

            return (
              <TouchableOpacity
                key={cell.key}
                onPress={() => handleCalendarDayPress(cell.dateStr!)}
                activeOpacity={0.7}
                style={{
                  width: `${100 / 7}%`,
                  height: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  marginVertical: 2,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : isToday
                        ? theme.colors.primarySoft
                        : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: isToday && !isSelected ? 1.5 : 0,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected || isToday ? "800" : "500",
                      color: isSelected
                        ? "#ffffff"
                        : isToday
                          ? theme.colors.primary
                          : theme.colors.foreground,
                    }}
                  >
                    {cell.dayNumber}
                  </Text>

                  {cell.hasReport && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 3,
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: isSelected
                          ? "#ffffff"
                          : theme.colors.danger,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
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

        {/* CAMPO DE BÚSQUEDA */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por SKU, producto u orden (OT)..."
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
            onPress={() => {
              setActiveTypeFilter("all");
              setDateMode("ALL");
            }}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === "all" && dateMode === "ALL"
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === "all" && dateMode === "ALL"
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
                  activeTypeFilter === "all" && dateMode === "ALL"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              Todos ({filteredDiscrepancies.length})
            </Text>
          </TouchableOpacity>

          {/* 2. CALENDARIO */}
          <TouchableOpacity
            onPress={() => setIsCalendarModalVisible(true)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                dateMode !== "ALL"
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                dateMode !== "ALL" ? theme.colors.primary : theme.colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}
          >
            <CalendarIcon
              size={14}
              color={dateMode !== "ALL" ? "#ffffff" : theme.colors.primary}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: dateMode !== "ALL" ? "#ffffff" : theme.colors.foreground,
              }}
            >
              {dateMode !== "ALL" ? `📅 ${getDateFilterTitle()}` : "Calendario"}
            </Text>
          </TouchableOpacity>

          {/* 3. FALTANTES */}
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

          {/* 4. SOBRANTES */}
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

          {/* 5. CADENA DE FRÍO */}
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

        {/* ETIQUETA INFORMATIVA SI EL FILTRO DE FECHA ESTÁ ACTIVO */}
        {dateMode !== "ALL" && (
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <CalendarIcon size={13} color={theme.colors.primary} />
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.colors.primary,
                }}
              >
                Filtrado por fecha: {getDateFilterTitle()}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setDateMode("ALL")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <RotateCcw size={12} color={theme.colors.primary} />
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.colors.primary,
                }}
              >
                Limpiar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTADO PLANO Y COMPACTO DE ÍTEMS CON DIFERENCIA */}
        {filteredDiscrepancies.length === 0 ? (
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
            <CalendarIcon size={36} color={theme.colors.mutedForeground} />
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
                setDateMode("ALL");
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
        ) : (
          <View style={{ gap: 10 }}>
            {filteredDiscrepancies.map((item) => {
              const isShortage = item.difference < 0;
              const accentColor = isShortage
                ? theme.colors.danger
                : theme.colors.warning;
              const currentCorrection = corrections[item.id] ?? EMPTY_BOX_UNIT;
              const isMatched =
                boxUnitTotal(currentCorrection, item.cajaSize) ===
                item.expectedQty;
              const currentSelectedType =
                selectedTypes[item.id] || item.differenceType;
              const hasNote = (observations[item.id] ?? "").trim().length > 0;

              return (
                <Card
                  key={item.id}
                  onPress={() => handleNavigateToConsolidation(item.orderCode)}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={1}
                  style={{ gap: 8 }}
                >
                  {/* FILA 1: SKU + FRÍO + BADGE DE DIFERENCIA */}
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
                        variant="label"
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: theme.colors.mutedForeground,
                        }}
                      >
                        {item.codigo}
                      </Text>
                      {item.isColdChain && (
                        <Badge
                          label="❄️ Frío"
                          tone="neutral"
                          emphasis="soft"
                          size="sm"
                        />
                      )}
                    </View>

                    <Badge
                      label={
                        item.difference > 0
                          ? `+${item.difference} Sobrante`
                          : `${item.difference} Faltante`
                      }
                      tone={item.difference > 0 ? "warning" : "danger"}
                      emphasis="soft"
                      size="sm"
                    />
                  </View>

                  {/* FILA 2: NOMBRE DEL PRODUCTO */}
                  <Text
                    variant="subtitle"
                    numberOfLines={2}
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: theme.colors.foreground,
                    }}
                  >
                    {item.nombre}
                  </Text>

                  {/* FILA 3: PROCEDENCIA EN UNA SOLA LÍNEA (OT · CHOFER · FECHA) */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <FileText size={12} color={theme.colors.primary} />
                    <Text
                      variant="caption"
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: theme.colors.foreground,
                        flexShrink: 1,
                      }}
                    >
                      {item.orderCode}
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 11,
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      ·
                    </Text>
                    <Text
                      variant="caption"
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        color: theme.colors.mutedForeground,
                        flex: 1,
                      }}
                    >
                      {item.driverName}
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 11,
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      {item.dateFormatted}
                    </Text>
                  </View>

                  {/* FILA 4: COMPARATIVO ESPERADO VS CONTADO */}
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

                  {/* FILA 5: CONTROLES DE CONSOLIDACIÓN */}
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
                    />

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        variant="label"
                        numberOfLines={2}
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                          flex: 1,
                        }}
                      >
                        Clasificación
                      </Text>

                      <TouchableOpacity
                        onPress={() =>
                          setPickerState({
                            visible: true,
                            activeItemId: item.id,
                          })
                        }
                        activeOpacity={0.7}
                        style={{
                          flex: 1.4,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 6,
                          backgroundColor: theme.colors.secondary,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 34,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Text
                          variant="caption"
                          numberOfLines={1}
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: theme.colors.foreground,
                            flex: 1,
                          }}
                        >
                          {currentSelectedType}
                        </Text>
                        <ChevronDown
                          size={15}
                          color={theme.colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* FILA 6: OBSERVACIÓN DEL SUPERVISOR + ACCESO AL DETALLE */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      paddingTop: 6,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => openNoteModal(item.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 1,
                      }}
                    >
                      <StickyNote
                        size={13}
                        color={
                          hasNote
                            ? theme.colors.primary
                            : theme.colors.mutedForeground
                        }
                      />
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: hasNote
                            ? theme.colors.primary
                            : theme.colors.mutedForeground,
                          flexShrink: 1,
                        }}
                      >
                        {hasNote ? "Ver observación" : "Agregar observación"}
                      </Text>
                      {hasNote && (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: theme.colors.primary,
                          }}
                        />
                      )}
                    </TouchableOpacity>

                    <View
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
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL SHEET DE OBSERVACIÓN DEL SUPERVISOR */}
      <Modal
        visible={noteState.visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeNoteModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(20, insets.bottom + 12),
              gap: 14,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 1,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StickyNote size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text
                    variant="label"
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: theme.colors.foreground,
                    }}
                  >
                    Observación
                  </Text>
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {noteItem
                      ? `${noteItem.codigo} · ${noteItem.orderCode}`
                      : ""}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={closeNoteModal} style={{ padding: 4 }}>
                <X size={22} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Ej. Se verificó con el chofer, faltaban 3 unidades desde el despacho."
              placeholderTextColor={theme.colors.mutedForeground}
              multiline
              textAlignVertical="top"
              maxLength={280}
              style={{
                minHeight: 110,
                backgroundColor: theme.colors.secondary,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: theme.colors.border,
                padding: 12,
                fontSize: 13,
                color: theme.colors.foreground,
              }}
            />

            <Text
              variant="caption"
              style={{
                fontSize: 11,
                color: theme.colors.mutedForeground,
                textAlign: "right",
              }}
            >
              {noteDraft.length}/280
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={closeNoteModal}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.secondary,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: theme.colors.foreground,
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveNote}
                activeOpacity={0.8}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Check size={16} strokeWidth={3} color="#ffffff" />
                <Text
                  style={{ fontSize: 13, fontWeight: "800", color: "#ffffff" }}
                >
                  Guardar Observación
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text
                variant="label"
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: theme.colors.foreground,
                }}
              >
                Seleccionar Tipo de Diferencia
              </Text>
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

      {/* MODAL INTERACTIVO DE CALENDARIO VISUAL */}
      <Modal
        visible={isCalendarModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsCalendarModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(20, insets.bottom + 12),
              gap: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 10,
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
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CalendarIcon size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text
                    variant="label"
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: theme.colors.foreground,
                    }}
                  >
                    Calendario de Faltantes
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    Toca un día o rango de días en el calendario
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsCalendarModalVisible(false)}
                style={{ padding: 4 }}
              >
                <X size={22} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {renderCalendarGrid()}

            <TouchableOpacity
              onPress={() => setIsCalendarModalVisible(false)}
              activeOpacity={0.8}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                marginTop: 4,
              }}
            >
              <Check size={18} color="#ffffff" />
              <Text
                style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}
              >
                Aplicar Rango ({getDateFilterTitle()})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Box>
  );
}
