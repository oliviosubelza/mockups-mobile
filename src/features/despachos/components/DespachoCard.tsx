import { TouchableOpacity } from "react-native";
import { ChevronRight, MapPin } from "lucide-react-native";

import { Badge } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";
import { calcularOcupacion } from "../ocupacion";
import { ESTADO_META, type Despacho } from "../types";
import { CapacityBar } from "./CapacityBar";
import { PlateChip } from "./PlateChip";

type Props = {
  despacho: Despacho;
  onPress: () => void;
};

/**
 * Transport-order list tile, in three rows: what the order is, where it goes,
 * how full the truck is.
 *
 * The stop count rides on the route line rather than carrying its own icon, and
 * the internal dispatch id is not shown at all — the OT code already identifies
 * the order, and a database key earns no room on a driver's card.
 */
export function DespachoCard({ despacho, onPress }: Props) {
  const theme = useAppTheme();
  const meta = ESTADO_META[despacho.estado] ?? {
    label: despacho.estado || "Pendiente",
    tone: "neutral" as const,
  };
  const ocupacion = calcularOcupacion(despacho);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="m"
        backgroundColor="cardBackground"
        borderColor="border"
        borderWidth={theme.borderWidths.thin}
        borderRadius="xl"
        padding="m"
      >
        <Box flex={1} gap="s">
          {/* Row 1: OT Code, Plate, and Status Badge */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            gap="xs"
          >
            <Box flexDirection="row" alignItems="center" gap="xs" flex={1} style={{ minWidth: 0 }}>
              <Text variant="subtitle" numberOfLines={1} style={{ flexShrink: 0 }}>
                OT-{despacho.codigo}
              </Text>
              <PlateChip placa={despacho.placa} />
            </Box>
            <Badge label={meta.label} tone={meta.tone} size="sm" />
          </Box>

          {/* Row 2: Route zone & stop count */}
          <Box flexDirection="row" alignItems="center" gap="xs">
            <MapPin
              color={theme.colors.mutedForeground}
              size={theme.iconSizes.sm}
            />
            <Text
              variant="bodySmall"
              color="mutedForeground"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ flex: 1 }}
            >
              {despacho.zonaRuta} · {despacho.puntosCount} paradas
            </Text>
          </Box>

          {/* Row 3: how full the truck is */}
          <CapacityBar ocupacion={ocupacion} />
        </Box>

        <ChevronRight
          color={theme.colors.mutedForeground}
          size={theme.iconSizes.lg}
        />
      </Box>
    </TouchableOpacity>
  );
}
