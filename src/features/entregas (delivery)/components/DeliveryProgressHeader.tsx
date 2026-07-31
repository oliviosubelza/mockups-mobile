import { View } from "react-native";

import { Text, useAppTheme } from "@/theme";

import type { EstadoEntrega } from "../types";

export type DeliveryProgressHeaderProps = {
  sequence: number;
  totalStops: number;
  status: EstadoEntrega;
  /** Hora de llegada al punto. Se omite mientras el chofer no marco llegada. */
  arrivedAtLabel?: string;
};

const SEGMENT_COUNT = 4;

// SEGMENTOS COMPLETADOS POR ESTADO DE LA ENTREGA.
// A PROPOSITO NO DEPENDE DEL TAB ACTIVO: EL AVANCE ES DEL ESTADO DE LA PARADA,
// NO DE LO QUE EL CHOFER ESTA MIRANDO EN LA PANTALLA.
const FILLED_SEGMENTS_BY_STATUS: Record<EstadoEntrega, number> = {
  PENDING: 0,
  EN_ROUTE: 1,
  ARRIVED: 2,
  DELIVERED: 3,
  INCIDENT: 0,
};

/**
 * Espina de progreso de la entrega.
 *
 * Reemplaza al stepper de 5 pasos: una sola tira compacta con la posicion de la
 * parada en la hoja de ruta y una barra de 4 segmentos derivada unicamente del
 * estado. Toda la altura del componente queda por debajo de 56px.
 */
export function DeliveryProgressHeader({
  sequence,
  totalStops,
  status,
  arrivedAtLabel,
}: DeliveryProgressHeaderProps) {
  const theme = useAppTheme();

  const filledSegments = FILLED_SEGMENTS_BY_STATUS[status] ?? 0;
  const hasIncident = status === "INCIDENT";

  return (
    <View style={{ gap: 8 }}>
      {/* TIRA COMPACTA: PARADA A LA IZQUIERDA, HORA DE LLEGADA A LA DERECHA */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text
          variant="label"
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: theme.colors.foreground,
            fontVariant: ["tabular-nums"],
          }}
        >
          Parada {sequence} de {totalStops}
        </Text>

        {arrivedAtLabel ? (
          <Text
            variant="caption"
            style={{
              fontSize: 11,
              color: theme.colors.mutedForeground,
              fontVariant: ["tabular-nums"],
            }}
          >
            Llegada {arrivedAtLabel}
          </Text>
        ) : null}
      </View>

      {/* BARRA HAIRLINE DE 4 SEGMENTOS DERIVADA SOLO DEL ESTADO */}
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
          <View
            key={`delivery-progress-segment-${index}`}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: hasIncident
                ? theme.colors.danger
                : index < filledSegments
                  ? theme.colors.primary
                  : theme.colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
