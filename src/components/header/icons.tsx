import React from "react";

/**
 * フィルターアイコン（3本線 + 丸）
 */
export function FilterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="4" r="1.5" fill="currentColor" />
      <circle cx="11" cy="8" r="1.5" fill="currentColor" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * グリッド表示アイコン（単一の□アウトライン — wild.as スタイル）
 */
export function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * リスト表示アイコン（3本の細い横線 — wild.as スタイル）
 */
export function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="2" y1="4.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="8.5" x2="14" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12.5" x2="14" y2="12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 目の星ロゴ: 四芒星
 */
export function MenohoshiLogo() {
  return (
    <svg
      className="menohoshi-logo"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0 C13.5 8.5 15.5 10.5 24 12 C15.5 13.5 13.5 15.5 12 24 C10.5 15.5 8.5 13.5 0 12 C8.5 10.5 10.5 8.5 12 0Z" />
    </svg>
  );
}
