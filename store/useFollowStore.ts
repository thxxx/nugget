import { create } from "zustand";

import type { FollowUser } from "@/lib/types/domain";

type FollowStore = {
  following: FollowUser[];
  followers: FollowUser[];
  searchResults: FollowUser[];
  setFollowing: (following: FollowUser[]) => void;
  setFollowers: (followers: FollowUser[]) => void;
  setSearchResults: (searchResults: FollowUser[]) => void;
};

export const useFollowStore = create<FollowStore>((set) => ({
  following: [],
  followers: [],
  searchResults: [],
  setFollowing: (following) => {
    set({ following });
  },
  setFollowers: (followers) => {
    set({ followers });
  },
  setSearchResults: (searchResults) => {
    set({ searchResults });
  },
}));
