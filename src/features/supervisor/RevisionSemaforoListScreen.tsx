import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  ShieldAlert,
  Snowflake,
  Truck,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findRouteById, navigateTo } from "@/navigation/registry";
import { Badge, SearchField } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";

export interface SemaforoAuditItem {
  id: string;
  orderCode: string;
  driverName: string;
  zonaRuta: string;
  date: string; // ISO YYYY-MM-DD
  dateFormatted: string;
  totalProducts: number;
  isColdChain: boolean;
  hasDiscrepancy: boolean;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  counts: {
    driver: { status: "COMPLETED"; user: string; time: string };
    consolidator: {
      status: "COMPLETED" | "PENDING";
      user?: string;
      time?: string;
    };
    semaphoreAuditor: {
      status: "COMPLETED" | "PENDING";
      user?: string;
      time?: string;
    };
  };
}

const MOCK_SEMAFORO_ORDERS: SemaforoAuditItem[] = [
  {
    id: "sem-1",
    orderCode: "OT-4892",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Norte • Santa Cruz",
    date: "2026-08-05",
    dateFormatted: "Hoy, 14:20",
    totalProducts: 4,
    isColdChain: true,
    hasDiscrepancy: true,
    status: "PENDING",
    counts: {
      driver: {
        status: "COMPLETED",
        user: "Cristhian Macchiavelli (Chofer)",
        time: "13:10",
      },
      consolidator: {
        status: "COMPLETED",
        user: "Carlos Mendoza (Supervisor)",
        time: "14:20",
      },
      semaphoreAuditor: { status: "PENDING" },
    },
  },
  {
    id: "sem-2",
    orderCode: "OT-5109",
    driverName: "Roberto Gómez",
    zonaRuta: "Ruta Plan 3000 • Sector Comercial",
    date: "2026-08-04",
    dateFormatted: "Ayer, 11:15",
    totalProducts: 5,
    isColdChain: true,
    hasDiscrepancy: true,
    status: "COMPLETED",
    counts: {
      driver: {
        status: "COMPLETED",
        user: "Roberto Gómez (Chofer)",
        time: "10:45",
      },
      consolidator: {
        status: "COMPLETED",
        user: "Laura Vargas (Supervisor)",
        time: "11:15",
      },
      semaphoreAuditor: {
        status: "COMPLETED",
        user: "Juan Pérez (Auditor)",
        time: "12:00",
      },
    },
  },
  {
    id: "sem-3",
    orderCode: "OT-5011",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Equipetrol",
    date: "2026-08-01",
    dateFormatted: "01 Ago 12:45",
    totalProducts: 6,
    isColdChain: false,
    hasDiscrepancy: false,
    status: "COMPLETED",
    counts: {
      driver: {
        status: "COMPLETED",
        user: "Cristhian Macchiavelli (Chofer)",
        time: "12:00",
      },
      consolidator: {
        status: "COMPLETED",
        user: "Carlos Mendoza (Supervisor)",
        time: "12:45",
      },
      semaphoreAuditor: {
        status: "COMPLETED",
        user: "Juan Pérez (Auditor)",
        time: "13:30",
      },
    },
  },
  {
    id: "sem-4",
    orderCode: "OT-4750",
    driverName: "Cristhian Macchiavelli",
    zonaRuta: "Ruta Equipetrol",
    date: "2026-07-28",
    dateFormatted: "28 Jul 09:30",
    totalProducts: 3,
    isColdChain: false,
    hasDiscrepancy: true,
    status: "PENDING",
    counts: {
      driver: {
        status: "COMPLETED",
        user: "Cristhian Macchiavelli (Chofer)",
        time: "09:00",
      },
      consolidator: { status: "PENDING" },
      semaphoreAuditor: { status: "PENDING" },
    },
  },
];

export default function RevisionSemaforoListScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "cold">(
    "all",
  );

  const filteredOrders = MOCK_SEMAFORO_ORDERS.filter((order) => {
    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.zonaRuta.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTypeFilter === "cold") return order.isColdChain;

    return true;
  });

  const totalColdCount = MOCK_SEMAFORO_ORDERS.filter(
    (o) => o.isColdChain,
  ).length;

  const handleStartSemaforoExecute = (orderCode: string) => {
    const route = findRouteById("supervisor.semaforoEjecutar");
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
          gap: 14,
        }}
      >
        {/* BANNER INFORMATIVO PRINCIPAL */}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ShieldAlert size={18} color={theme.colors.primary} />
            <Text
              variant="label"
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: theme.colors.foreground,
                flex: 1,
              }}
              numberOfLines={1}
            >
              Auditoría Semáforo • Conteo a Ciegas
            </Text>
          </View>

          <Text
            variant="caption"
            style={{ fontSize: 12, color: theme.colors.mutedForeground }}
          >
            Auditoría física realizada por el Supervisor/Auditor sin visualizar
            las cantidades esperadas.
          </Text>
        </View> */}

        {/* CAMPO DE BÚSQUEDA */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar orden, chofer o ruta..."
        />

        {/* FILTROS RÁPIDOS STANDARDIZADOS (SIN CALENDARIO) */}
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
              paddingHorizontal: 14,
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
                fontSize: 12,
                fontWeight: "700",
                color:
                  activeTypeFilter === "all"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              Todos ({MOCK_SEMAFORO_ORDERS.length})
            </Text>
          </TouchableOpacity>

          {/* 2. CADENA DE FRÍO */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter("cold")}
            style={{
              paddingHorizontal: 14,
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
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Snowflake
              size={13}
              color={
                activeTypeFilter === "cold" ? "#ffffff" : theme.colors.primary
              }
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  activeTypeFilter === "cold"
                    ? "#ffffff"
                    : theme.colors.foreground,
              }}
            >
              Cadena de Frío ({totalColdCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* LISTADO DE ORDENES DE TRANSPORTE PARA REVISIÓN SEMÁFORO */}
        <View style={{ gap: 18 }}>
          {filteredOrders.map((order) => {
            return (
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
                {/* FILA 1: CÓDIGO DE OT + BADGES DE PRODUCTOS Y FRÍO */}
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
                    }}
                  >
                    <FileText size={16} color={theme.colors.primary} />
                    <Text
                      variant="header"
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: theme.colors.foreground,
                      }}
                    >
                      {order.orderCode}
                    </Text>
                    {order.isColdChain && (
                      <Badge
                        label="❄️ Frío"
                        tone="neutral"
                        emphasis="soft"
                        size="sm"
                      />
                    )}
                  </View>

                  <Badge
                    label={`${order.totalProducts} Productos`}
                    tone="neutral"
                    emphasis="soft"
                    size="sm"
                  />
                </View>

                {/* FILA 2: DATOS DEL CHOFER Y RUTA EN FILAS SEPARADAS */}
                <View
                  style={{
                    backgroundColor: theme.colors.secondary,
                    borderRadius: 10,
                    padding: 8,
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Truck size={13} color={theme.colors.mutedForeground} />
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: theme.colors.foreground,
                      }}
                    >
                      Chofer: {order.driverName}
                    </Text>
                  </View>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                      marginLeft: 19,
                    }}
                  >
                    Ruta: {order.zonaRuta}
                  </Text>
                </View>

                {/* FILA 3: HISTORIAL DE INSPECCIÓN MULTI-USUARIO */}
                <View style={{ gap: 4 }}>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    Historial de Conteo a Ciegas:
                  </Text>

                  <View style={{ gap: 4, paddingLeft: 4 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={12} color={theme.colors.success} />
                      <Text
                        variant="caption"
                        style={{ fontSize: 11, color: theme.colors.foreground }}
                      >
                        <Text style={{ fontWeight: "700" }}>1º Chofer:</Text>{" "}
                        {order.counts.driver.user} ({order.counts.driver.time})
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {order.counts.consolidator.status === "COMPLETED" ? (
                        <CheckCircle2 size={12} color={theme.colors.success} />
                      ) : (
                        <Clock size={12} color={theme.colors.mutedForeground} />
                      )}
                      <Text
                        variant="caption"
                        style={{ fontSize: 11, color: theme.colors.foreground }}
                      >
                        <Text style={{ fontWeight: "700" }}>
                          2º Supervisor Consolidador:
                        </Text>{" "}
                        {order.counts.consolidator.user ||
                          "Pendiente de consolidación"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* BOTÓN DE ACCIÓN PRINCIPAL */}
                <TouchableOpacity
                  onPress={() => handleStartSemaforoExecute(order.orderCode)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <ShieldAlert size={16} color="#ffffff" />
                  <Text
                    style={{
                      color: "#ffffff",
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    Iniciar Conteo a Ciegas Semáforo
                  </Text>
                  <ChevronRight size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Box>
  );
}
