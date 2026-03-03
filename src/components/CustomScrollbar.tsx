/**
 * 水平プログレスライン
 *
 * 画面上端に 2px のラインを表示。
 * スクロール位置に応じて左→右へ伸びる（CSS animation-timeline: scroll()）。
 * スクロール中のみ表示、停止後フェードアウト（is-scrolling クラス連動）。
 *
 * JS 不要の純粋な CSS 駆動。レイアウトに影響なし。
 */
export function CustomScrollbar() {
  return <div aria-hidden="true" className="scroll-progress-line" />;
}
