"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * カスタムカーソル
 * - 通常時: 小ドット（16px）がマウスに滑らかに追従
 * - [data-cursor="view"] 要素ホバー時: 拡大（80px）+ "View" テキスト
 * - requestAnimationFrame + lerp で遅延追従（ぬるっとした動き）
 * - タッチデバイス / prefers-reduced-motion で非表示
 */
export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  /* マウス位置（即時更新） */
  const mouse = useRef({ x: 0, y: 0 });
  /* カーソル描画位置（lerp で滑らかに追従） */
  const pos = useRef({ x: 0, y: 0 });
  /* ホバー状態 */
  const hovering = useRef(false);
  /* RAF id */
  const rafId = useRef<number>(0);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  /* アニメーションループ */
  const tick = useCallback(() => {
    const speed = hovering.current ? 0.12 : 0.18;
    pos.current.x = lerp(pos.current.x, mouse.current.x, speed);
    pos.current.y = lerp(pos.current.y, mouse.current.y, speed);

    const el = cursorRef.current;
    if (el) {
      el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
    }

    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    /* 初期位置をビューポート外に */
    pos.current = { x: -100, y: -100 };
    mouse.current = { x: -100, y: -100 };

    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    /* event delegation: data-cursor 属性を持つ要素を検知 */
    const onOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-cursor]");
      if (target) {
        hovering.current = true;
        el.classList.add("is-hovering");
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-cursor]");
      if (target) {
        hovering.current = false;
        el.classList.remove("is-hovering");
      }
    };

    /* ページ外に出た時リセット */
    const onLeave = () => {
      hovering.current = false;
      el.classList.remove("is-hovering");
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    document.addEventListener("mouseleave", onLeave, { passive: true });

    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, [tick]);

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      <span className="custom-cursor-text">View</span>
    </div>
  );
}
