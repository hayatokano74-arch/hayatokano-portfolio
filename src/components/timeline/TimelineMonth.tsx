"use client";

import { useArchiveTree } from "@/hooks/useArchiveTree";
import { ArchiveTreeNodes, btnStyle } from "./ArchiveTreeNodes";

/** Blogger風アーカイブサイドバー（デスクトップ用） */
export function ArchiveSidebar({
  allDates,
  activeMonth,
  activeDate,
}: {
  allDates: string[];
  activeMonth?: string;
  activeDate?: string;
}) {
  const { tree, openKeys, toggle } = useArchiveTree(allDates);

  return (
    <aside className="timeline-sidebar">
      <div>
        <ArchiveTreeNodes
          tree={tree}
          openKeys={openKeys}
          toggle={toggle}
          activeMonth={activeMonth}
          activeDate={activeDate}
        />
      </div>
    </aside>
  );
}

/** モバイル用ボトムドロワーアーカイブ */
export function MobileArchiveDrawer({
  allDates,
  activeMonth,
  activeDate,
  open,
  onClose,
}: {
  allDates: string[];
  activeMonth?: string;
  activeDate?: string;
  open: boolean;
  onClose: () => void;
}) {
  const { tree, openKeys, toggle } = useArchiveTree(allDates);

  if (!open) return null;

  return (
    <>
      {/* バックドロップ */}
      <div className="mobile-archive-drawer-backdrop" onClick={onClose} />

      {/* ドロワー本体 */}
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

        <ArchiveTreeNodes
          tree={tree}
          openKeys={openKeys}
          toggle={toggle}
          activeMonth={activeMonth}
          activeDate={activeDate}
          onNavigate={onClose}
        />
      </div>
    </>
  );
}
