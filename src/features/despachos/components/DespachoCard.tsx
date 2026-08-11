import { TouchableOpacity } from "react-native";
import {
  ChevronRight,
  Hash,
  ListOrdered,
  MapPin,
  Truck,
} from "lucide-react-native";

import { Badge } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";
import { calcularOcupacion } from "../ocupacion";
import { ESTADO_META, type Despacho } from "../types";
import { CapacityBar } from "./CapacityBar";

type Props = {
  despacho: Despacho;
  sequence: number;
  onPress: () => void;
};

/** One metadata chip in the footer row: icon + short value. */
function MetaItem({
  icon: Icon,
  value,
}: {
  icon: typeof Hash;
  value: string;
}) {
  const theme = useAppTheme();

  return (
    <Box flexDirection="row" alignItems="center" gap="xxs">
      <Icon color={theme.colors.mutedForeground} size={theme.iconSizes.xs} />
      <Text variant="caption">{value}</Text>
    </Box>
  );
}

/** Transport-order list tile. Shows only fields that exist on `Despacho`. */
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

        <Box flex={1} gap="xs">
          {/* Row 1: OT code + status */}
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

          {/* Row 2: route */}
          <Box flexDirection="row" alignItems="center" gap="xs">
            <MapPin
              color={theme.colors.mutedForeground}
              size={theme.iconSizes.sm}
            />
            <Text variant="bodySmall" color="mutedForeground" numberOfLines={1}>
              {despacho.zonaRuta}
            </Text>
          </Box>

          {/* Row 3: identifiers and counts */}
          <Box flexDirection="row" alignItems="center" gap="m" flexWrap="wrap">
            <MetaItem
              icon={ListOrdered}
              value={`${despacho.puntosCount} paradas`}
            />
            <MetaItem icon={Truck} value={despacho.placa} />
            <MetaItem icon={Hash} value={despacho.id} />
          </Box>

          {/* Row 4: how full the truck is */}
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
