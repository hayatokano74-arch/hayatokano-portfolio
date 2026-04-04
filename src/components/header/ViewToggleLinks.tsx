"use client";

import { useViewMode } from "@/components/ViewModeContext";
import { GridIcon, ListIcon } from "./icons";

/**
 * Grid/List 表示切替ボタン
 * ViewModeContext を使い、クリックで即座に切り替え（ページ遷移なし）
 */
export function ViewToggleLinks() {
  const { view, setView } = useViewMode();

  return (
    <>
      <button
        type="button"
        className={`view-toggle-seg ${view === "grid" ? "is-active" : ""}`}
        aria-label="グリッド表示"
        aria-pressed={view === "grid"}
        onClick={() => setView("grid")}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className={`view-toggle-seg ${view === "list" ? "is-active" : ""}`}
        aria-label="リスト表示"
        aria-pressed={view === "list"}
        onClick={() => setView("list")}
      >
        <ListIcon />
      </button>
    </>
  );
}
