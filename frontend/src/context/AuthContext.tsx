import { createContext } from 'react';

export type AuthContextType = {
  token: string | null;
  refreshToken: string | null;
  username: string | null;
  role: string | null;
  setToken: (token: string | null, refreshToken?: string | null, username?: string | null, role?: string | null) => void;
  onGlobalError?: (status: number, message: string) => void;
};

export const AuthContext = createContext<AuthContextType>({
  token: null,
  refreshToken: null,
  username: null,
  role: null,
  setToken: () => {}
});

export function decodeToken(token: string | null): { username?: string; role?: string; user_id?: number } | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}
