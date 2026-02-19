"use client";

import { useState, useMemo } from "react";
import { GardenLinkedPages } from "./GardenLinkedPages";
import { GardenTwoHopLinks } from "./GardenTwoHopLinks";
import type { LinkedPageSummary, TwoHopGroup } from "@/lib/garden/types";

type SortKey = "date" | "title";

interface Props {
  linkedPages: LinkedPageSummary[];
  twoHopGroups: TwoHopGroup[];
}

/** テキストフィルタ: タイトル・抜粋の部分一致（大文字小文字無視） */
function matchesQuery(page: LinkedPageSummary, query: string): boolean {
  const q = query.toLowerCase();
  if (page.title.toLowerCase().includes(q)) return true;
  if (page.excerpt?.toLowerCase().includes(q)) return true;
  return false;
}

/** ソート比較関数 */
function compareFn(sortBy: SortKey) {
  return (a: LinkedPageSummary, b: LinkedPageSummary): number => {
    if (sortBy === "date") {
      // 日付降順（新しい順）。日付なしは末尾
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da === db) return a.title.localeCompare(b.title, "ja");
      return da > db ? -1 : 1;
    }
    // タイトル昇順
    return a.title.localeCompare(b.title, "ja");
  };
}

/** 検索 + ソートUI付きの関連ページセクション */
export function GardenDetailRelated({ linkedPages, twoHopGroups }: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  // フィルタ・ソート済みのLinkedPages
  const filteredLinked = useMemo(() => {
    let pages = linkedPages;
    if (query) pages = pages.filter((p) => matchesQuery(p, query));
    return [...pages].sort(compareFn(sortBy));
  }, [linkedPages, query, sortBy]);

  // フィルタ・ソート済みのTwoHopGroups
  const filteredGroups = useMemo(() => {
    if (!query) {
      // ソートのみ: 各グループ内のページをソート
      return twoHopGroups.map((g) => ({
        ...g,
        pages: [...g.pages].sort(compareFn(sortBy)),
      }));
    }
    // フィルタ + ソート: マッチするページがないグループは除外
    return twoHopGroups
      .map((g) => ({
        ...g,
        pages: g.pages.filter((p) => matchesQuery(p, query)).sort(compareFn(sortBy)),
      }))
      .filter((g) => g.pages.length > 0);
  }, [twoHopGroups, query, sortBy]);

  // リンクと関連ページの合計が0なら何も表示しない
  const totalPages = linkedPages.length + twoHopGroups.reduce((n, g) => n + g.pages.length, 0);
  if (totalPages === 0) return null;

  return (
    <div className="garden-related">
      {/* 検索 + ソートコントロール */}
      <div className="garden-related-controls">
        <div className="garden-related-search-wrap">
          <svg
            className="garden-related-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="garden-related-search"
            placeholder="関連ページを検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="garden-related-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="date">日付</option>
          <option value="title">タイトル</option>
        </select>
      </div>

      {/* フィルタ結果 */}
      <GardenLinkedPages pages={filteredLinked} />
      <GardenTwoHopLinks groups={filteredGroups} />

      {/* フィルタで全件消えた場合 */}
      {query && filteredLinked.length === 0 && filteredGroups.length === 0 && (
        <p className="garden-related-empty">
          「{query}」に一致するページはありません
        </p>
      )}
    </div>
  );
}
