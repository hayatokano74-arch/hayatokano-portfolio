"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import type { Work } from "@/lib/types";
import { blurDataURL } from "@/lib/blur";
import { SIZES_INDEX_GRID } from "@/lib/image-sizes";

/** YouTube URL からサムネイル URL を生成 */
function youtubeThumbnail(src: string): string | undefined {
  const m = src.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : undefined;
}

/**
 * インデックスグリッド: サムネイル一覧
 * - スクロール中クラス付与（CSSでスクロールバー表示）
 * - 動画にはプレイアイコン表示
 */
export function IndexGrid({
  work,
  current,
  onSelect,
}: {
  work: Work;
  current: number;
  onSelect: (n: number) => void;
}) {
  const thumbs = useMemo(() => work.media, [work.media]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* スクロール中だけ is-scrolling クラスを付与（CSSでスクロールバー表示） */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      el.classList.add("is-scrolling");
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => el.classList.remove("is-scrolling"), 1000);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimer.current);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      className="index-grid hide-scrollbar"
      style={{
        gap: "var(--space-6)",
        width: "100%",
        maxHeight: "100%",
        overflowY: "auto",
      }}
    >
      {thumbs.map((image, idx) => {
        const n = idx + 1;
        /* 動画: poster → YouTubeサムネ → undefined の優先順位 */
        const thumbSrc = image.type === "video"
          ? (image.poster || youtubeThumbnail(image.src))
          : image.src;
        /* 動画でwidth/heightが未設定の場合は16:9にフォールバック */
        const w = image.width || (image.type === "video" ? 16 : 1);
        const h = image.height || (image.type === "video" ? 9 : 1);
        const isPortrait = h > w;
        return (
          <button
            type="button"
            key={image.id}
            onClick={() => onSelect(n)}
            style={{
              width: "100%",
              display: "inline-block",
              padding: 0,
              border: 0,
              background: "transparent",
              outline: "none",
              opacity: n === current ? 0.9 : 1,
              textAlign: "left",
            }}
            aria-label={`${n}枚目の画像`}
          >
            <div
              style={{
                position: "relative",
                width: isPortrait
                  ? `${Math.round((w / h) * 100)}%`
                  : "100%",
                margin: "0 auto",
                aspectRatio: `${w} / ${h}`,
                overflow: "hidden",
                background: "var(--media-bg)",
              }}
            >
              {thumbSrc ? (
                <Image
                  src={thumbSrc}
                  alt={image.alt}
                  fill
                  loading="lazy"
                  decoding="async"
                  sizes={SIZES_INDEX_GRID}
                  placeholder="blur"
                  blurDataURL={blurDataURL(w, h)}
                  style={{ objectFit: "cover", objectPosition: "center" }}
                />
              ) : null}
              {image.type === "video" ? (
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 8,
                    bottom: 8,
                    width: 16,
                    height: 16,
                    background: "rgba(0,0,0,0.65)",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 9,
                    lineHeight: 1,
                  }}
                >
                  ▶
                </div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
