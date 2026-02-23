"use client";

import { useRef, useEffect } from "react";

/**
 * Garden コンテンツ本文の表示コンポーネント
 *
 * dangerouslySetInnerHTML で挿入された画像に対して
 * 読み込み完了検知 + .loaded クラス付与を行い、
 * シマー → フェードインのアニメーションを制御する。
 */
export function GardenBody({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setupImage = (img: HTMLImageElement) => {
      if (img.complete && img.naturalWidth > 0) {
        /* 既にキャッシュ等で読み込み済み */
        img.classList.add("loaded");
      } else {
        img.addEventListener(
          "load",
          () => img.classList.add("loaded"),
          { once: true },
        );
        /* エラー時もシマーを停止 */
        img.addEventListener(
          "error",
          () => img.classList.add("loaded"),
          { once: true },
        );
      }
    };

    el.querySelectorAll<HTMLImageElement>(".garden-img").forEach(setupImage);
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
