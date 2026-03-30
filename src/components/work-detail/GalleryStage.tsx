"use client";

import Image from "next/image";
import type { Work } from "@/lib/types";
import { getEmbedUrl } from "@/lib/embed-url";

type MediaItem = Work["media"][number];

/**
 * ギャラリーステージ: 画像/動画の表示エリア
 * - 左半分クリック: 前の画像 / 右半分クリック: 次の画像
 * - key変化でReactが要素を再マウント → CSSアニメーションで自然にフェードイン
 * - YouTube/Vimeo 埋め込み対応
 */
export function GalleryStage({
  currentMedia,
  imgIndex,
  onPrev,
  onNext,
}: {
  currentMedia: MediaItem | undefined;
  imgIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  /* key にsrcを使うことで画像変化時にReactが要素を再マウントし、CSSアニメーションが発火する */
  const mediaKey = currentMedia?.src ?? `empty-${imgIndex}`;

  return (
    <>
      {/* 左半分クリック: 前の画像 */}
      <button
        type="button"
        aria-label="前の画像"
        onClick={onPrev}
        className="work-detail-click-prev"
      />
      {/* 右半分クリック: 次の画像 */}
      <button
        type="button"
        aria-label="次の画像"
        onClick={onNext}
        className="work-detail-click-next"
      />
      <div
        className="work-detail-gallery-stage"
        style={{
          zIndex: currentMedia?.type === "video" ? 3 : 0,
        }}
      >
        {currentMedia?.type === "video" ? (() => {
          const embedUrl = getEmbedUrl(currentMedia.src);
          return embedUrl ? (
            <div key={mediaKey} className="gallery-media-enter" style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
              <iframe
                src={embedUrl}
                title={currentMedia.alt || "video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          ) : (
            <video
              key={mediaKey}
              className="gallery-media-enter"
              src={currentMedia.src}
              poster={currentMedia.poster}
              controls
              playsInline
              preload="metadata"
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                display: "block",
              }}
            />
          );
        })() : currentMedia?.src ? (
          <Image
            key={mediaKey}
            className="gallery-media-enter"
            src={currentMedia.src}
            alt={currentMedia.alt}
            width={currentMedia.width}
            height={currentMedia.height}
            priority={imgIndex === 1}
            sizes="(max-width: 900px) 100vw, 66vw"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "min(72vh, 820px)",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <div
            key={mediaKey}
            style={{ aspectRatio: "16 / 9", width: "100%", border: "1px solid var(--line)" }}
          />
        )}
      </div>
    </>
  );
}
