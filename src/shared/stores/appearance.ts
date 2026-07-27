import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys, zustandStorage } from '@/shared/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type AppearanceState = {
  /** `system` follows the OS scheme; otherwise the theme is forced. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

/** Persisted appearance store (AsyncStorage via the shared StateStorage seam). */
export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: StorageKeys.appearance,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
