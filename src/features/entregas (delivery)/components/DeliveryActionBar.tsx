import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/shared/ui";
import { Text, useAppTheme } from "@/theme";

export type DeliveryActionBarProps = {
  /** Etiqueta del monto. Cadena vacia si la fase no tiene monto que explicar. */
  amountLabel: string;
  /** Monto ya formateado por la pantalla, ej. "Bs. 3800.00". */
  amountValue: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  actionIcon?: LucideIcon;
  tone?: "primary" | "success";
};

/**
 * Barra de accion fija al pie de la pantalla de entrega.
 *
 * Es el unico elemento en negrita de la pantalla: a la izquierda el monto de la
 * fase, a la derecha la unica accion que corresponde en ese momento. Vive fuera
 * del ScrollView, por lo que el contenido scrolleable debe reservar el espacio
 * inferior equivalente.
 */
export function DeliveryActionBar({
  amountLabel,
  amountValue,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionIcon,
  tone = "primary",
}: DeliveryActionBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: theme.colors.cardBackground,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      {/* MONTO DE LA FASE: LA CIFRA MANDA, LA ETIQUETA LA EXPLICA */}
      <View style={{ flexShrink: 1, gap: 1 }}>
        <Text
          variant="title"
          numberOfLines={1}
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.colors.foreground,
            fontVariant: ["tabular-nums"],
          }}
        >
          {amountValue}
        </Text>
        {amountLabel ? (
          <Text
            variant="caption"
            numberOfLines={1}
            style={{ fontSize: 11, color: theme.colors.mutedForeground }}
          >
            {amountLabel}
          </Text>
        ) : null}
      </View>

      {/* ACCION UNICA DE LA FASE. NO SE ENCOGE FRENTE AL MONTO. */}
      <View style={{ flexShrink: 0 }}>
        <Button
          label={actionLabel}
          icon={actionIcon}
          variant={tone === "success" ? "success" : "primary"}
          size="lg"
          disabled={actionDisabled}
          onPress={onAction}
        />
      </View>
    </View>
  );
}
