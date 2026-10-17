"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 詳細セクションへのスクロール Hook
 * - Info押下で下の詳細セクションへスムーズスクロール
 * - スクロール位置から「詳細を見ている状態」を判定（Infoボタンの強調表示用）
 */
export function useDetailScroll() {
  const [detailOpen, setDetailOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  /* 詳細までの移動距離の半分を超えたら詳細表示中とみなす（詳細が短くても判定できるよう最大スクロール量で頭打ち） */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = Math.min(el.clientHeight, el.scrollHeight - el.clientHeight);
      setDetailOpen(distance > 0 && el.scrollTop > distance / 2);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* 帯の高さをCSS変数に反映（1画面目の高さ・詳細の移動位置の計算用。モバイルの2行折り返しにも追従） */
  useEffect(() => {
    const el = scrollRef.current;
    const bar = el?.querySelector<HTMLElement>(".work-detail-bottom-bar");
    if (!el || !bar) return;
    const update = () => el.style.setProperty("--wdb-bar-h", `${bar.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const scrollToDetail = useCallback(() => {
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToTop = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  }, []);

  return { detailOpen, scrollRef, detailRef, scrollToDetail, scrollToTop };
}
