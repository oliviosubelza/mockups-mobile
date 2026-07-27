import { create } from 'zustand';

export type User = {
  name: string;
  role?: string;
  avatarUrl?: string;
};

type UserState = {
  user: User;
};

/** Mock session user for the profile header. Replace with real auth later. */
export const useUser = create<UserState>(() => ({
  user: { name: 'Cristhian Macchiavelli', role: 'Despachador' },
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
