// Zustand store per autenticazione.
// Persistenza token via localStorage (semplice per MVP; per sicurezza reale
// futuro passare a electron-store con encryption chiave macchina).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../api/client";

type User = {
  id: string;
  email: string;
  username: string;
  plan: string;
  profile_picture?: string | null;
  school_year?: number | null;
  maturita_unlocked?: boolean;
  is_admin?: boolean;
  family_role?: string;
  email_is_relay?: boolean;
} | null;

type AuthState = {
  token: string | null;
  user: User;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await api.login({ email, password });
          set({ token: res.access_token, user: res.user, loading: false });
        } catch (err: any) {
          set({
            loading: false,
            error: err?.message ?? "Errore di accesso",
          });
          throw err;
        }
      },

      logout: () => {
        set({ token: null, user: null, error: null });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const user = await api.me(token);
          set({ user });
        } catch (err: any) {
          // Se 401 → token scaduto, sloggiamo
          if (err?.status === 401) {
            set({ token: null, user: null });
          }
        }
      },
    }),
    {
      name: "voto-desktop-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
