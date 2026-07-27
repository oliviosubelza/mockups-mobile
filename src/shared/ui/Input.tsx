import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Box, Text, useAppTheme } from '@/theme';

type Props = TextInputProps & {
  label?: string;
};

/** Themed text field: optional label + bordered, theme-aware input. */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, style, ...rest },
  ref,
) {
  const theme = useAppTheme();

  return (
    <Box gap="xs">
      {label ? <Text variant="label">{label}</Text> : null}
      <Box
        borderWidth={StyleSheet.hairlineWidth}
        borderColor="border"
        borderRadius="md"
        backgroundColor="cardBackground"
        paddingHorizontal="m"
      >
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.mutedForeground}
          style={[
            { color: theme.colors.foreground, paddingVertical: 12, fontSize: 15 },
            style,
          ]}
          {...rest}
        />
      </Box>
    </Box>
  );
});
