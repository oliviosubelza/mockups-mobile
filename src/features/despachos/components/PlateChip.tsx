import { Box, Text, useAppTheme } from "@/theme";

type Props = {
  placa: string;
};

/**
 * Licence plate rendered as a plate: bordered, tracked out, tabular.
 *
 * An icon beside the number needed a glyph that means "plate", and the only
 * honest one was a bare rectangle that explained nothing. Drawing the object
 * instead removes the icon and the ambiguity at once — the shape is the label.
 */
export function PlateChip({ placa }: Props) {
  const theme = useAppTheme();

  return (
    <Box
      borderWidth={theme.borderWidths.thin}
      borderColor="borderStrong"
      borderRadius="sm"
      backgroundColor="mutedBackground"
      paddingHorizontal="xs"
      paddingVertical="xxs"
      alignSelf="flex-start"
    >
      <Text
        variant="caption"
        color="foreground"
        fontFamily="Montserrat_600SemiBold"
        style={{ letterSpacing: 1, fontVariant: ["tabular-nums"] }}
      >
        {placa}
      </Text>
    </Box>
  );
}
