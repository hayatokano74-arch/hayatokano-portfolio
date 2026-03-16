"use client";

import type { Work } from "@/lib/types";

/**
 * ボトムバー: Gallery / Index / Info 切替ボタン + カウンター
 */
export function BottomBar({
  work,
  mode,
  img,
  detailOpen,
  pathname,
  onGallery,
  onIndex,
  onToggleInfo,
}: {
  work: Work;
  mode: "gallery" | "index";
  img: number;
  detailOpen: boolean;
  pathname: string;
  onGallery: () => void;
  onIndex: () => void;
  onToggleInfo: () => void;
}) {
  return (
    <div className="work-detail-bottom-bar">
      <span className="wdb-cell wdb-title">
        {work.title} | {work.year}
      </span>
      <button
        type="button"
        className={`wdb-cell wdb-btn ${!detailOpen && mode === "gallery" ? "is-active" : ""}`}
        onClick={onGallery}
      >
        Gallery
      </button>
      <button
        type="button"
        className={`wdb-cell wdb-btn ${!detailOpen && mode === "index" ? "is-active" : ""}`}
        onClick={onIndex}
      >
        Index
      </button>
      <button
        type="button"
        className={`wdb-cell wdb-btn ${detailOpen ? "is-active" : ""}`}
        onClick={onToggleInfo}
      >
        Info
      </button>
      <span className="wdb-cell wdb-counter">
        {mode === "gallery" ? `${img} / ${work.media.length}` : "\u00A0"}
      </span>
    </div>
  );
}
