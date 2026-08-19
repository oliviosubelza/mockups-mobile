import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Zustand persistence adapter backed by AsyncStorage. This is the RN
 * counterpart of the web app's localStorage-backed StateStorage seam:
 * swap this module to change the backing store without touching stores.
 */
export const zustandStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

/** Centralized persisted-store keys (avoid string collisions). */
export const StorageKeys = {
  appearance: 'app.appearance',
  dispatchPlan: 'app.dispatch-plan',
  despachos: 'app.despachos',
  devSettings: 'app.dev-settings',
} as const;
