import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveRoute } from '@/navigation/registry';
import { getScreen } from '@/navigation/screens';
import { Box, Text, useAppTheme } from '@/theme';

/**
 * Single catch-all screen. Resolves the slug against the route registry, then
 * pairs the route with its screen by `id` — every non-home destination flows
 * through here, so there is no file-per-screen under `app/`.
 */
export default function DynamicRoute() {
  const { slug } = useLocalSearchParams<{ slug: string[] }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const route = resolveRoute(slug);
  const Screen = route ? getScreen(route.id) : undefined;

  if (!route || route.activate === false || !Screen) {
    return (
      <Box
        flex={1}
        backgroundColor="mainBackground"
        alignItems="center"
        justifyContent="center"
        padding="l"
        gap="xs"
      >
        <Text variant="title">Pantalla no encontrada</Text>
        <Text variant="caption">
          /{Array.isArray(slug) ? slug.join('/') : (slug ?? '')}
        </Text>
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <Box
        flexDirection="row"
        alignItems="center"
        gap="s"
        paddingHorizontal="l"
        paddingBottom="m"
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderColor="border"
        style={{ paddingTop: insets.top + 8 }}
      >
        {router.canGoBack() ? (
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={24} color={theme.colors.foreground} />
          </Pressable>
        ) : null}
        <Text variant="title">{route.title}</Text>
      </Box>

      <Screen />
    </Box>
  );
}
