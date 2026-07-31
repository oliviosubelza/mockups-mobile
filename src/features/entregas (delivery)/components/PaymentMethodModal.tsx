import {
  Banknote,
  Building,
  FileText,
  QrCode,
  X,
  type LucideIcon,
} from "lucide-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
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
 *
 * Es solo el cascaron: encabezado con el metodo y el saldo pendiente siempre
 * visible, cuerpo scrolleable con `children` y pie con la accion principal.
 * Cada metodo aporta unicamente sus campos, asi los cuatro formularios dejan de
 * ocupar altura en el tab de cobro.
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          {/* ZONA MUERTA SUPERIOR: TOCARLA CIERRA LA HOJA */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={requestClose}
            style={{ flex: 1 }}
          />

          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              maxHeight: "85%",
              paddingBottom: 18,
              elevation: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}
          >
            {/* ENCABEZADO CON EL METODO Y EL SALDO PENDIENTE SIEMPRE VISIBLE */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
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
                  <MethodIcon size={22} color={theme.colors.primary} />
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
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Text
                      variant="caption"
                      style={{ fontSize: 12, color: theme.colors.mutedForeground }}
                    >
                      Saldo Pendiente:
                    </Text>
                    <Text
                      variant="label"
                      style={{
                        fontSize: 13,
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
                style={{ padding: 4, opacity: closeDisabled ? 0.4 : 1 }}
              >
                <X size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* CUERPO SCROLLEABLE CON LOS CAMPOS DEL METODO */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 18, gap: 12 }}
            >
              {children}
            </ScrollView>

            {/* PIE CON LA ACCION PRINCIPAL DEL METODO */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 18,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancelar"
                  variant="outline"
                  fullWidth
                  disabled={closeDisabled}
                  onPress={requestClose}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Button
                  label={submitLabel}
                  variant="primary"
                  icon={submitIcon}
                  fullWidth
                  loading={submitLoading}
                  disabled={submitDisabled}
                  onPress={onSubmit}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
