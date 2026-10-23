import { createContext } from 'react';
import type { User } from '@/types';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
