import { Truck } from "lucide-react-native";

import { Box, Text, useAppTheme } from "@/theme";
import { tonoOcupacion, type Ocupacion } from "../ocupacion";

type Props = {
  ocupacion: Ocupacion;
};

const TRACK_HEIGHT = 5;

/**
 * Truck occupancy as one scannable row: icon, figure, fill bar.
 *
 * The bar carries the comparison — stacked in a list, fill lengths line up so a
 * driver reads relative load without parsing numbers — and the figure carries
 * the precision the bar cannot.
 *
 * `ocupacion.pct` is still the higher of weight and volume, because that is the
 * one that answers "is there room left". Which of the two produced it is not
 * printed here: it changes nothing a driver does, and a label that flipped
 * between "peso" and "volumen" with no visible cause read as a glitch. The
 * breakdown stays on `Ocupacion` for the screens that plan loads.
 */
export function CapacityBar({ ocupacion }: Props) {
  const theme = useAppTheme();
  const tone = tonoOcupacion(ocupacion.pct);
  const color = theme.colors[tone];

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="s"
      accessibilityRole="progressbar"
      accessibilityLabel={`Camión al ${ocupacion.pct} por ciento de su capacidad`}
    >
      <Truck color={color} size={theme.iconSizes.sm} />

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
    </Box>
  );
}
