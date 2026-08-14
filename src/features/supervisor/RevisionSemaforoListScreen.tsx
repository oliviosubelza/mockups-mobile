import { ShieldAlert, Snowflake } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findRouteById, navigateTo } from "@/navigation/registry";
import { Badge, SearchField } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";

import { SemaforoOrderCard } from "./components/SemaforoOrderCard";

import { useSupervisorStore, type SemaforoOrderItem } from "./store";

export type SemaforoAuditItem = SemaforoOrderItem;

export default function RevisionSemaforoListScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const semaforoOrders = useSupervisorStore((state) => state.semaforoOrders);
  const setActiveSemaforoId = useSupervisorStore((state) => state.setActiveSemaforoId);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<"all" | "cold">(
    "all",
  );

  const filteredOrders = semaforoOrders.filter((order) => {
    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.zonaRuta.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTypeFilter === "cold") return order.isColdChain;

    return true;
  });

  const totalColdCount = semaforoOrders.filter(
    (o) => o.isColdChain,
  ).length;

  const handleStartSemaforoExecute = (orderId: string) => {
    setActiveSemaforoId(orderId);
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
        {/* BUSCADOR */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por OT, chofer, ruta..."
        />

        {/* BARRA DE FILTROS RÁPIDOS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
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
              Todos ({semaforoOrders.length})
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
          {filteredOrders.map((order) => (
            <SemaforoOrderCard
              key={order.id}
              order={order}
              onStart={() => handleStartSemaforoExecute(order.id)}
            />
          ))}
        </View>
      </ScrollView>
    </Box>
  );
}
