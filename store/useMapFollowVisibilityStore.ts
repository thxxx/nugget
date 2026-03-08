import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type MapFollowVisibilityStore = {
  visibilityByUserId: Record<string, boolean>;
  hydrated: boolean;
  setUserVisibility: (userId: string, enabled: boolean) => void;
  syncFollowingUsers: (userIds: string[]) => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useMapFollowVisibilityStore = create<MapFollowVisibilityStore>()(
  persist(
    (set) => ({
      visibilityByUserId: {},
      hydrated: false,
      setUserVisibility: (userId, enabled) => {
        set((state) => ({
          visibilityByUserId: {
            ...state.visibilityByUserId,
            [userId]: enabled,
          },
        }));
      },
      syncFollowingUsers: (userIds) => {
        set((state) => {
          const next: Record<string, boolean> = {};

          for (const userId of userIds) {
            next[userId] = state.visibilityByUserId[userId] ?? true;
          }

          return {
            visibilityByUserId: next,
          };
        });
      },
      setHydrated: (hydrated) => {
        set({ hydrated });
      },
    }),
    {
      name: "nugget_map_follow_visibility_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        visibilityByUserId: state.visibilityByUserId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
