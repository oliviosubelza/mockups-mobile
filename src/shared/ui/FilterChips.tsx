import { ScrollView, TouchableOpacity, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text, useAppTheme } from '@/theme';

export type FilterChipOption<T extends string = string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  activeBgColor?: string;
  activeTextColor?: string;
  activeBorderColor?: string;
  badgeActiveBg?: string;
  badgeActiveText?: string;
};

type Props<T extends string> = {
  options: FilterChipOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
};

/** Reusable horizontal filter chips bar with badges and icon support */
export function FilterChips<T extends string>({
  options,
  selectedId,
  onSelect,
}: Props<T>) {
  const theme = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}
    >
      {options.map((filter) => {
        const isSelected = selectedId === filter.id;
        const Icon = filter.icon;
        const count = filter.count;

        return (
          <TouchableOpacity
            key={filter.id}
            activeOpacity={0.7}
            onPress={() => onSelect(filter.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isSelected
                ? filter.activeBorderColor ?? theme.colors.foreground
                : theme.colors.border,
              backgroundColor: isSelected
                ? filter.activeBgColor ?? theme.colors.foreground
                : theme.colors.cardBackground,
              elevation: isSelected ? 2 : 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isSelected ? 0.08 : 0,
              shadowRadius: 2,
            }}
          >
            {Icon && (
              <Icon
                size={14}
                color={
                  isSelected
                    ? filter.activeTextColor ?? theme.colors.mainBackground
                    : theme.colors.mutedForeground
                }
              />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: isSelected ? '700' : '500',
                color: isSelected
                  ? filter.activeTextColor ?? theme.colors.mainBackground
                  : theme.colors.foreground,
              }}
            >
              {filter.label}
            </Text>

            {count !== undefined && (
              <View
                style={{
                  backgroundColor: isSelected
                    ? filter.badgeActiveBg ?? theme.colors.secondary
                    : theme.colors.mutedBackground,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                  minWidth: 20,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isSelected
                      ? filter.badgeActiveText ?? theme.colors.mainBackground
                      : theme.colors.mutedForeground,
                  }}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
