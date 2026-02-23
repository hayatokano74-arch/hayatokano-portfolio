"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 投稿数ベースのページネーション + アーカイブサイドバーを管理する。
 * 月グループは分割せず、約30件ごとにページを区切る。
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { GardenNode } from "@/lib/garden/types";
import { useGardenSearch } from "@/lib/garden/use-garden-search";
import { GardenSearch } from "./GardenSearch";
import { GardenGrid } from "./GardenGrid";
import { GardenPagination } from "./GardenPagination";
import { Header } from "./Header";

/** 1ページあたりの目標投稿数 */
const NODES_PER_PAGE = 30;

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

/* ─── アーカイブツリーのデータ構造 ─── */
type GardenArchiveMonth = {
  label: string;       // "2月"
  groupLabel: string;  // "2026年2月"（MonthGroup.label と一致）
  count: number;
  page: number;        // 1始まり
};
type GardenArchiveYear = {
  year: string;
  count: number;
  months: GardenArchiveMonth[];
};

/** pages（MonthGroup[][]）から年→月の2階層ツリーを構築 */
function buildGardenArchiveTree(pages: MonthGroup[][]): GardenArchiveYear[] {
  const tree: GardenArchiveYear[] = [];
  const yearMap = new Map<string, GardenArchiveYear>();

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    for (const group of pages[pageIdx]) {
      // "2026年2月" → year="2026", monthLabel="2月"
      const match = group.label.match(/^(\d+)年(\d+)月$/);
      if (!match) continue;

      const [, yearStr, monthStr] = match;
      const nodeCount = group.nodes.length;

      let yearNode = yearMap.get(yearStr);
      if (!yearNode) {
        yearNode = { year: yearStr, count: 0, months: [] };
        yearMap.set(yearStr, yearNode);
        tree.push(yearNode);
      }
      yearNode.count += nodeCount;

      // 同じ月が複数ページにまたがることはないので直接追加
      yearNode.months.push({
        label: `${Number(monthStr)}月`,
        groupLabel: group.label,
        count: nodeCount,
        page: pageIdx + 1,
      });
    }
  }
  return tree;
}

/* ─── 三角形アイコン ─── */
function ToggleArrow({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 8,
        fontSize: 8,
        lineHeight: 1,
        transition: "transform 120ms ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        color: "var(--muted)",
      }}
    >
      ▶
    </span>
  );
}

/* ─── Garden アーカイブサイドバー ─── */
function GardenArchiveSidebar({
  pages,
  currentPage,
  onPageChange,
}: {
  pages: MonthGroup[][];
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const tree = useMemo(() => buildGardenArchiveTree(pages), [pages]);

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree.length > 0) initial.add(tree[0].year);
    return initial;
  });

  const toggle = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const btnStyle = {
    border: 0,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  } as const;

  return (
    <aside className="garden-sidebar">
      <div>
        {tree.map((yearNode) => {
          const yearOpen = openKeys.has(yearNode.year);
          return (
            <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => toggle(yearNode.year)}
                aria-expanded={yearOpen}
                aria-label={`${yearNode.year}年のアーカイブ`}
                style={{
                  ...btnStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  fontWeight: 700,
                  color: "var(--fg)",
                }}
              >
                <ToggleArrow open={yearOpen} />
                <span>{yearNode.year}</span>
                <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                  ({yearNode.count})
                </span>
              </button>

              {yearOpen ? (
                <div style={{ paddingLeft: "var(--space-3)", marginTop: "var(--space-1)" }}>
                  {yearNode.months.map((m) => {
                    const isActive = m.page === currentPage;
                    return (
                      <div key={m.groupLabel} style={{ marginBottom: "var(--space-1)" }}>
                        <button
                          type="button"
                          onClick={() => onPageChange(m.page)}
                          style={{
                            ...btnStyle,
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            fontSize: "var(--font-body)",
                            lineHeight: "var(--lh-normal)",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "var(--fg)" : "var(--muted)",
                            fontFamily: "inherit",
                          }}
                        >
                          <span>{m.label}</span>
                          <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                            ({m.count})
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ─── Garden モバイル用ボトムドロワーアーカイブ ─── */
function GardenMobileArchiveDrawer({
  pages,
  currentPage,
  onPageChange,
  open,
  onClose,
}: {
  pages: MonthGroup[][];
  currentPage: number;
  onPageChange: (page: number) => void;
  open: boolean;
  onClose: () => void;
}) {
  const tree = useMemo(() => buildGardenArchiveTree(pages), [pages]);

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree.length > 0) initial.add(tree[0].year);
    return initial;
  });

  const toggle = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const btnStyle = {
    border: 0,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  } as const;

  if (!open) return null;

  return (
    <>
      <div className="mobile-archive-drawer-backdrop" onClick={onClose} />
      <div className="mobile-archive-drawer">
        <div className="mobile-archive-drawer-header">
          <span style={{ fontSize: "var(--font-heading)", fontWeight: 700 }}>Archive</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnStyle,
              fontSize: "var(--font-body)",
              lineHeight: 1,
              color: "var(--muted)",
            }}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {tree.map((yearNode) => {
          const yearOpen = openKeys.has(yearNode.year);
          return (
            <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => toggle(yearNode.year)}
                aria-expanded={yearOpen}
                aria-label={`${yearNode.year}年のアーカイブ`}
                style={{
                  ...btnStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  fontWeight: 700,
                  color: "var(--fg)",
                }}
              >
                <ToggleArrow open={yearOpen} />
                <span>{yearNode.year}</span>
                <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                  ({yearNode.count})
                </span>
              </button>

              {yearOpen ? (
                <div style={{ paddingLeft: "var(--space-3)", marginTop: "var(--space-1)" }}>
                  {yearNode.months.map((m) => {
                    const isActive = m.page === currentPage;
                    return (
                      <div key={m.groupLabel} style={{ marginBottom: "var(--space-1)" }}>
                        <button
                          type="button"
                          onClick={() => {
                            onPageChange(m.page);
                            onClose();
                          }}
                          style={{
                            ...btnStyle,
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            fontSize: "var(--font-body)",
                            lineHeight: "var(--lh-normal)",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "var(--fg)" : "var(--muted)",
                            fontFamily: "inherit",
                          }}
                        >
                          <span>{m.label}</span>
                          <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                            ({m.count})
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** ページの期間ラベルを生成（実在する月のみ表示） */
function pageRangeLabel(groups: MonthGroup[]): string {
  if (groups.length === 0) return "";
  if (groups.length === 1) return groups[0].label;

  const newest = groups[0].label; // 新しい方
  const oldest = groups[groups.length - 1].label; // 古い方

  // 同年なら月だけ表示（例: "2025年9月 — 7月"）
  const newestYear = newest.match(/^(\d+)年/);
  const oldestYear = oldest.match(/^(\d+)年/);
  if (newestYear && oldestYear && newestYear[1] === oldestYear[1]) {
    const monthOnly = oldest.replace(/^\d+年/, "");
    return `${newest} — ${monthOnly}`;
  }

  return `${newest} — ${oldest}`;
}

export function GardenPageContent({ nodes }: { nodes: GardenNode[] }) {
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

  // 検索中はページネーション・アーカイブ非表示
  const showPagination = !searchQuery && totalPages > 1;
  const showArchive = !searchQuery && pages.length > 1;

  // モバイルアーカイブボタン（Header の titleRight に渡す）
  const archiveButton = showArchive ? (
    <button
      type="button"
      className="mobile-archive-trigger"
      onClick={() => setDrawerOpen(true)}
    >
      Archive +
    </button>
  ) : undefined;

  return (
    <>
      <Header
        active="Garden"
        title="Garden"
        showCategoryRow={false}
        showSearch={false}
        titleRight={archiveButton}
      />
      <div className="garden-layout">
        <div className="garden-main">
          <GardenSearch
            search={search}
            onFullSearch={handleFullSearch}
            fullSearchIds={fullSearchIds}
          />
          <GardenGrid groups={pageGroups} totalNodes={filteredNodes.length} prevNodeCount={prevNodeCount} />
        </div>
        {showArchive && (
          <GardenArchiveSidebar
            pages={pages}
            currentPage={safePage}
            onPageChange={handlePageChange}
          />
        )}
      </div>
      {showPagination && (
        <div className="garden-pagination-wrap">
          <GardenPagination
            currentPage={safePage}
            totalPages={totalPages}
            pageLabels={pageLabels}
            onPageChange={handlePageChange}
          />
        </div>
      )}
      {showArchive && (
        <GardenMobileArchiveDrawer
          pages={pages}
          currentPage={safePage}
          onPageChange={handlePageChange}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
