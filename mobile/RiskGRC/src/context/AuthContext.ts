import { createContext } from 'react';

export const AuthContext = createContext<{
  isLoggedIn: boolean;
  login: (token: string, refresh: string) => void;
  logout: () => void;
}>({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});
