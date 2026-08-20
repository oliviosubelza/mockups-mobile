import { Check, FileSignature, Trash2 } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button } from "./Button";
import { Text, useAppTheme } from "@/theme";

export type SignatureData = {
  paths: string[];
  strokeCount: number;
  signedBy?: string;
  signedAt?: string;
};

export type SignaturePadModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (signature: { paths: string[]; strokeCount: number }) => void;
  receiverName?: string;
  title?: string;
  subtitle?: string;
};

type SignaturePoint = { x: number; y: number };

const CANVAS_HEIGHT = 220;

// UNA FIRMA VALIDA NECESITA UN TRAZO REAL, NO UN SIMPLE TOQUE EN EL LIENZO.
const MIN_POINTS_FOR_VALID_SIGNATURE = 8;

// DESCARTA MUESTRAS DEMASIADO JUNTAS: SON RUIDO DEL SENSOR Y ENSUCIAN LA CURVA.
const MIN_POINT_DISTANCE = 2;

// EL LIENZO ES UN DOCUMENTO, NO CROMO DE INTERFAZ: TINTA OSCURA SOBRE PAPEL
// BLANCO EN AMBOS TEMAS, PARA QUE LA FIRMA GUARDADA SE LEA IGUAL SIEMPRE.
export const SIGNATURE_PAPER_COLOR = "hsl(0, 0%, 100%)";
export const SIGNATURE_INK_COLOR = "hsl(222, 84%, 5%)";
const PAPER_RULE_COLOR = "hsl(220, 13%, 85%)";
const STROKE_WIDTH = 3;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Convierte los puntos crudos del dedo en un path SVG suavizado.
 */
export const buildSmoothPath = (points: SignaturePoint[]): string => {
  if (points.length === 0) return "";

  const first = points[0];
  const start = `M ${round(first.x)} ${round(first.y)}`;

  if (points.length === 1) return `${start} l 0.1 0`;

  let path = start;
  for (let i = 1; i < points.length - 1; i += 1) {
    const control = points[i];
    const next = points[i + 1];
    const midX = round((control.x + next.x) / 2);
    const midY = round((control.y + next.y) / 2);
    path += ` Q ${round(control.x)} ${round(control.y)} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  path += ` L ${round(last.x)} ${round(last.y)}`;
  return path;
};

/**
 * Ajusta los trazos capturados al recuadro de previsualización.
 */
export const getSignatureViewBox = (strokePaths: string[]): string => {
  const numberPattern = /-?[\d.]+/g;
  const source = strokePaths.join(" ");
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const coords = source.match(numberPattern) ?? [];
  for (let i = 0; i + 1 < coords.length; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!isFinite(minX) || !isFinite(minY)) return "0 0 100 70";
  const padding = 6;
  const width = Math.max(1, maxX - minX) + padding * 2;
  const height = Math.max(1, maxY - minY) + padding * 2;
  return `${minX - padding} ${minY - padding} ${width} ${height}`;
};

/**
 * Lienzo de firma digital sin dependencias extra.
 *
 * Captura los trazos con PanResponder (funciona dentro de un Modal sin
 * configurar gesture-handler) y los dibuja como curvas SVG suavizadas.
 */
export function SignaturePadModal({
  visible,
  onClose,
  onConfirm,
  receiverName,
  title = "Firma de Recepción",
  subtitle,
}: SignaturePadModalProps) {
  const theme = useAppTheme();

  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [pointCount, setPointCount] = useState(0);
  const currentPointsRef = useRef<SignaturePoint[]>([]);

  // Limpia el lienzo al cerrarse para que reabra siempre en blanco
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
      const points = currentPointsRef.current;

      if (isStart) {
        currentPointsRef.current = [{ x: locationX, y: locationY }];
      } else {
        const previous = points[points.length - 1];
        if (previous) {
          const dx = locationX - previous.x;
          const dy = locationY - previous.y;
          if (dx * dx + dy * dy < MIN_POINT_DISTANCE * MIN_POINT_DISTANCE) {
            return;
          }
        }
        currentPointsRef.current = [...points, { x: locationX, y: locationY }];
      }

      setCurrentPath(buildSmoothPath(currentPointsRef.current));
      setPointCount((prev) => prev + 1);
    };

    const commitStroke = () => {
      const stroke = buildSmoothPath(currentPointsRef.current);
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

  const finalSubtitle = subtitle ?? (receiverName ? `Firma: ${receiverName}` : null);

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
                {title}
              </Text>
              {finalSubtitle ? (
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.mutedForeground,
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  {finalSubtitle}
                </Text>
              ) : null}
            </View>
          </View>

          {/* LIENZO DE CAPTURA DE TRAZOS */}
          <View
            {...panResponder.panHandlers}
            style={{
              height: CANVAS_HEIGHT,
              backgroundColor: SIGNATURE_PAPER_COLOR,
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
                borderColor: PAPER_RULE_COLOR,
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
                  style={{ fontSize: 13, color: PAPER_RULE_COLOR }}
                >
                  Firme aquí
                </Text>
              </View>
            )}

            <Svg width="100%" height="100%">
              {paths.map((d, idx) => (
                <Path
                  key={`stroke-${idx}`}
                  d={d}
                  stroke={SIGNATURE_INK_COLOR}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath.length > 0 && (
                <Path
                  d={currentPath}
                  stroke={SIGNATURE_INK_COLOR}
                  strokeWidth={STROKE_WIDTH}
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
            Dibuja la firma con el dedo dentro del recuadro. Trazos registrados:{" "}
            {paths.length}
          </Text>

          {/* ACCIONES DEL LIENZO */}
          <View style={{ gap: 10, marginTop: 4 }}>
            <Button
              label="Confirmar Firma"
              icon={Check}
              variant="success"
              size="lg"
              fullWidth
              disabled={!canConfirm}
              onPress={handleConfirm}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
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
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancelar"
                  variant="ghost"
                  fullWidth
                  onPress={onClose}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
