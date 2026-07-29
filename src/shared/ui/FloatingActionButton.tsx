import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text, useAppTheme } from '@/theme';

type Props = TouchableOpacityProps & {
  label?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

/** Reusable Floating Action Button (FAB) for primary floating actions (Flutter Scaffold style) */
export function FloatingActionButton({
  label = 'Finalizar Conteo',
  icon: Icon,
  disabled = false,
  size = 'md',
  onPress,
  style,
  ...rest
}: Props) {
  const theme = useAppTheme();
  const isSmall = size === 'sm';
  const paddingVertical = isSmall ? 10 : 14;
  const paddingHorizontal = isSmall ? 16 : 20;
  const fontSize = isSmall ? 14 : 15;
  const iconSize = isSmall ? 18 : 20;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: disabled ? theme.colors.secondary : theme.colors.primary,
          paddingVertical,
          paddingHorizontal,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: isSmall ? 6 : 8,
          elevation: disabled ? 0 : 8,
          shadowColor: disabled ? 'transparent' : theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
        },
        style,
      ]}
      {...rest}
    >
      {Icon && (
        <Icon size={iconSize} color={disabled ? theme.colors.mutedForeground : '#ffffff'} />
      )}
      <Text
        variant="title"
        style={{
          color: disabled ? theme.colors.mutedForeground : '#ffffff',
          fontSize,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
