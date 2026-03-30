"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Work } from "@/lib/types";

type MediaItem = Work["media"][number];

/**
 * ギャラリーナビゲーション Hook
 * - 画像切替（key再マウント + CSSアニメーションでフェードイン）
 * - 隣接画像のプリロード
 * - キーボードナビ（← →）
 * - ブラウザバック/フォワード対応
 */
export function useGalleryNav({
  pathname,
  media,
  initialMode,
  initialImg,
}: {
  pathname: string;
  media: MediaItem[];
  initialMode: "gallery" | "index";
  initialImg: number;
}) {
  const total = media.length;

  /* URLパラメータから初期値を読み取り、以降はローカルステートで管理 */
  const [mode, setMode] = useState<"gallery" | "index">(initialMode);
  const [img, setImg] = useState(initialImg);

  const prevImage = img <= 1 ? total : img - 1;
  const nextImage = img >= total ? 1 : img + 1;
  const currentMedia = media[img - 1];

  const goToImage = useCallback(
    (nextImg: number) => {
      if (nextImg === img) return;
      setImg(nextImg);
      setMode("gallery");
      window.history.replaceState(null, "", `${pathname}?mode=gallery&img=${nextImg}`);
    },
    [pathname, img],
  );

  /* ブラウザバック/フォワード対応 */
  useEffect(() => {
    const onPopState = () => {
      const url = new URL(window.location.href);
      setMode(url.searchParams.get("mode") === "index" ? "index" : "gallery");
      setImg(
        Math.max(1, Math.min(total, Number(url.searchParams.get("img") ?? "1") || 1)),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [total]);

  /* キーボードナビ（← →） */
  useEffect(() => {
    if (mode !== "gallery") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToImage(prevImage);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToImage(nextImage);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, prevImage, nextImage, goToImage]);

  /* 隣接画像のプリロード */
  useEffect(() => {
    if (mode !== "gallery") return;

    const preloadTargets = [prevImage, nextImage]
      .map((index) => media[index - 1])
      .filter(Boolean);

    preloadTargets.forEach((m) => {
      if (m.type === "image") {
        const i = new window.Image();
        i.decoding = "async";
        i.src = m.src;
        return;
      }

      if (m.poster) {
        const poster = new window.Image();
        poster.decoding = "async";
        poster.src = m.poster;
      }
    });
  }, [mode, prevImage, nextImage, media]);

  /* 作品切替時に即座にリセット（アニメーションなし） */
  const resetTo = useCallback((newImg: number, newMode: "gallery" | "index") => {
    setImg(newImg);
    setMode(newMode);
  }, []);

  return {
    mode,
    setMode,
    img,
    setImg,
    prevImage,
    nextImage,
    currentMedia,
    goToImage,
    resetTo,
    total,
  };
}
