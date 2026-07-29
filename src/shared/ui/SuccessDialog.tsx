import { AppDialog } from './AppDialog';

interface SuccessDialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

/** Wrapper de compatibilidad para SuccessDialog usando el componente AppDialog */
export const SuccessDialog = ({
  visible,
  onClose,
  title = '¡Exito!',
  message = 'La operacion se realizo correctamente.',
  buttonText = 'Continuar',
}: SuccessDialogProps) => {
  return (
    <AppDialog
      visible={visible}
      onClose={onClose}
      title={title}
      message={message}
      type="success"
      buttonText={buttonText}
    />
  );
};
