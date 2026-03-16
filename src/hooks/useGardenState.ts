"use client";

/**
 * Garden ページの状態管理Hook
 * ページネーション、検索、アーカイブドロワーの状態を一括管理する。
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { GardenNode } from "@/lib/garden/types";
import type { MonthGroup } from "@/lib/garden/group-by-month";
import { groupByYearMonth } from "@/lib/garden/group-by-month";
import { groupIntoPages, pageRangeLabel } from "@/lib/garden/pagination";
import { useGardenSearch } from "@/lib/garden/use-garden-search";

export interface GardenState {
  /** 検索オブジェクト */
  search: ReturnType<typeof useGardenSearch>;
  /** 検索クエリ（null = 検索なし） */
  searchQuery: string | null;
  /** 全文検索のハンドラ */
  handleFullSearch: (query: string | null) => void;
  /** 全文検索結果のIDリスト（null = 検索なし） */
  fullSearchIds: string[] | null;
  /** フィルタ済みノード */
  filteredNodes: GardenNode[];
  /** 現在のページのグループ */
  pageGroups: MonthGroup[];
  /** 安全なページ番号（範囲内に補正済み） */
  safePage: number;
  /** 総ページ数 */
  totalPages: number;
  /** 全ページ情報（アーカイブ用） */
  pages: MonthGroup[][];
  /** 前のページまでの累計投稿数（通し番号用） */
  prevNodeCount: number;
  /** 各ページの期間ラベル */
  pageLabels: string[];
  /** ページ切替ハンドラ */
  handlePageChange: (page: number) => void;
  /** ページネーション表示フラグ */
  showPagination: boolean;
  /** アーカイブ表示フラグ */
  showArchive: boolean;
  /** モバイルドロワー開閉状態 */
  drawerOpen: boolean;
  /** ドロワーを開く */
  openDrawer: () => void;
  /** ドロワーを閉じる */
  closeDrawer: () => void;
}

export function useGardenState(nodes: GardenNode[]): GardenState {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);
  const [searchQuery, setSearchQuery] = useState<string | null>(initialQuery || null);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const search = useGardenSearch();

  // URL の ?q= パラメータで初期検索を実行
  useEffect(() => {
    if (initialQuery && search.ready) {
      search.fullSearch(initialQuery);
    }
  }, [search.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFullSearch = useCallback(
    (query: string | null) => {
      setSearchQuery(query);
      setCurrentPage(1); // 検索時は1ページ目に戻る
      if (query) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", query);
        url.searchParams.delete("page");
        window.history.replaceState({}, "", url.toString());
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("q");
        url.searchParams.delete("page");
        window.history.replaceState({}, "", url.toString());
      }
    },
    [],
  );

  // 全文検索結果のIDセット
  const fullSearchIds = useMemo(() => {
    if (!searchQuery || !search.fullResults) return null;
    return search.fullResults.map((r) => r.id);
  }, [searchQuery, search.fullResults]);

  // フィルタされたノード
  const filteredNodes = useMemo(() => {
    if (!fullSearchIds) return nodes;
    const idSet = new Set(fullSearchIds);
    return nodes.filter((n) => idSet.has(n.title));
  }, [nodes, fullSearchIds]);

  // 全グループ（月単位）
  const allGroups = useMemo(() => groupByYearMonth(filteredNodes), [filteredNodes]);

  // 投稿数ベースのページ分割
  const pages = useMemo(() => groupIntoPages(allGroups), [allGroups]);

  const totalPages = Math.max(1, pages.length);
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // 現在のページに表示するグループ
  const pageGroups = pages[safePage - 1] ?? [];

  // 前のページまでの合計投稿数（通し番号用）
  const prevNodeCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < safePage - 1; i++) {
      for (const group of pages[i]) {
        count += group.nodes.length;
      }
    }
    return count;
  }, [pages, safePage]);

  // 各ページの期間ラベル（ページネーション UI 用）
  const pageLabels = useMemo(
    () => pages.map((pg) => pageRangeLabel(pg)),
    [pages],
  );

  // ページ切替ハンドラ
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      const url = new URL(window.location.href);
      if (page === 1) {
        url.searchParams.delete("page");
      } else {
        url.searchParams.set("page", String(page));
      }
      window.history.replaceState({}, "", url.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  // 検索中はページネーション・アーカイブ非表示
  const showPagination = !searchQuery && totalPages > 1;
  const showArchive = !searchQuery && pages.length > 1;

  return {
    search,
    searchQuery,
    handleFullSearch,
    fullSearchIds,
    filteredNodes,
    pageGroups,
    safePage,
    totalPages,
    pages,
    prevNodeCount,
    pageLabels,
    handlePageChange,
    showPagination,
    showArchive,
    drawerOpen,
    openDrawer: useCallback(() => setDrawerOpen(true), []),
    closeDrawer: useCallback(() => setDrawerOpen(false), []),
  };
}
