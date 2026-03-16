"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/** 検索入力のスタイル定義 */
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

/**
 * 検索バーのプレースホルダー（Suspense fallback用）
 */
export function SearchPlaceholder() {
  return (
    <div className="header-search">
      <div style={{ ...searchInputStyle, color: "var(--muted)" }}>SEARCH:</div>
    </div>
  );
}

/**
 * 検索入力コンポーネント
 * リアルタイム検索: 入力300ms後に自動検索、クリアで即リセット
 */
export function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [query, setQuery] = useState(sp.get("q") ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(sp.get("q") ?? "");
  }, [sp]);

  const commit = useCallback((value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    /* 検索変更時はページを1にリセット */
    params.delete("page");
    const qs = params.toString();
    /* replace で履歴を汚さない（入力ごとに戻るボタンが増えない） */
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, sp]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) {
      commit(v);
    } else {
      timerRef.current = setTimeout(() => commit(v), 300);
    }
  }, [commit]);

  /* タイマーのクリーンアップ */
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="header-search">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="SEARCH:"
        aria-label="作品を検索"
        style={searchInputStyle}
      />
    </div>
  );
}
