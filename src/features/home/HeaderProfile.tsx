import { Settings, LogOut } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { findRouteById, navigateTo } from '@/navigation/registry';
import { useUser } from '@/shared/stores/user';
import { Avatar, Badge } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

/** Profile header: avatar + name + role badge, plus settings and logout buttons. */
export function HeaderProfile() {
  const user = useUser((state) => state.user);
  const logout = useUser((state) => state.logout);
  const theme = useAppTheme();

  const openSettings = () => {
    const settings = findRouteById('settings');
    if (settings) navigateTo(settings);
  };

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
    >
      <Box flexDirection="row" alignItems="center" gap="m" flexShrink={1}>
        <Avatar name={user?.name || 'Usuario'} uri={user?.avatarUrl} />
        <Box flexShrink={1}>
          <Text variant="subtitle" numberOfLines={1}>{user?.name}</Text>
          <View style={{ marginTop: 2, alignSelf: 'flex-start' }}>
            <Badge
              label={user?.roleLabel || user?.role || 'Usuario'}
              tone={user?.role === 'SUPERVISOR' ? 'neutral' : 'primary'}
              emphasis="soft"
              size="sm"
            />
          </View>
        </Box>
      </Box>

      <Box flexDirection="row" alignItems="center" gap="s">
        <Pressable
          onPress={openSettings}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Box
            width={38}
            height={38}
            borderRadius="full"
            backgroundColor="secondary"
            alignItems="center"
            justifyContent="center"
          >
            <Settings size={18} color={theme.colors.foreground} />
          </Box>
        </Pressable>

        <Pressable
          onPress={logout}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Box
            width={38}
            height={38}
            borderRadius="full"
            backgroundColor="dangerSoft"
            alignItems="center"
            justifyContent="center"
          >
            <LogOut size={18} color={theme.colors.danger} />
          </Box>
        </Pressable>
      </Box>
    </Box>
  );
}
