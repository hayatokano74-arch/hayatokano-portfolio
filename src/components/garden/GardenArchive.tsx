"use client";

/**
 * Garden アーカイブUI
 * 年 > 月 > 投稿タイトルの3階層ツリー。
 * デスクトップ用サイドバーとモバイル用ボトムドロワーを提供する。
 */

import React, { useState, useCallback } from "react";
import Link from "next/link";
import type { GardenNode } from "@/lib/garden/types";
import { buildArchiveTree } from "@/lib/garden/pagination";
import type { GardenArchiveYear } from "@/lib/garden/pagination";
import { titleToSlug } from "@/lib/garden/slug";

/* ─── 三角形アイコン（SVGで絵文字化を回避） ─── */
function ToggleArrow({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="6"
      height="8"
      viewBox="0 0 6 8"
      fill="currentColor"
      style={{
        display: "inline-block",
        flexShrink: 0,
        transition: "transform 120ms ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        color: "var(--muted)",
      }}
    >
      <path d="M0 0l6 4-6 4V0z" />
    </svg>
  );
}

/* ─── 共通ボタンスタイル ─── */
const btnStyle = {
  border: 0,
  background: "transparent",
  padding: 0,
  cursor: "pointer",
} as const;

/* ─── 年 > 月 > 投稿 の3階層ツリー ─── */
function ArchiveYearTree({
  tree,
  currentPage,
  openKeys,
  onToggle,
  onSelect,
  onClose,
}: {
  tree: GardenArchiveYear[];
  currentPage: number;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (page: number) => void;
  onClose?: () => void;
}) {
  return (
    <>
      {tree.map((yearNode) => {
        const yearOpen = openKeys.has(yearNode.year);
        return (
          <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
            {/* 年 */}
            <button
              type="button"
              onClick={() => onToggle(yearNode.year)}
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

            {yearOpen && (
              <div style={{ paddingLeft: "var(--space-5)", marginTop: "var(--space-1)" }}>
                {yearNode.months.map((m) => {
                  const monthKey = m.groupLabel;
                  const monthOpen = openKeys.has(monthKey);
                  return (
                    <div key={monthKey} style={{ marginBottom: "var(--space-1)" }}>
                      {/* 月: ラベルクリックで開閉、月名リンクで最初の記事へ */}
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <button
                          type="button"
                          onClick={() => onToggle(monthKey)}
                          aria-expanded={monthOpen}
                          aria-label={`${m.groupLabel}の記事を展開`}
                          style={{
                            ...btnStyle,
                            display: "flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <ToggleArrow open={monthOpen} />
                        </button>
                        <Link
                          href={`/garden/${encodeURIComponent(m.firstSlug)}`}
                          onClick={() => onClose?.()}
                          style={{
                            fontSize: "var(--font-body)",
                            lineHeight: "var(--lh-normal)",
                            fontWeight: 500,
                            color: "var(--muted)",
                            textDecoration: "none",
                          }}
                        >
                          {m.label}
                        </Link>
                        <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                          ({m.count})
                        </span>
                      </div>

                      {/* 投稿タイトル一覧 */}
                      {monthOpen && (
                        <div style={{ paddingLeft: "var(--space-5)", marginTop: "var(--space-1)" }}>
                          {m.posts.map((post) => {
                            const isActivePage = post.page === currentPage;
                            return (
                              <div key={`${post.date}-${post.title}`} style={{ marginBottom: 2 }}>
                                <Link
                                  href={`/garden/${encodeURIComponent(titleToSlug(post.title))}`}
                                  onClick={() => onClose?.()}
                                  style={{
                                    display: "block",
                                    fontSize: "var(--font-meta)",
                                    lineHeight: "var(--lh-normal)",
                                    color: isActivePage ? "var(--fg)" : "var(--muted)",
                                    textDecoration: "none",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {post.title}
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ─── 開閉状態を管理するHook ─── */
function useArchiveToggle(tree: GardenArchiveYear[]) {
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

  return { openKeys, toggle };
}

/* ─── デスクトップ用サイドバー ─── */
export function GardenArchiveSidebar({
  nodes,
  currentPage,
  onPageChange,
  searchElement,
}: {
  nodes: GardenNode[];
  currentPage: number;
  onPageChange: (page: number) => void;
  searchElement?: React.ReactNode;
}) {
  const tree = buildArchiveTree(nodes);
  const { openKeys, toggle } = useArchiveToggle(tree);

  return (
    <aside className="garden-sidebar">
      <div className="garden-sidebar-inner">
        <ArchiveYearTree
          tree={tree}
          currentPage={currentPage}
          openKeys={openKeys}
          onToggle={toggle}
          onSelect={onPageChange}
        />
        {searchElement && (
          <div className="garden-sidebar-search">
            {searchElement}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ─── モバイル用ボトムドロワー ─── */
export function GardenMobileArchiveDrawer({
  nodes,
  currentPage,
  onPageChange,
  open,
  onClose,
  searchElement,
}: {
  nodes: GardenNode[];
  currentPage: number;
  onPageChange: (page: number) => void;
  open: boolean;
  onClose: () => void;
  searchElement?: React.ReactNode;
}) {
  const tree = buildArchiveTree(nodes);
  const { openKeys, toggle } = useArchiveToggle(tree);

  const handleSelect = useCallback(
    (page: number) => {
      onPageChange(page);
      onClose();
    },
    [onPageChange, onClose],
  );

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

        <ArchiveYearTree
          tree={tree}
          currentPage={currentPage}
          openKeys={openKeys}
          onToggle={toggle}
          onSelect={handleSelect}
          onClose={onClose}
        />
      </div>
    </>
  );
}
