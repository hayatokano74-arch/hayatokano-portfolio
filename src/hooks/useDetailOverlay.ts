"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Infoオーバーレイ Hook
 * - Escキーで閉じる
 * - フォーカストラップ（Tabキーをオーバーレイ内に閉じ込める）
 * - htmlスクロール停止（二重スクロールバー防止）
 * - スクロール中クラス付与
 */
export function useDetailOverlay() {
  const [detailOpen, setDetailOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayScrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* オーバーレイ表示中: htmlスクロール停止（二重スクロールバー防止） */
  useEffect(() => {
    if (!detailOpen) return;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = ""; };
  }, [detailOpen]);

  /* オーバーレイ表示中: Escキーで閉じる */
  useEffect(() => {
    if (!detailOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  /* オーバーレイ表示中: フォーカストラップ（Tabキーをオーバーレイ内に閉じ込める） */
  useEffect(() => {
    if (!detailOpen) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      /* オーバーレイ内のフォーカス可能な要素を取得 */
      const focusable = overlay.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        /* Shift+Tab: 最初の要素にいたら最後へ循環 */
        if (document.activeElement === first || !overlay.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        /* Tab: 最後の要素にいたら最初へ循環 */
        if (document.activeElement === last || !overlay.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  /* オーバーレイ: スクロール中だけ is-scrolling クラスを付与 */
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !detailOpen) return;
    const onScroll = () => {
      el.classList.add("is-scrolling");
      clearTimeout(overlayScrollTimer.current);
      overlayScrollTimer.current = setTimeout(() => el.classList.remove("is-scrolling"), 1000);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(overlayScrollTimer.current);
    };
  }, [detailOpen]);

  return { detailOpen, setDetailOpen, overlayRef };
}
