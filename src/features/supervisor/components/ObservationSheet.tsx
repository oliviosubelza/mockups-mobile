import { StickyNote, X, Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text, useAppTheme } from "@/theme";

const MAX_LENGTH = 280;

type Props = {
  visible: boolean;
  /** Which item the note belongs to, e.g. `7790003 · OT-4892`. */
  subtitle: string;
  /** Stored note for the active item; seeds the draft each time it opens. */
  value: string;
  onSave: (text: string) => void;
  onClose: () => void;
  /** A consolidated audit can be read but not rewritten. */
  readOnly?: boolean;
};

/**
 * Supervisor observation sheet.
 *
 * Owns its draft so a cancelled edit leaves the stored note untouched; the
 * draft reseeds from `value` on each open rather than persisting between items.
 */
export function ObservationSheet({
  visible,
  subtitle,
  value,
  onSave,
  onClose,
  readOnly = false,
}: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: theme.colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: Math.max(20, insets.bottom + 12),
            gap: 14,
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flexShrink: 1,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <StickyNote size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text variant="subtitle">
                  {readOnly ? "Observación (consolidada)" : "Observación"}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={22} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!readOnly}
            placeholder="Ej. Se verificó con el chofer, faltaban 3 unidades desde el despacho."
            placeholderTextColor={theme.colors.mutedForeground}
            multiline
            textAlignVertical="top"
            maxLength={MAX_LENGTH}
            style={{
              minHeight: 110,
              backgroundColor: theme.colors.secondary,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              padding: 12,
              fontSize: 13,
              color: readOnly
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
            }}
          />

          {readOnly ? null : (
            <Text variant="caption" style={{ textAlign: "right" }}>
              {draft.length}/{MAX_LENGTH}
            </Text>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme.colors.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text variant="label" fontFamily="Montserrat_600SemiBold">
                {readOnly ? "Cerrar" : "Cancelar"}
              </Text>
            </TouchableOpacity>

            {readOnly ? null : (
              <TouchableOpacity
                onPress={() => onSave(draft.trim())}
                activeOpacity={0.8}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <Check
                  size={16}
                  strokeWidth={3}
                  color={theme.colors.primaryForeground}
                />
                <Text
                  variant="label"
                  fontFamily="Montserrat_600SemiBold"
                  color="primaryForeground"
                >
                  Guardar Observación
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
