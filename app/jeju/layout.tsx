import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "제주 여행 지도",
  description: "제주 여행 장소를 담고, 날짜별 동선과 이동시간을 한눈에.",
};

export default function JejuLayout({ children }: { children: ReactNode }) {
  return children;
}
