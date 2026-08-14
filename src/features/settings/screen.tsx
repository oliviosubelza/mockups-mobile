import { Check, Palette, ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ThemeMode } from '@/shared/stores/appearance';
import { useAppearance } from '@/shared/stores/appearance';
import { useDevSettings } from '@/shared/stores/devSettings';
import { useUser } from '@/shared/stores/user';
import { Button } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';
import { findRouteById, navigateTo } from '@/navigation/registry';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'Automático (sistema)' },
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Oscuro' },
];

export default function SettingsScreen() {
  const mode = useAppearance((state) => state.mode);
  const setMode = useAppearance((state) => state.setMode);
  const showGallery = useDevSettings((state) => state.showGallery);
  const setShowGallery = useDevSettings((state) => state.setShowGallery);
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
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sección: Apariencia */}
        <Box gap="s">
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
        </Box>

        {/* Sección: Opciones de Desarrollador */}
        <Box gap="s">
          <Text variant="subtitle">Opciones de Desarrollador</Text>
          <Text variant="caption">
            Herramientas y accesos directos para pruebas internas y diseño.
          </Text>

          <Box
            borderRadius="lg"
            borderWidth={StyleSheet.hairlineWidth}
            borderColor="border"
            backgroundColor="cardBackground"
            overflow="hidden"
          >
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              padding="l"
            >
              <Box flex={1} paddingRight="m" gap="xxs">
                <Text variant="body">Galería de componentes</Text>
                <Text variant="caption">
                  Mostrar acceso a la galería en el menú principal
                </Text>
              </Box>
              <Switch
                value={showGallery}
                onValueChange={setShowGallery}
                trackColor={{
                  false: theme.colors.borderStrong,
                  true: theme.colors.primary,
                }}
                thumbColor={showGallery ? '#ffffff' : '#f4f3f4'}
              />
            </Box>

            {showGallery && (
              <Pressable
                onPress={() => {
                  const galleryRoute = findRouteById('gallery');
                  if (galleryRoute) navigateTo(galleryRoute);
                }}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  padding="l"
                  borderTopWidth={StyleSheet.hairlineWidth}
                  borderColor="border"
                  backgroundColor="mutedBackground"
                >
                  <Box flexDirection="row" alignItems="center" gap="s">
                    <Palette size={16} color={theme.colors.primary} />
                    <Text variant="body" color="primary">
                      Abrir galería directamente
                    </Text>
                  </Box>
                  <ChevronRight size={16} color={theme.colors.primary} />
                </Box>
              </Pressable>
            )}
          </Box>
        </Box>

        {/* Botón Cerrar Sesión */}
        <View style={{ marginTop: 'auto', paddingTop: 20 }}>
          <Button
            label="Cerrar Sesión"
            onPress={handleLogout}
            variant="secondary"
            size="lg"
          />
        </View>
      </ScrollView>
    </Box>
  );
}

