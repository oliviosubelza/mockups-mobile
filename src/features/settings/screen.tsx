import { Check, LogOut } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ThemeMode } from '@/shared/stores/appearance';
import { useAppearance } from '@/shared/stores/appearance';
import { useUser } from '@/shared/stores/user';
import { Button } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Automático (sistema)' },
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Oscuro' },
];

export default function SettingsScreen() {
  const mode = useAppearance((state) => state.mode);
  const setMode = useAppearance((state) => state.setMode);
  const logout = useUser((state) => state.logout);
  const theme = useAppTheme();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <Box flex={1} padding="l" gap="l">
      <Text variant="subtitle">Apariencia</Text>

      <Box
        borderRadius="lg"
        borderWidth={StyleSheet.hairlineWidth}
        borderColor="border"
        overflow="hidden"
      >
        {OPTIONS.map((option, index) => (
          <Pressable key={option.mode} onPress={() => setMode(option.mode)}>
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              padding="l"
              backgroundColor="cardBackground"
              borderTopWidth={index === 0 ? 0 : StyleSheet.hairlineWidth}
              borderColor="border"
            >
              <Text variant="body">{option.label}</Text>
              {mode === option.mode ? (
                <Check size={18} color={theme.colors.primary} />
              ) : null}
            </Box>
          </Pressable>
        ))}
      </Box>

      <View style={{ marginTop: 'auto' }}>
        <Button
          label="Cerrar Sesión"
          onPress={handleLogout}
          variant="secondary"
          size="lg"
        />
      </View>
    </Box>
  );
}
