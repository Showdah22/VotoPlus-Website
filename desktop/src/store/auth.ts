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
  school_type?: string | null;
  subjects?: string[];
  maturita_unlocked?: boolean;
  is_admin?: boolean;
  family_role?: string;
  email_is_relay?: boolean;
  email_verified?: boolean;
  profile_completed?: boolean;
} | null;

type AuthState = {
  token: string | null;
  user: User;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (session_id: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  setSession: (token: string, user: any) => void;
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

      loginWithGoogle: async (session_id: string) => {
        set({ loading: true, error: null });
        try {
          const res = await api.googleAuth(session_id);
          set({ token: res.access_token, user: res.user, loading: false });
        } catch (err: any) {
          set({
            loading: false,
            error: err?.message ?? "Errore accesso con Google",
          });
          throw err;
        }
      },

      signup: async (email, username, password) => {
        set({ loading: true, error: null });
        try {
          const res = await api.signup({ email, username, password });
          set({ token: res.access_token, user: res.user, loading: false });
        } catch (err: any) {
          set({
            loading: false,
            error: err?.message ?? "Errore in fase di registrazione",
          });
          throw err;
        }
      },

      setSession: (token, user) => {
        set({ token, user, error: null });
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
