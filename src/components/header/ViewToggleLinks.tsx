"use client";

import Link from "next/link";
import { GridIcon, ListIcon } from "./icons";

export type ViewToggleLinksProps = {
  view: "grid" | "list";
  gridHref: string;
  listHref: string;
};

/**
 * Grid/List 表示切替リンク（フィルターモード・従来モード共通）
 */
export function ViewToggleLinks({ view, gridHref, listHref }: ViewToggleLinksProps) {
  return (
    <>
      <Link
        href={gridHref}
        className={`view-toggle-seg ${view === "grid" ? "is-active" : ""}`}
        aria-label="グリッド表示"
      >
        <GridIcon />
      </Link>
      <Link
        href={listHref}
        className={`view-toggle-seg ${view === "list" ? "is-active" : ""}`}
        aria-label="リスト表示"
      >
        <ListIcon />
      </Link>
    </>
  );
}
