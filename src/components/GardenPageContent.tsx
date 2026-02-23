"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 投稿数ベースのページネーションを管理する。
 * 月グループは分割せず、約15件ごとにページを区切る。
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { GardenNode } from "@/lib/garden/types";
import { useGardenSearch } from "@/lib/garden/use-garden-search";
import { GardenSearch } from "./GardenSearch";
import { GardenGrid } from "./GardenGrid";
import { GardenPagination } from "./GardenPagination";

/** 1ページあたりの目標投稿数 */
const NODES_PER_PAGE = 15;

interface MonthGroup {
  label: string;
  nodes: GardenNode[];
}

/** 年月ラベルを生成 */
function toYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "日付不明";
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** ノードを年月でグループ化（降順前提） */
function groupByYearMonth(nodes: GardenNode[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let currentLabel = "";

  for (const node of nodes) {
    const label = toYearMonth(node.date);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, nodes: [node] });
    } else {
      groups[groups.length - 1].nodes.push(node);
    }
  }

  return groups;
}

/**
 * 月グループを投稿数ベースでページに分割する。
 * - 月グループは絶対に分割しない（1つの月が2ページにまたがらない）
 * - 目標投稿数に達したらページを閉じる
 * - 最後のページが極端に少ない場合は前のページに統合
 */
function groupIntoPages(groups: MonthGroup[]): MonthGroup[][] {
  if (groups.length === 0) return [];

  const pages: MonthGroup[][] = [];
  let currentPage: MonthGroup[] = [];
  let currentCount = 0;

  for (const group of groups) {
    currentPage.push(group);
    currentCount += group.nodes.length;

    if (currentCount >= NODES_PER_PAGE) {
      pages.push(currentPage);
      currentPage = [];
      currentCount = 0;
    }
  }

  // 残りのグループを処理
  if (currentPage.length > 0) {
    // 最後のページが少なすぎる場合（5件未満）は前のページに統合
    if (pages.length > 0 && currentCount < Math.floor(NODES_PER_PAGE / 3)) {
      pages[pages.length - 1].push(...currentPage);
    } else {
      pages.push(currentPage);
    }
  }

  return pages;
}

/** ページの期間ラベルを生成（実在する月のみ表示） */
function pageRangeLabel(groups: MonthGroup[]): string {
  if (groups.length === 0) return "";
  if (groups.length === 1) return groups[0].label;

  const first = groups[groups.length - 1].label; // 古い方
  const last = groups[0].label; // 新しい方

  // 同年なら月だけ表示（例: "2025年7月 — 9月"）
  const yearMatch = first.match(/^(\d+)年/);
  const lastYearMatch = last.match(/^(\d+)年/);
  if (yearMatch && lastYearMatch && yearMatch[1] === lastYearMatch[1]) {
    const monthOnly = last.replace(/^\d+年/, "");
    return `${first} — ${monthOnly}`;
  }

  return `${first} — ${last}`;
}

export function GardenPageContent({ nodes }: { nodes: GardenNode[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialPage = parseInt(searchParams.get("page") ?? "1", 10);
  const [searchQuery, setSearchQuery] = useState<string | null>(initialQuery || null);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);
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
    () => pages.map((pageGroups) => pageRangeLabel(pageGroups)),
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

  // 検索中はページネーション非表示
  const showPagination = !searchQuery && totalPages > 1;

  return (
    <div className="garden-content">
      <GardenSearch
        search={search}
        onFullSearch={handleFullSearch}
        fullSearchIds={fullSearchIds}
      />
      <GardenGrid groups={pageGroups} totalNodes={filteredNodes.length} prevNodeCount={prevNodeCount} />
      {showPagination && (
        <GardenPagination
          currentPage={safePage}
          totalPages={totalPages}
          pageLabels={pageLabels}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
