"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 投稿数ベースのページネーション + アーカイブサイドバーを管理する。
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GardenNode } from "@/lib/garden/types";
import { useGardenState } from "@/hooks/useGardenState";
import { GardenSearch } from "./GardenSearch";
import { GardenGrid } from "./GardenGrid";
import { GardenPagination } from "./GardenPagination";
import { Header } from "./Header";

/* アーカイブUI: デスクトップサイドバー・モバイルドロワーともに初期表示では不要なため遅延ロード */
const GardenArchiveSidebar = dynamic(
  () => import("./garden/GardenArchive").then((m) => m.GardenArchiveSidebar),
  { ssr: false },
);
const GardenMobileArchiveDrawer = dynamic(
  () => import("./garden/GardenArchive").then((m) => m.GardenMobileArchiveDrawer),
  { ssr: false },
);

export function GardenPageContent({ nodes }: { nodes: GardenNode[] }) {
  const state = useGardenState(nodes);

  /* モバイル判定: デスクトップでは検索コンポーネントをマウントしない */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const archiveButton = (
    <button
      type="button"
      className="mobile-archive-trigger"
      onClick={state.openDrawer}
    >
      Archive +
    </button>
  );

  const searchElement = (
    <GardenSearch
      search={state.search}
      onFullSearch={state.handleFullSearch}
      fullSearchIds={state.fullSearchIds}
    />
  );

  return (
    <>
      <Header
        active="Garden"
        title={<>Garden<span className="page-title-count">({nodes.length})</span></>}
        showTitleRow={false}
        showCategoryRow={false}
        showSearch={false}
      />
      <div className="garden-layout">
        {/* モバイル専用: ヘッダーとコンテンツの間に検索+アーカイブバーを表示
            isMobileがfalseの間（デスクトップ・初期SSR）は検索をマウントしない */}
        <div className="garden-mobile-archive-bar">
          {isMobile && (
            <div className="garden-mobile-archive-search">
              <GardenSearch
                search={state.search}
                onFullSearch={state.handleFullSearch}
                fullSearchIds={state.fullSearchIds}
              />
            </div>
          )}
          <div className="garden-mobile-archive-tools">
            <span className="filter-bar-separator" aria-hidden="true" />
            {archiveButton}
          </div>
        </div>
        <div className="garden-main">
          {/* 全文検索結果バー（検索中のみ表示） */}
          {state.fullSearchIds !== null && (
            <div className="garden-search-result-bar-standalone">
              <span>検索結果: {state.fullSearchIds.length} 件</span>
              <button
                className="garden-search-result-clear"
                onClick={() => state.handleFullSearch(null)}
              >
                クリア
              </button>
            </div>
          )}
          {/* 月フィルタバー（月フィルタ中のみ表示） */}
          {state.monthFilter && (
            <div className="garden-search-result-bar-standalone">
              <span>{state.monthFilter.replace("-", "年")}月: {state.filteredNodes.length} 件</span>
              <button
                className="garden-search-result-clear"
                onClick={() => state.handleMonthFilter(null)}
              >
                クリア
              </button>
            </div>
          )}
          <GardenGrid
            groups={state.pageGroups}
          />
        </div>
        {state.showArchive && (
          <GardenArchiveSidebar
            nodes={nodes}
            currentPage={state.safePage}
            onPageChange={state.handlePageChange}
            searchElement={searchElement}
            onMonthSelect={state.handleMonthFilter}
            activeMonth={state.monthFilter}
          />
        )}
      </div>
      {state.showPagination && (
        <div className="garden-pagination-wrap">
          <GardenPagination
            currentPage={state.safePage}
            totalPages={state.totalPages}
            pageLabels={state.pageLabels}
            onPageChange={state.handlePageChange}
          />
        </div>
      )}
      <GardenMobileArchiveDrawer
        nodes={nodes}
        currentPage={state.safePage}
        onPageChange={state.handlePageChange}
        open={state.drawerOpen}
        onClose={state.closeDrawer}
        searchElement={searchElement}
        onMonthSelect={state.handleMonthFilter}
        activeMonth={state.monthFilter}
      />
    </>
  );
}
