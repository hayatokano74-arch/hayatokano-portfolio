"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 投稿数ベースのページネーション + アーカイブサイドバーを管理する。
 */

import type { GardenNode } from "@/lib/garden/types";
import { useGardenState } from "@/hooks/useGardenState";
import { GardenSearch } from "./GardenSearch";
import { GardenGrid } from "./GardenGrid";
import { GardenPagination } from "./GardenPagination";
import { Header } from "./Header";
import { GardenArchiveSidebar, GardenMobileArchiveDrawer } from "./garden/GardenArchive";

export function GardenPageContent({ nodes }: { nodes: GardenNode[] }) {
  const state = useGardenState(nodes);

  return (
    <>
      <Header
        active="Garden"
        title={<>Garden<span className="page-title-count">({nodes.length})</span></>}
        showCategoryRow={false}
        showSearch={false}
      />
      <div className="garden-layout">
        <div className="garden-main">
          <div className="garden-search-bar">
            <GardenSearch
              search={state.search}
              onFullSearch={state.handleFullSearch}
              fullSearchIds={state.fullSearchIds}
            />
            {state.showArchive && (
              <button
                type="button"
                className="garden-archive-trigger"
                onClick={state.openDrawer}
                aria-label="アーカイブを開く"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
              </button>
            )}
          </div>
          <GardenGrid
            groups={state.pageGroups}
            totalNodes={state.filteredNodes.length}
            prevNodeCount={state.prevNodeCount}
          />
        </div>
        {state.showArchive && (
          <GardenArchiveSidebar
            pages={state.pages}
            currentPage={state.safePage}
            onPageChange={state.handlePageChange}
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
      {state.showArchive && (
        <GardenMobileArchiveDrawer
          pages={state.pages}
          currentPage={state.safePage}
          onPageChange={state.handlePageChange}
          open={state.drawerOpen}
          onClose={state.closeDrawer}
        />
      )}
    </>
  );
}
