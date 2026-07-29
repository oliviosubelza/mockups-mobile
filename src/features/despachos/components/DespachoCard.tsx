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
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      {/* LEADING: Secuencia */}
      <View
        style={{
          backgroundColor: theme.colors.secondary,
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text
          variant="label"
          style={{
            fontWeight: "bold",
            color: theme.colors.foreground,
            fontSize: 16,
          }}
        >
          {sequence}
        </Text>
      </View>

      {/* BODY: Información principal */}
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            variant="label"
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.colors.foreground,
            }}
          >
            {despacho.codigo}
          </Text>
          <Badge label={meta.label} tone={meta.tone} emphasis="soft" />
        </View>

        {/* Detalles de envío */}
        <View style={{ gap: 2, marginTop: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MapPin color={theme.colors.mutedForeground} size={14} style={{ marginRight: 4 }} />
            <Text
              variant="label"
              style={{ color: theme.colors.mutedForeground, fontSize: 14 }}
              numberOfLines={1}
            >
              {despacho.cliente} - {despacho.id}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ListOrdered color={theme.colors.mutedForeground} size={14} style={{ marginRight: 4 }} />
              <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>
                {paradas}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Clock color={theme.colors.mutedForeground} size={14} style={{ marginRight: 4 }} />
              <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>
                {timeWindow}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Weight color={theme.colors.mutedForeground} size={14} style={{ marginRight: 4 }} />
              <Text variant="label" style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>
                {weight}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* TRAILING: Action Arrow */}
      <View style={{ marginLeft: 8 }}>
        <ChevronRight color={theme.colors.mutedForeground} size={24} />
      </View>
    </TouchableOpacity>
  );
}
