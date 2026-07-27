import { Settings } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { findRouteById, navigateTo } from '@/navigation/registry';
import { useUser } from '@/shared/stores/user';
import { Avatar } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

/** Profile header: avatar + name, plus a settings button (theme switch). */
export function HeaderProfile() {
  const user = useUser((state) => state.user);
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
      <Box flexDirection="row" alignItems="center" gap="m">
        <Avatar name={user.name} uri={user.avatarUrl} />
        <Box>
          <Text variant="subtitle">{user.name}</Text>
          {user.role ? <Text variant="caption">{user.role}</Text> : null}
        </Box>
      </Box>

      <Pressable
        onPress={openSettings}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Box
          width={40}
          height={40}
          borderRadius="full"
          backgroundColor="secondary"
          alignItems="center"
          justifyContent="center"
        >
          <Settings size={20} color={theme.colors.foreground} />
        </Box>
      </Pressable>
    </Box>
  );
}
