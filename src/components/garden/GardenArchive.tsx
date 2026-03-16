"use client";

/**
 * Garden アーカイブUI
 * デスクトップ用サイドバーとモバイル用ボトムドロワーの2つのコンポーネントを提供する。
 */

import { useState, useCallback, useMemo } from "react";
import type { MonthGroup } from "@/lib/garden/group-by-month";
import { buildArchiveTree } from "@/lib/garden/pagination";
import type { GardenArchiveYear } from "@/lib/garden/pagination";

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

/* ─── 共通ボタンスタイル ─── */
const btnStyle = {
  border: 0,
  background: "transparent",
  padding: 0,
  cursor: "pointer",
} as const;

/* ─── 年ツリーの共通コンポーネント ─── */
function ArchiveYearTree({
  tree,
  currentPage,
  openKeys,
  onToggle,
  onSelect,
}: {
  tree: GardenArchiveYear[];
  currentPage: number;
  openKeys: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (page: number) => void;
}) {
  return (
    <>
      {tree.map((yearNode) => {
        const yearOpen = openKeys.has(yearNode.year);
        return (
          <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
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

            {yearOpen ? (
              <div style={{ paddingLeft: "var(--space-5)", marginTop: "var(--space-1)" }}>
                {yearNode.months.map((m) => {
                  const isActive = m.page === currentPage;
                  return (
                    <div key={m.groupLabel} style={{ marginBottom: "var(--space-1)" }}>
                      <button
                        type="button"
                        onClick={() => onSelect(m.page)}
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
    </>
  );
}

/* ─── 年ツリーの開閉状態を管理するHook ─── */
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
  pages,
  currentPage,
  onPageChange,
}: {
  pages: MonthGroup[][];
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const tree = useMemo(() => buildArchiveTree(pages), [pages]);
  const { openKeys, toggle } = useArchiveToggle(tree);

  return (
    <aside className="garden-sidebar">
      <div>
        <ArchiveYearTree
          tree={tree}
          currentPage={currentPage}
          openKeys={openKeys}
          onToggle={toggle}
          onSelect={onPageChange}
        />
      </div>
    </aside>
  );
}

/* ─── モバイル用ボトムドロワー ─── */
export function GardenMobileArchiveDrawer({
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
  const tree = useMemo(() => buildArchiveTree(pages), [pages]);
  const { openKeys, toggle } = useArchiveToggle(tree);

  // 月選択時にドロワーも閉じる
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
        />
      </div>
    </>
  );
}
