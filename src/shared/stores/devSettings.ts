import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys, zustandStorage } from '@/shared/storage';

type DevSettingsState = {
  /** Flag to toggle visibility of component gallery in home dashboard */
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  toggleShowGallery: () => void;
};

/** Persisted store for developer features and mock toggles */
export const useDevSettings = create<DevSettingsState>()(
  persist(
    (set) => ({
      showGallery: false, // Oculto por defecto para usuarios finales
      setShowGallery: (showGallery) => set({ showGallery }),
      toggleShowGallery: () => set((state) => ({ showGallery: !state.showGallery })),
    }),
    {
      name: StorageKeys.devSettings,
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
