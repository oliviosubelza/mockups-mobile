import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import {
  X,
  MessageCircle,
  FileText,
  Phone,
  User,
  QrCode,
  ShieldCheck,
  Send,
  CheckCircle2,
} from 'lucide-react-native';

import { Button, Badge } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';

export type SendInvoiceWhatsAppModalProps = {
  visible: boolean;
  onClose: () => void;
  customerName: string;
  defaultPhone: string;
  invoiceNumbers: string[];
  totalAmount: number;
  hasQr?: boolean;
  onSuccessSent?: (phone: string) => void;
};

export function SendInvoiceWhatsAppModal({
  visible,
  onClose,
  customerName,
  defaultPhone,
  invoiceNumbers,
  totalAmount,
  hasQr = true,
  onSuccessSent,
}: SendInvoiceWhatsAppModalProps) {
  const theme = useAppTheme();

  const [phone, setPhone] = useState(defaultPhone || '');
  const [recipientName, setRecipientName] = useState(customerName || '');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setPhone(defaultPhone || '');
      setRecipientName(customerName || '');
      setIsSending(false);
      setSendSuccess(false);
    }
  }, [visible, defaultPhone, customerName]);

  const handleSendWebhook = async () => {
    if (!phone.trim()) return;

    setIsSending(true);

    // Simulación de llamada HTTP POST al Webhook del microservicio
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);

      setTimeout(() => {
        onSuccessSent?.(phone);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => !isSending && onClose()}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'flex-end',
        }}
      >
        {/* ZONA SUPERIOR TRANSLÚCIDA: TOCARLA CIERRA EL MODAL */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => !isSending && onClose()}
          style={{ flex: 1 }}
        />

        {/* CONTENEDOR PRINCIPAL SÓLIDO Y BLANCO DEL BOTTOM SHEET */}
        <View
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 2,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 36 : 24,
            gap: 14,
            elevation: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
          }}
        >
          {/* MANIJA INDICADORA DE DRAG */}
          <View
            style={{
              alignSelf: 'center',
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.colors.border,
              marginBottom: 4,
            }}
          />

          {/* CABECERA DEL MODAL */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#25D36620',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={22} color="#25D366" />
              </View>
              <View>
                <Text variant="header" style={{ fontSize: 16, fontWeight: '800' }}>
                  Enviar Factura por WhatsApp
                </Text>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                  Vía canal oficial corporativo
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={isSending}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.secondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>

          {sendSuccess ? (
            /* ESTADO DE ÉXITO */
            <View
              style={{
                paddingVertical: 28,
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: theme.colors.successSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={36} color={theme.colors.success} />
              </View>
              <Text variant="header" style={{ fontSize: 17, fontWeight: '800', textAlign: 'center' }}>
                ¡Factura Enviada con Éxito!
              </Text>
              <Text
                variant="caption"
                style={{
                  color: theme.colors.mutedForeground,
                  textAlign: 'center',
                  fontSize: 13,
                  paddingHorizontal: 16,
                }}
              >
                El microservicio envió el documento y el QR al número{' '}
                <Text style={{ fontWeight: '700', color: theme.colors.foreground }}>
                  {phone}
                </Text>
                .
              </Text>
            </View>
          ) : (
            /* FORMULARIO DE ENVÍO DIRECTO DENTRO DEL CONTENEDOR BLANCO */
            <>
              {/* 1. RESUMEN DEL DOCUMENTO */}
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 14,
                  padding: 12,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} color={theme.colors.primary} />
                    <Text variant="label" style={{ fontSize: 13, fontWeight: '700' }}>
                      {invoiceNumbers.length === 1
                        ? `Factura: ${invoiceNumbers[0]}`
                        : `${invoiceNumbers.length} Facturas (${invoiceNumbers.join(', ')})`}
                    </Text>
                  </View>
                  {hasQr && (
                    <Badge label="Incluye QR" tone="primary" size="sm" icon={QrCode} />
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                    Total Facturado:
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '800',
                      color: theme.colors.primary,
                    }}
                  >
                    Bs. {totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* 2. CAMPOS EDITABLES */}
              <View style={{ gap: 10 }}>
                {/* NOMBRE */}
                <View style={{ gap: 4 }}>
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                    Nombre del Destinatario / Cliente:
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.secondary,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      paddingHorizontal: 12,
                      height: 42,
                      gap: 8,
                    }}
                  >
                    <User size={16} color={theme.colors.mutedForeground} />
                    <TextInput
                      value={recipientName}
                      onChangeText={setRecipientName}
                      placeholder="Nombre del cliente"
                      placeholderTextColor={theme.colors.mutedForeground}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: '600',
                        color: theme.colors.foreground,
                      }}
                    />
                  </View>
                </View>

                {/* TELÉFONO WHATSAPP */}
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                      Número de WhatsApp (con código de país):
                    </Text>
                    <Text variant="caption" style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>
                      Editable
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#25D366',
                      paddingHorizontal: 12,
                      height: 44,
                      gap: 8,
                    }}
                  >
                    <Phone size={16} color="#25D366" />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+591 7XXXXXXX"
                      placeholderTextColor={theme.colors.mutedForeground}
                      keyboardType="phone-pad"
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: '700',
                        color: theme.colors.foreground,
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* 3. AVISO DEL WEBHOOK CORPORATIVO */}
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 10,
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ShieldCheck size={16} color={theme.colors.primary} />
                <Text
                  variant="caption"
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: theme.colors.mutedForeground,
                    lineHeight: 16,
                  }}
                >
                  El mensaje se procesará por el bot corporativo de WhatsApp. No utiliza tu WhatsApp personal ni consume tu plan de datos.
                </Text>
              </View>

              {/* 4. BOTONES DE ACCIÓN (DENTRO DEL CONTENEDOR BLANCO) */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancelar"
                    variant="outline"
                    size="lg"
                    onPress={onClose}
                    disabled={isSending}
                    fullWidth
                  />
                </View>

                <View style={{ flex: 1.6 }}>
                  <Button
                    label={isSending ? 'Enviando...' : 'Enviar Factura'}
                    icon={Send}
                    variant="primary"
                    size="lg"
                    onPress={handleSendWebhook}
                    disabled={isSending || !phone.trim()}
                    fullWidth
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
