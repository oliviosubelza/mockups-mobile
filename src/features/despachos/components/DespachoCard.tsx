import { TouchableOpacity } from "react-native";
import {
  ChevronRight,
  Clock,
  Hash,
  ListOrdered,
  MapPin,
  Weight,
} from "lucide-react-native";

import { Badge } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";
import { ESTADO_META, type Despacho } from "../types";

type Props = {
  despacho: Despacho;
  sequence: number;
  onPress: () => void;
  /** Rendered only when provided — no placeholder, so every card stays truthful. */
  timeWindow?: string;
  weight?: string;
};

/** One metadata chip in the footer row: icon + short value. */
function MetaItem({
  icon: Icon,
  value,
}: {
  icon: typeof Clock;
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
export function DespachoCard({
  despacho,
  sequence,
  onPress,
  timeWindow,
  weight,
}: Props) {
  const theme = useAppTheme();
  const meta = ESTADO_META[despacho.estado];
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
            <Badge
              label={meta.label}
              tone={meta.tone}
              emphasis="solid"
              size="sm"
            />
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

          {/* Row 3: metadata */}
          <Box flexDirection="row" alignItems="center" gap="m" flexWrap="wrap">
            <MetaItem
              icon={ListOrdered}
              value={`${despacho.puntosCount} paradas`}
            />
            <MetaItem icon={Hash} value={despacho.id} />
            {timeWindow ? <MetaItem icon={Clock} value={timeWindow} /> : null}
            {weight ? <MetaItem icon={Weight} value={weight} /> : null}
          </Box>
        </Box>

        <ChevronRight
          color={theme.colors.mutedForeground}
          size={theme.iconSizes.lg}
        />
      </Box>
    </TouchableOpacity>
  );
}
