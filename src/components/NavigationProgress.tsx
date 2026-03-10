"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * ページ遷移時にヘッダー上部に表示するプログレスバー。
 * pathname or searchParams の変化を検知して完了扱い。
 * <Link> クリック時に data-nav-progress 属性でトリガー。
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ページ遷移完了時: ロード中なら完了アニメーションへ */
  useEffect(() => {
    if (state === "loading") {
      setState("done");
      /* 完了バー表示後にリセット */
      timerRef.current = setTimeout(() => setState("idle"), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  /* <Link> クリックでローディング開始を検知（event delegation） */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return;
      /* 同一ページのハッシュリンクは除外 */
      if (href === pathname) return;
      setState("loading");
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  /* クリーンアップ */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div
      className={`nav-progress ${state === "done" ? "is-done" : ""}`}
      role="progressbar"
      aria-label="ページを読み込み中"
    />
  );
}
