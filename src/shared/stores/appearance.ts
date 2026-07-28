import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys, zustandStorage } from '@/shared/storage';
import { BASE_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE } from '@/theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

type AppearanceState = {
  /** `system` follows the OS scheme; otherwise the theme is forced. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /**
   * Base text size in px, clamped to 12–18. Drives every derived size in the
   * theme, so this single value controls the density of the whole UI.
   */
  baseFontSize: number;
  setBaseFontSize: (size: number) => void;
};

/** Persisted appearance store (AsyncStorage via the shared StateStorage seam). */
export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      baseFontSize: BASE_FONT_SIZE,
      setBaseFontSize: (size) =>
        set({
          baseFontSize: Math.min(Math.max(Math.round(size), MIN_FONT_SIZE), MAX_FONT_SIZE),
        }),
    }),
    {
      name: StorageKeys.appearance,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
