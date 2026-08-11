import { useState, useMemo, useEffect } from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import {
  PackageOpen,
  Layers,
  Truck,
  CheckCircle2,
  Clock,
} from "lucide-react-native";

import { findRouteById, navigateTo } from "@/navigation/registry";
import { SearchField, FilterChips, type FilterChipOption } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";
import { useDespachos } from "./store";
import { type Despacho, type EstadoDespacho } from "./types";
import { ListSkeleton } from "@/shared/ui/Skeleton";
import { DespachoCard } from "./components/DespachoCard";

export default function DespachosScreen() {
  const theme = useAppTheme();
  const despachos = useDespachos((state) => state.despachos);
  const setActive = useDespachos((state) => state.setActive);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"todos" | EstadoDespacho>("todos");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const statusCounts = useMemo(() => {
    const counts = {
      todos: despachos.length,
      pendiente: 0,
      cargado: 0,
      aprobado: 0,
    };
    despachos.forEach((d) => {
      if (d.estado in counts) {
        counts[d.estado as EstadoDespacho]++;
      }
    });
    return counts;
  }, [despachos]);

  const filterOptions: FilterChipOption<"todos" | EstadoDespacho>[] = useMemo(
    () => [
      {
        id: "todos",
        label: "Todos",
        icon: Layers,
        count: statusCounts.todos,
        activeBgColor: theme.colors.foreground,
        activeTextColor: theme.colors.mainBackground,
        activeBorderColor: theme.colors.foreground,
        badgeActiveBg: theme.colors.secondary,
        badgeActiveText: theme.colors.foreground,
      },
      {
        id: "pendiente",
        label: "Pendientes",
        icon: Clock,
        count: statusCounts.pendiente,
        activeBgColor: "#fef3c7",
        activeTextColor: "#92400e",
        activeBorderColor: "#f59e0b",
        badgeActiveBg: "#fde68a",
        badgeActiveText: "#78350f",
      },
      {
        id: "cargado",
        label: "Cargados",
        icon: Truck,
        count: statusCounts.cargado,
        activeBgColor: "#dbeafe",
        activeTextColor: "#1e40af",
        activeBorderColor: "#3b82f6",
        badgeActiveBg: "#bfdbfe",
        badgeActiveText: "#1e3a8a",
      },
      {
        id: "aprobado",
        label: "Aprobados",
        icon: CheckCircle2,
        count: statusCounts.aprobado,
        activeBgColor: "#dcfce7",
        activeTextColor: "#166534",
        activeBorderColor: "#22c55e",
        badgeActiveBg: "#bbf7d0",
        badgeActiveText: "#14532d",
      },
    ],
    [statusCounts, theme]
  );

  const despachosFiltrados = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return despachos.filter((d) => {
      const matchesSearch =
        !query ||
        d.codigo.toLowerCase().includes(query) ||
        d.zonaRuta.toLowerCase().includes(query) ||
        d.placa.toLowerCase().includes(query) ||
        // The card no longer prints the internal id, but keeping it searchable
        // costs nothing and back-office users still quote it.
        d.id.toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === "todos" || d.estado === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [despachos, searchQuery, selectedStatus]);

  const openChequeo = (despacho: Despacho) => {
    setActive(despacho.id);
    const route = findRouteById("despachos.chequeo");
    if (route) navigateTo(route);
  };

  const hasActiveFilters = searchQuery.length > 0 || selectedStatus !== "todos";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <View style={{ gap: 12 }}>
          <Text variant="title">Órdenes de Transporte</Text>
          {/* COMPONENTE REUTILIZABLE DE BÚSQUEDA */}
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por OT, placa o ruta..."
          />

          {/* COMPONENTE REUTILIZABLE DE CHIPS DE FILTRO */}
          <FilterChips
            options={filterOptions}
            selectedId={selectedStatus}
            onSelect={setSelectedStatus}
          />

          {/* INFORMACIÓN DE RESULTADOS Y LIMPIAR FILTROS */}
          <Box
            paddingHorizontal="xs"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text variant="caption">
              {hasActiveFilters
                ? `Mostrando ${despachosFiltrados.length} de ${despachos.length} órdenes`
                : `${despachos.length} órdenes en total`}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedStatus("todos");
                }}
              >
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primary, fontWeight: "600" }}
                >
                  Limpiar filtros
                </Text>
              </TouchableOpacity>
            )}
          </Box>

          {/* LISTA COMPACTA EN TIPO LIST TILE */}
          {despachosFiltrados.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
                gap: 12,
              }}
            >
              <PackageOpen color={theme.colors.mutedForeground} size={64} />
              <Text
                variant="label"
                style={{ color: theme.colors.mutedForeground, textAlign: "center", fontSize: 16 }}
              >
                No encontramos la orden "{searchQuery}"
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {despachosFiltrados.map((despacho) => (
                <DespachoCard
                  key={despacho.id}
                  despacho={despacho}
                  onPress={() => openChequeo(despacho)}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

