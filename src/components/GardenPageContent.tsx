"use client";

/**
 * Garden一覧ページのClient Component
 * 検索 + 投稿数ベースのページネーション + アーカイブサイドバーを管理する。
 * Footerを内包し、モバイルではArchiveボタンをフッター枠内に統合する。
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
        showCategoryRow={false}
        showSearch={false}
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
      {/* フッター（Archiveボタンをモバイルで枠内に統合） */}
      <footer className="site-footer">
        <div className="site-footer-inner">
          <button
            type="button"
            className="garden-footer-archive-btn"
            onClick={state.openDrawer}
          >
            Archive
          </button>
          <a href="mailto:info@hayatokano.com" className="footer-link">
            info@hayatokano.com
          </a>
          <a
            href="https://www.instagram.com/_hayatokano/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Instagram
          </a>
          <a
            href="https://x.com/_oshica"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            X
          </a>
          <span className="footer-copy">© {new Date().getFullYear()} Hayato Kano</span>
        </div>
      </footer>
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
