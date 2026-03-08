export type SessionUser = {
  id: string;
  nickname: string;
};

export type VisitStatus = "planned" | "visited";
export type SaveVisibility = "public" | "private";

export type SearchPlaceItem = {
  externalPlaceKey: string;
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone: string;
  link: string;
  rawMapx: number;
  rawMapy: number;
  latitude: number | null;
  longitude: number | null;
};

export type SaveOwner = {
  userId: string;
  nickname: string;
  saveId: number;
  memo: string | null;
  visitStatus: VisitStatus;
  tags: string[];
  isPublic: boolean;
  rating: 1 | 2 | 3;
  likeCount: number;
  dislikeCount: number;
  viewerReaction: "like" | "dislike" | null;
  createdAt: string;
};

export type MapFeedPlace = {
  placeId: number;
  externalPlaceKey: string;
  name: string;
  category: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  latitude: number;
  longitude: number;
  owners: SaveOwner[];
};

export type FollowUser = {
  id: string;
  nickname: string;
  isFollowing: boolean;
  isFollower: boolean;
  followerCount?: number;
  followingCount?: number;
  saveCount?: number;
};

export type SavePayloadPlace = {
  externalPlaceKey: string;
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone: string;
  link: string;
  rawMapx: number;
  rawMapy: number;
  latitude: number;
  longitude: number;
};

export type SaveListItem = {
  saveId: number;
  memo: string;
  visitStatus: VisitStatus;
  tags: string[];
  isPublic: boolean;
  rating: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
  place: {
    placeId: number;
    externalPlaceKey: string;
    name: string;
    category: string;
    roadAddress: string | null;
    jibunAddress: string | null;
    latitude: number;
    longitude: number;
  };
};
