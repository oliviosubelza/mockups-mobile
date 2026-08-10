import { create } from 'zustand';

export type UserRole = 'CHOFER' | 'SUPERVISOR';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  avatarUrl?: string;
};

export const DEMO_CHOFER: User = {
  id: 'u-1',
  name: 'Cristhian Macchiavelli',
  email: 'chofer@empresa.com',
  role: 'CHOFER',
  roleLabel: 'Chofer / Despachador',
};

export const DEMO_SUPERVISOR: User = {
  id: 'u-2',
  name: 'Carlos Mendoza',
  email: 'supervisor@empresa.com',
  role: 'SUPERVISOR',
  roleLabel: 'Supervisor de Distribución',
};

type UserState = {
  user: User;
  isAuthenticated: boolean;
  loginAs: (role: UserRole) => void;
  loginWithCredentials: (identifier: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
};

export const useUser = create<UserState>((set) => ({
  user: DEMO_CHOFER,
  isAuthenticated: true,

  loginAs: (role: UserRole) => {
    const newUser = role === 'SUPERVISOR' ? DEMO_SUPERVISOR : DEMO_CHOFER;
    set({ user: newUser, isAuthenticated: true });
  },

  loginWithCredentials: (identifier: string, pass: string) => {
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId.includes('super') || cleanId === 'supervisor@empresa.com') {
      set({ user: DEMO_SUPERVISOR, isAuthenticated: true });
      return { success: true };
    }
    if (cleanId.includes('chof') || cleanId === 'chofer@empresa.com' || cleanId === 'cristhian') {
      set({ user: DEMO_CHOFER, isAuthenticated: true });
      return { success: true };
    }
    // Default fallback to Supervisor if matching supervisor, else Chofer
    set({ user: DEMO_CHOFER, isAuthenticated: true });
    return { success: true };
  },

  logout: () => {
    set({ isAuthenticated: false });
  },
}));

/** First letters of the first two words, uppercased: "Cristhian M" -> "CM". */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
