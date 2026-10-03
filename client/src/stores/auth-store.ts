import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAccessToken, setAccessToken } from "@/lib/auth-token";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  /** Signed-in account snapshot for instant UI decisions (nav, guards). */
  user: AuthUser | null;
  /** Persists the user and writes the token via the shared token storage. */
  setSession: (user: AuthUser, token: string) => void;
  /** Refresh the snapshot (profile updates, session revalidation). */
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

/**
 * Client session owner. Server state (profile details, bookings) stays in
 * React Query; this store holds only the lightweight session snapshot.
 * The Bearer token itself lives in auth-token storage, written alongside
 * every session change so the two can never diverge.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setSession: (user, token) => {
        setAccessToken(token);
        set({ user });
      },
      setUser: (user) => set({ user }),
      clearSession: () => {
        clearAccessToken();
        set({ user: null });
      },
    }),
    {
      // Namespaced per app so the public site (or the other app on a
      // shared origin) can never read or collide with this session.
      name: "reservation-client:session",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
