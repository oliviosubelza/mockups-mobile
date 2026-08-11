import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Eye,
  Snowflake,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Badge, Button, Card } from "@/shared/ui";
import { Box, Text, useAppTheme } from "@/theme";
import type { SemaforoAuditItem } from "../RevisionSemaforoListScreen";

type Props = {
  order: SemaforoAuditItem;
  onStart: () => void;
};

/** Un eslabón de la cadena de conteo: quién contó, cuándo, o si falta. */
function Etapa({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail: string;
}) {
  const theme = useAppTheme();

  return (
    <Box flexDirection="row" alignItems="center" gap="s">
      {done ? (
        <CheckCircle2 size={theme.iconSizes.sm} color={theme.colors.success} />
      ) : (
        <Circle size={theme.iconSizes.sm} color={theme.colors.mutedForeground} />
      )}
      {/* Ancho fijo: las tres etapas alinean su detalle en la misma columna. */}
      <Text variant="caption" style={{ width: 92 }} numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="caption"
        color={done ? "foreground" : "mutedForeground"}
        numberOfLines={1}
        style={{ flex: 1 }}
      >
        {detail}
      </Text>
    </Box>
  );
}

/**
 * Orden en la cola de auditoría semáforo.
 *
 * La card cuenta una cadena de tres conteos sobre la misma OT — chofer,
 * consolidador, auditor — porque de eso trata el semáforo: el mismo número
 * verificado por tres manos distintas. La etapa que falta es la que explica
 * qué ofrece el botón.
 */
export function SemaforoOrderCard({ order, onStart }: Props) {
  const theme = useAppTheme();
  const { driver, consolidator, semaphoreAuditor } = order.counts;
  const auditada = semaphoreAuditor.status === "COMPLETED";

  const detalle = (
    etapa: { user?: string; time?: string },
    pendiente: string,
  ) => {
    if (!etapa.user) return pendiente;
    return etapa.time ? `${etapa.user} · ${etapa.time}` : etapa.user;
  };

  return (
    <Card
      padding="m"
      borderRadius="xl"
      accentTone={auditada ? "success" : "warning"}
      style={{ gap: 10 }}
    >
      {/* IDENTIFICACIÓN */}
      <Box flexDirection="row" alignItems="center" gap="s">
        <Text variant="subtitle" numberOfLines={1} style={{ flexShrink: 1 }}>
          {order.orderCode}
        </Text>
        {order.isColdChain && (
          <Badge label="Frío" tone="neutral" size="sm" icon={Snowflake} />
        )}
        <Box flex={1} />
        <Badge label={`${order.totalProducts} productos`} tone="neutral" size="sm" />
      </Box>

      {/* PROCEDENCIA */}
      <Text variant="caption" numberOfLines={1}>
        {order.driverName} · {order.zonaRuta}
      </Text>

      {/* CADENA DE CONTEO */}
      <View
        style={{
          gap: 6,
          paddingTop: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        }}
      >
        <Etapa
          label="Chofer"
          done={driver.status === "COMPLETED"}
          detail={detalle(driver, "Pendiente")}
        />
        <Etapa
          label="Consolidador"
          done={consolidator.status === "COMPLETED"}
          detail={detalle(consolidator, "Sin consolidar")}
        />
        <Etapa
          label="Auditoría"
          done={auditada}
          detail={detalle(semaphoreAuditor, "Sin auditar")}
        />
      </View>

      {/* La orden ya auditada no vuelve a ofrecer un inicio que no corresponde. */}
      <Button
        label={auditada ? "Ver auditoría" : "Iniciar conteo"}
        icon={auditada ? Eye : ClipboardCheck}
        variant={auditada ? "secondary" : "primary"}
        size="sm"
        fullWidth
        onPress={onStart}
      />
    </Card>
  );
}
