"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 投稿数ベースのページネーション + アーカイブサイドバーを管理する。
 */

import dynamic from "next/dynamic";
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
        titleRight={archiveButton}
      />
      <div className="garden-layout">
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
          <GardenGrid
            groups={state.pageGroups}
            totalNodes={state.filteredNodes.length}
            prevNodeCount={state.prevNodeCount}
          />
        </div>
        {state.showArchive && (
          <GardenArchiveSidebar
            nodes={state.filteredNodes}
            currentPage={state.safePage}
            onPageChange={state.handlePageChange}
            searchElement={searchElement}
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
        nodes={state.filteredNodes}
        currentPage={state.safePage}
        onPageChange={state.handlePageChange}
        open={state.drawerOpen}
        onClose={state.closeDrawer}
        searchElement={searchElement}
      />
    </>
  );
}
