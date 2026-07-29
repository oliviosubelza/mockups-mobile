import { Modal, View } from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react-native';

import { Button } from './Button';
import { Text, useAppTheme } from '@/theme';

export type DialogType = 'success' | 'danger' | 'warning' | 'info';

export interface AppDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: DialogType;
  buttonText?: string;
  onConfirm?: () => void;
}

/**
 * Diálogo Personalizado Reutilizable para la App
 * Soporta tipos: éxito, error (danger), advertencia (warning) e información.
 * Adaptable 100% al Modo Claro y Modo Oscuro.
 */
export const AppDialog = ({
  visible,
  onClose,
  title,
  message,
  type = 'success',
  buttonText = 'Entendido',
  onConfirm,
}: AppDialogProps) => {
  const theme = useAppTheme();

  const handlePress = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // Configuración de iconos y colores según el tipo de diálogo
  const getConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertCircle size={44} color={theme.colors.danger} />,
          iconBg: theme.colors.dangerSoft,
          buttonVariant: 'danger' as const,
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={44} color="#d97706" />,
          iconBg: '#fef3c7',
          buttonVariant: 'primary' as const,
        };
      case 'info':
        return {
          icon: <Info size={44} color={theme.colors.primary} />,
          iconBg: theme.colors.primarySoft,
          buttonVariant: 'primary' as const,
        };
      case 'success':
      default:
        return {
          icon: <CheckCircle2 size={44} color={theme.colors.success} />,
          iconBg: theme.colors.successSoft,
          buttonVariant: 'primary' as const,
        };
    }
  };

  const config = getConfig();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Fondo Semi-Transparente */}
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          zIndex: 1000,
        }}
      >
        {/* Tarjeta del Diálogo con Tokens de Tema */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
          }}
        >
          {/* Icono con fondo tonal */}
          <View
            style={{
              backgroundColor: config.iconBg,
              padding: 16,
              borderRadius: 999,
              marginBottom: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {config.icon}
          </View>

          {/* Título */}
          <Text
            variant="title"
            style={{
              fontSize: 19,
              color: theme.colors.foreground,
              textAlign: 'center',
              marginBottom: 8,
              fontWeight: '700',
            }}
          >
            {title}
          </Text>

          {/* Mensaje */}
          <Text
            variant="body"
            style={{
              color: theme.colors.mutedForeground,
              textAlign: 'center',
              marginBottom: 22,
              lineHeight: 22,
              fontSize: 14,
            }}
          >
            {message}
          </Text>

          {/* Botón de Acción */}
          <View style={{ width: '100%' }}>
            <Button
              label={buttonText}
              variant={config.buttonVariant}
              size="md"
              fullWidth
              onPress={handlePress}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
