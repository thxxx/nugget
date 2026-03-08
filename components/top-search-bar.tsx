"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

type TopSearchBarProps = {
  query: string;
  loading?: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function TopSearchBar({
  query,
  loading = false,
  onQueryChange,
  onSubmit,
  onClear,
}: TopSearchBarProps) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white/78 px-3 py-2 shadow-[0_14px_36px_rgba(17,17,17,0.08)] backdrop-blur">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-[#8a8f87]" />
        <Input
          className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          placeholder="가게 이름 검색"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="rounded-full p-1 text-[#8a8f87] hover:bg-black/[0.04]"
            onClick={onClear}
            aria-label="검색어 지우기"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          className="h-9 min-w-12 px-2 rounded-full text-sm font-medium bg-black text-white"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "검색 중" : "검색"}
        </button>
      </div>
    </div>
  );
}
