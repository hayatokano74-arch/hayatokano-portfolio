"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useFilterContext } from "@/components/FilterableContent";

const searchInputStyle = {
  width: "100%",
  border: 0,
  background: "transparent",
  fontSize: "var(--font-body)",
  lineHeight: "var(--lh-normal)",
  color: "var(--fg)",
  padding: 0,
  outline: "none",
  fontFamily: "inherit",
} as const;

export function SearchPlaceholder() {
  return (
    <div className="header-search">
      <div style={{ ...searchInputStyle, color: "var(--muted)" }}>SEARCH:</div>
    </div>
  );
}

/**
 * 検索入力コンポーネント
 * FilterContext の searchQuery を更新し、FilteredWorksList が即座にフィルタリングする。
 */
export function SearchInput() {
  const { searchQuery, setSearchQuery } = useFilterContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) {
      setSearchQuery("");
    } else {
      timerRef.current = setTimeout(() => setSearchQuery(v.trim()), 300);
    }
  }, [setSearchQuery]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="header-search">
      <input
        type="text"
        defaultValue={searchQuery}
        onChange={handleChange}
        placeholder="SEARCH:"
        aria-label="作品を検索"
        style={searchInputStyle}
      />
    </div>
  );
}
