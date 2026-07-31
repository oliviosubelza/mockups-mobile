import { Check, FileSignature, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/shared/ui";
import { Text, useAppTheme } from "@/theme";

export type SignaturePadModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (signature: { paths: string[]; strokeCount: number }) => void;
  receiverName?: string;
};

const CANVAS_HEIGHT = 220;

// UNA FIRMA VALIDA NECESITA UN TRAZO REAL, NO UN SIMPLE TOQUE EN EL LIENZO.
const MIN_POINTS_FOR_VALID_SIGNATURE = 8;

/**
 * Lienzo de firma digital sin dependencias extra.
 *
 * Captura los trazos con PanResponder (funciona dentro de un Modal sin
 * configurar gesture-handler) y los dibuja como paths SVG.
 */
export function SignaturePadModal({
  visible,
  onClose,
  onConfirm,
  receiverName,
}: SignaturePadModalProps) {
  const theme = useAppTheme();

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [pointCount, setPointCount] = useState(0);
  const currentPointsRef = useRef<string[]>([]);

  // LIMPIA EL LIENZO AL CERRARSE PARA QUE REABRA SIEMPRE EN BLANCO
  useEffect(() => {
    if (!visible) {
      setPaths([]);
      setCurrentPath("");
      setPointCount(0);
      currentPointsRef.current = [];
    }
  }, [visible]);

  const panResponder = useMemo(() => {
    const appendPoint = (evt: GestureResponderEvent, isStart: boolean) => {
      const { locationX, locationY } = evt.nativeEvent;
      const x = locationX.toFixed(2);
      const y = locationY.toFixed(2);
      const command =
        isStart || currentPointsRef.current.length === 0
          ? `M ${x} ${y}`
          : `L ${x} ${y}`;
      currentPointsRef.current = [...currentPointsRef.current, command];
      setCurrentPath(currentPointsRef.current.join(" "));
      setPointCount((prev) => prev + 1);
    };

    const commitStroke = () => {
      const stroke = currentPointsRef.current.join(" ");
      currentPointsRef.current = [];
      setCurrentPath("");
      if (stroke.length > 0) {
        setPaths((prev) => [...prev, stroke]);
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => appendPoint(evt, true),
      onPanResponderMove: (evt) => appendPoint(evt, false),
      onPanResponderRelease: commitStroke,
      onPanResponderTerminate: commitStroke,
    });
  }, []);

  const hasDrawing = paths.length > 0 || currentPath.length > 0;
  const canConfirm =
    paths.length > 0 && pointCount >= MIN_POINTS_FOR_VALID_SIGNATURE;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath("");
    setPointCount(0);
    currentPointsRef.current = [];
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ paths, strokeCount: paths.length });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          zIndex: 1000,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 22,
            gap: 14,
            elevation: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
          }}
        >
          {/* ENCABEZADO DEL LIENZO DE FIRMA */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileSignature size={22} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant="title"
                  style={{
                    fontSize: 18,
                    color: theme.colors.foreground,
                    fontWeight: "700",
                  }}
                >
                  Firma de Recepcion
                </Text>
                {receiverName ? (
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 12,
                    }}
                  >
                    Firma: {receiverName}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* LIENZO DE CAPTURA DE TRAZOS */}
          <View
            {...panResponder.panHandlers}
            style={{
              height: CANVAS_HEIGHT,
              backgroundColor: theme.colors.cardBackground,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* LINEA BASE PUNTEADA DE APOYO */}
            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 46,
                borderBottomWidth: 1.5,
                borderStyle: "dashed",
                borderColor: theme.colors.border,
              }}
            />

            {!hasDrawing && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    fontSize: 13,
                    color: theme.colors.mutedForeground,
                  }}
                >
                  Firme aqui
                </Text>
              </View>
            )}

            <Svg width="100%" height="100%">
              {paths.map((d, idx) => (
                <Path
                  key={`stroke-${idx}`}
                  d={d}
                  stroke={theme.colors.foreground}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath.length > 0 && (
                <Path
                  d={currentPath}
                  stroke={theme.colors.foreground}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>

          <Text
            variant="caption"
            style={{ fontSize: 11, color: theme.colors.mutedForeground }}
          >
            Dibuja la firma con el dedo dentro del recuadro. Trazos
            registrados: {paths.length}
          </Text>

          {/* ACCIONES DEL LIENZO */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Limpiar"
                icon={Trash2}
                variant="outline"
                fullWidth
                disabled={!hasDrawing}
                onPress={handleClear}
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Button
                label="Confirmar Firma"
                icon={Check}
                variant="success"
                fullWidth
                disabled={!canConfirm}
                onPress={handleConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
