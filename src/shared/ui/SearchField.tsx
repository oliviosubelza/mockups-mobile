import { forwardRef } from 'react';
import { TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { Search, XCircle } from 'lucide-react-native';

import { Box, useAppTheme } from '@/theme';

type Props = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
};

/** Reusable Search Field with clear button and theme support */
export const SearchField = forwardRef<TextInput, Props>(function SearchField(
  { value, onChangeText, onClear, placeholder = 'Buscar...', style, ...rest },
  ref,
) {
  const theme = useAppTheme();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      backgroundColor="secondary"
      borderRadius="md"
      paddingHorizontal="m"
      height={42}
    >
      <Search color={theme.colors.mutedForeground} size={18} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedForeground}
        style={[
          {
            flex: 1,
            fontSize: 13,
            marginLeft: 8,
            color: theme.colors.foreground,
            fontFamily: 'Montserrat_500Medium',
          },
          style,
        ]}
        autoCapitalize="none"
        {...rest}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={8}
        >
          <XCircle color={theme.colors.mutedForeground} size={20} />
        </TouchableOpacity>
      )}
    </Box>
  );
});
