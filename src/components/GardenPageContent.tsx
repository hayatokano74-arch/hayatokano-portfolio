"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 3ヶ月単位のページネーションを管理する。
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { GardenNodeSummary } from "@/lib/garden/types";
import { useGardenSearch } from "@/lib/garden/use-garden-search";
import { GardenSearch } from "./GardenSearch";
import { GardenGrid } from "./GardenGrid";
import { GardenPagination } from "./GardenPagination";

/** 1ページあたりの月数 */
const MONTHS_PER_PAGE = 3;

/** 年月ラベルを生成 */
function toYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "日付不明";
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** ノードを年月でグループ化（降順前提） */
function groupByYearMonth(nodes: GardenNodeSummary[]) {
  const groups: { label: string; nodes: GardenNodeSummary[] }[] = [];
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

/** ページの期間ラベルを生成（例: "2025年7月 — 9月"） */
function pageRangeLabel(groups: { label: string }[]): string {
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

export function GardenPageContent({ nodes }: { nodes: GardenNodeSummary[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
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

  // 全グループ
  const allGroups = useMemo(() => groupByYearMonth(filteredNodes), [filteredNodes]);

  // ページネーション計算
  const totalPages = Math.max(1, Math.ceil(allGroups.length / MONTHS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // 現在のページに表示するグループ
  const pageGroups = useMemo(() => {
    const start = (safePage - 1) * MONTHS_PER_PAGE;
    return allGroups.slice(start, start + MONTHS_PER_PAGE);
  }, [allGroups, safePage]);

  // 各ページの期間ラベル（ページネーション UI 用）
  const pageLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < totalPages; i++) {
      const start = i * MONTHS_PER_PAGE;
      const groups = allGroups.slice(start, start + MONTHS_PER_PAGE);
      labels.push(pageRangeLabel(groups));
    }
    return labels;
  }, [allGroups, totalPages]);

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
      // ページ上部にスクロール
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
      <GardenGrid groups={pageGroups} totalNodes={filteredNodes.length} allGroups={allGroups} safePage={safePage} />
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
