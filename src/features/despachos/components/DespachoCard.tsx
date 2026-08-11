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
  sequence: number;
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
export function DespachoCard({ despacho, sequence, onPress }: Props) {
  const theme = useAppTheme();
  const meta = ESTADO_META[despacho.estado];
  const ocupacion = calcularOcupacion(despacho);
  const badgeSize = theme.controlSizes.sm.height;

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
        {/* LEADING: sequence within the current (filtered) list */}
        <Box
          backgroundColor="secondary"
          borderRadius="full"
          width={badgeSize}
          height={badgeSize}
          alignItems="center"
          justifyContent="center"
        >
          {/* Montserrat ships one family per weight: the weight comes from
              fontFamily, not fontWeight, which RN would only fake. */}
          <Text variant="label" fontFamily="Montserrat_600SemiBold">
            {sequence}
          </Text>
        </Box>

        <Box flex={1} gap="s">
          {/* Row 1: what the order is */}
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            gap="s"
          >
            <Text variant="subtitle" numberOfLines={1}>
              OT-{despacho.codigo}
            </Text>
            <Badge label={meta.label} tone={meta.tone} size="sm" />
          </Box>

          {/* Row 2: where it goes, and which truck takes it */}
          <Box flexDirection="row" alignItems="center" gap="s">
            <Box flexDirection="row" alignItems="center" gap="xs" flex={1}>
              <MapPin
                color={theme.colors.mutedForeground}
                size={theme.iconSizes.sm}
              />
              <Text
                variant="bodySmall"
                color="mutedForeground"
                numberOfLines={1}
              >
                {despacho.zonaRuta} · {despacho.puntosCount} paradas
              </Text>
            </Box>
            <PlateChip placa={despacho.placa} />
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
