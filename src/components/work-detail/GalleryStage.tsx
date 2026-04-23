"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Work } from "@/lib/types";
import { getEmbedUrl } from "@/lib/embed-url";

type MediaItem = Work["media"][number];

/** YouTube / Vimeo の動画IDからサムネイルURLを生成 */
function getVideoThumbnail(src: string): string | null {
  /* YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID */
  const ytMatch = src.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;

  /* Vimeo: サムネイルAPIが必要なためnull（poster属性で代替） */
  return null;
}

/**
 * ギャラリーステージ: 画像/動画の表示エリア
 * - 左半分クリック: 前の画像 / 右半分クリック: 次の画像
 * - key変化でReactが要素を再マウント → CSSアニメーションで自然にフェードイン
 * - YouTube/Vimeo 埋め込み対応
 * - 動画: サムネイル表示 → クリックで再生開始
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

  /* 動画: サムネイル→再生の状態管理。メディアが変わったらリセット */
  const [videoActive, setVideoActive] = useState(false);
  useEffect(() => { setVideoActive(false); }, [mediaKey]);

  return (
    <>
      {/* 左半分クリック: 前の画像（動画再生中は無効） */}
      {!videoActive && (
        <button
          type="button"
          aria-label="前の画像"
          onClick={onPrev}
          className="work-detail-click-prev"
        />
      )}
      {/* 右半分クリック: 次の画像（動画再生中は無効） */}
      {!videoActive && (
        <button
          type="button"
          aria-label="次の画像"
          onClick={onNext}
          className="work-detail-click-next"
        />
      )}
      <div
        className="work-detail-gallery-stage"
        style={{
          zIndex: currentMedia?.type === "video" ? 3 : 0,
        }}
      >
        {currentMedia?.type === "video" ? (() => {
          const embedUrl = getEmbedUrl(currentMedia.src);
          const thumbSrc = currentMedia.poster || getVideoThumbnail(currentMedia.src);

          /* 再生前: サムネイル + 再生ボタンオーバーレイ */
          if (!videoActive) {
            return (
              <button
                key={mediaKey}
                type="button"
                aria-label="動画を再生"
                className="gallery-video-thumb gallery-media-enter"
                onClick={() => setVideoActive(true)}
                style={{ aspectRatio: "16 / 9" }}
              >
                {thumbSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumbSrc}
                    alt={currentMedia.alt || ""}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0, background: "var(--media-bg)" }} />
                )}
                {/* 再生ボタン */}
                <span className="gallery-video-play-btn" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                </span>
              </button>
            );
          }

          /* 再生後: YouTube/Vimeo iframe または直接videoタグ */
          return embedUrl ? (
            <div key={`${mediaKey}-active`} className="gallery-media-enter" style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
              <iframe
                src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
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
              key={`${mediaKey}-active`}
              className="gallery-media-enter"
              src={currentMedia.src}
              poster={currentMedia.poster}
              controls
              autoPlay
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
