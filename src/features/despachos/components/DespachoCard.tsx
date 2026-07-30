import { View, TouchableOpacity } from "react-native";
import { ChevronRight, Clock, ListOrdered, MapPin, Weight } from "lucide-react-native";

import { Badge } from "@/shared/ui";
import { Text, useAppTheme } from "@/theme";
import { ESTADO_META, type Despacho } from "../types";

type Props = {
  despacho: Despacho;
  sequence: number;
  onPress: () => void;
  paradas?: string;
  timeWindow?: string;
  weight?: string;
};

/** Reusable list tile item for Despacho orders with full dark mode support */
export function DespachoCard({
  despacho,
  sequence,
  onPress,
  paradas = "12 paradas",
  timeWindow = "7hr",
  weight = "120 kg",
}: Props) {
  const theme = useAppTheme();
  const meta = ESTADO_META[despacho.estado];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.cardBackground,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      {/* LEADING: Secuencia badge */}
      <View
        style={{
          backgroundColor: theme.colors.secondary,
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
        }}
      >
        <Text
          variant="label"
          style={{
            fontWeight: "700",
            color: theme.colors.foreground,
            fontSize: 14,
          }}
        >
          {sequence}
        </Text>
      </View>

      {/* BODY: Información compacta */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        {/* Fila 1: Código OT + Badge de Estado */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <Text
            variant="label"
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: theme.colors.foreground,
            }}
          >
            OT-{despacho.codigo}
          </Text>
          <Badge label={meta.label} tone={meta.tone} emphasis="soft" size="sm" />
        </View>

        {/* Fila 2: Cliente & ID SAP */}
        <Text
          variant="label"
          style={{
            color: theme.colors.mutedForeground,
            fontSize: 13,
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {despacho.cliente} • ID: {despacho.id}
        </Text>

        {/* Fila 3: Metadatos en línea ultra compacta */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <ListOrdered color={theme.colors.mutedForeground} size={12} />
            <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
              {paradas}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Clock color={theme.colors.mutedForeground} size={12} />
            <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
              {timeWindow}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Weight color={theme.colors.mutedForeground} size={12} />
            <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
              {weight}
            </Text>
          </View>
        </View>
      </View>

      {/* TRAILING: Chevron Right */}
      <View style={{ marginLeft: 8 }}>
        <ChevronRight color={theme.colors.mutedForeground} size={20} />
      </View>
    </TouchableOpacity>
  );
}
