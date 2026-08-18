import {
  Banknote,
  Building,
  FileText,
  QrCode,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

import { Button } from "@/shared/ui";
import { Text, useAppTheme } from "@/theme";

import type { PaymentMethodType } from "../types";

export type PaymentMethodModalProps = {
  visible: boolean;
  method: PaymentMethodType | null;
  title: string;
  pendingBalance: number;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  /** Muestra el spinner en la accion principal (ej. validacion bancaria del QR). */
  submitLoading?: boolean;
  /** Icono de la accion principal. Por defecto ninguno. */
  submitIcon?: LucideIcon;
  /** Bloquea cerrar/cancelar mientras hay una operacion en curso. */
  closeDisabled?: boolean;
  children: ReactNode;
};

const METHOD_ICONS: Record<PaymentMethodType, LucideIcon> = {
  CASH: Banknote,
  TRANSFER: Building,
  QR: QrCode,
  CHECK: FileText,
};

/**
 * Hoja inferior reutilizable para los formularios de cobro en sitio.
 * Despliegue más alto y elevación garantizada sobre el teclado numérico mediante Keyboard Listener.
 */
export function PaymentMethodModal({
  visible,
  method,
  title,
  pendingBalance,
  onClose,
  onSubmit,
  submitLabel = "Registrar Cobro",
  submitDisabled = false,
  submitLoading = false,
  submitIcon,
  closeDisabled = false,
  children,
}: PaymentMethodModalProps) {
  const theme = useAppTheme();

  // Escucha activa del teclado nativo para elevar el modal con precisión matemática
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const MethodIcon = method ? METHOD_ICONS[method] : Banknote;

  const requestClose = () => {
    if (closeDisabled) return;
    onClose();
  };

  return (
    <Modal
      visible={visible && method !== null}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={requestClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          justifyContent: "flex-end",
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 28 : 0,
        }}
      >
        {/* ZONA SUPERIOR TRANSLÚCIDA: TOCARLA CIERRA LA HOJA */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={requestClose}
          style={{ flex: 1 }}
        />

        {/* CONTENEDOR PRINCIPAL DEL BOTTOM SHEET A MEDIA PANTALLA */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 2,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: theme.colors.border,
            height: keyboardHeight > 0 ? "70%" : "54%",
            maxHeight: keyboardHeight > 0 ? "78%" : "60%",
            minHeight: "48%",
            overflow: "hidden",
            elevation: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
          }}
        >
          {/* MANIJA INDICADORA DE DRAG (PILL HANDLE) */}
          <View
            style={{
              alignSelf: "center",
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.colors.border,
              marginTop: 10,
              marginBottom: 4,
            }}
          />

          {/* ENCABEZADO CON EL MÉTODO Y EL SALDO PENDIENTE */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              paddingHorizontal: 18,
              paddingTop: 8,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MethodIcon size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text
                  variant="title"
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    color: theme.colors.foreground,
                    fontWeight: "700",
                  }}
                >
                  {title}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    Saldo Pendiente:
                  </Text>
                  <Text
                    variant="label"
                    numberOfLines={1}
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: theme.colors.primary,
                    }}
                  >
                    Bs. {pendingBalance.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={requestClose}
              disabled={closeDisabled}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.secondary,
                alignItems: "center",
                justifyContent: "center",
                opacity: closeDisabled ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              <X size={18} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* CUERPO SCROLLEABLE CON LOS CAMPOS DEL MÉTODO */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={true}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              gap: 12,
              paddingBottom: 20,
            }}
          >
            {children}
          </ScrollView>

          {/* PIE CON LA ACCIÓN PRINCIPAL DEL MÉTODO */}
          <SafeAreaView
            style={{
              flexDirection: "row",
              gap: 10,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom:
                keyboardHeight > 0
                  ? 12
                  : Platform.OS === "ios"
                    ? 14
                    : 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.cardBackground,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                label="Cancelar"
                variant="outline"
                size="md"
                fullWidth
                disabled={closeDisabled}
                onPress={requestClose}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Button
                label={submitLabel}
                variant="primary"
                icon={submitIcon}
                size="md"
                fullWidth
                loading={submitLoading}
                disabled={submitDisabled}
                onPress={onSubmit}
              />
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
