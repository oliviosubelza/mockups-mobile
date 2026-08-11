import { Boxes, Weight } from "lucide-react-native";

import { Box, Text, useAppTheme } from "@/theme";
import { tonoOcupacion, type Ocupacion } from "../ocupacion";

type Props = {
  ocupacion: Ocupacion;
};

const TRACK_HEIGHT = 5;

/**
 * Truck occupancy as one scannable row: icon, figure, fill bar, binding limit.
 *
 * The bar carries the comparison — stacked in a list, fill lengths line up so a
 * driver reads relative load without parsing five numbers. The figure carries
 * the precision the bar cannot. `limitante` is the part a bare percentage hides:
 * "88% volumen" tells you the box is full, not that the truck is light.
 */
export function CapacityBar({ ocupacion }: Props) {
  const theme = useAppTheme();
  const tone = tonoOcupacion(ocupacion.pct);
  const color = theme.colors[tone];
  const LimitIcon = ocupacion.limitante === 'peso' ? Weight : Boxes;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="s"
      accessibilityRole="progressbar"
      accessibilityLabel={`Camión al ${ocupacion.pct} por ciento, limitado por ${ocupacion.limitante}`}
    >
      {/* No single glyph means "weight or volume", so the icon shows whichever
          limit is actually binding — the same thing the trailing label names. */}
      <LimitIcon color={color} size={theme.iconSizes.sm} />

      {/* Fixed width so the bars below each other start on the same x. */}
      <Text
        variant="caption"
        fontFamily="Montserrat_600SemiBold"
        color={tone}
        style={{ minWidth: 34, fontVariant: ["tabular-nums"] }}
      >
        {ocupacion.pct}%
      </Text>

      <Box
        flex={1}
        height={TRACK_HEIGHT}
        borderRadius="full"
        backgroundColor="mutedBackground"
        overflow="hidden"
      >
        {/* Clamped: an overloaded truck still reads 104% in the figure, but a
            bar longer than its track would just look like a render bug. */}
        <Box
          height={TRACK_HEIGHT}
          borderRadius="full"
          width={`${Math.min(ocupacion.pct, 100)}%`}
          style={{ backgroundColor: color }}
        />
      </Box>

      <Text variant="caption">{ocupacion.limitante}</Text>
    </Box>
  );
}
