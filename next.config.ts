import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    // Place photos for /jeju come from Kakao image search (Daum/Tistory/Naver blog CDNs).
    remotePatterns: [
      { protocol: "https", hostname: "**.kakaocdn.net" },
      { protocol: "https", hostname: "**.daumcdn.net" },
      { protocol: "https", hostname: "**.pstatic.net" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;
