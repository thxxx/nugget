import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SessionUser } from "@/lib/types/domain";

type SessionStore = {
  sessionUser: SessionUser | null;
  hydrated: boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      sessionUser: null,
      hydrated: false,
      login: (user) => {
        set({ sessionUser: user });
      },
      logout: () => {
        set({ sessionUser: null });
      },
      setHydrated: (hydrated) => {
        set({ hydrated });
      },
    }),
    {
      name: "nugget_session_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionUser: state.sessionUser,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
