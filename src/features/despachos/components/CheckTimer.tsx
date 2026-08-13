import { Timer } from "lucide-react-native";

import { Box, Text, useAppTheme } from "@/theme";
import { formatDuration, useElapsedMs } from "../checkTimer";
import type { CheckSession } from "../types";

type Props = {
  /** `undefined` until the driver registers the first product. */
  session?: CheckSession;
};

/**
 * Blind-count stopwatch. Renders nothing before the first product is
 * registered, so an untouched order shows no clock at all.
 */
export function CheckTimer({ session }: Props) {
  const theme = useAppTheme();
  const elapsed = useElapsedMs(
    session?.startedAt ?? null,
    session?.finishedAt ?? null,
  );

  if (!session) return null;

  const running = session.finishedAt === null;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="xs"
      paddingHorizontal="s"
      paddingVertical="xs"
      borderRadius="md"
      backgroundColor={running ? "primarySoft" : "mutedBackground"}
    >
      <Timer
        size={theme.iconSizes.sm}
        color={running ? theme.colors.primary : theme.colors.mutedForeground}
      />
      <Text
        variant="label"
        fontFamily="Montserrat_600SemiBold"
        color={running ? "primary" : "mutedForeground"}
        // Digits must not reflow the row as the seconds tick.
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {formatDuration(elapsed)}
      </Text>
    </Box>
  );
}
