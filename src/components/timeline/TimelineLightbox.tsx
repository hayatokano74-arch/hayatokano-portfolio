"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { ImageItem } from "@/lib/timeline-utils";

/** 画像ライトボックス（Twitter風） */
export function TimelineLightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: ImageItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];
  const hasMultiple = images.length > 1;

  /* キーボード操作 */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultiple) onPrev();
      if (e.key === "ArrowRight" && hasMultiple) onNext();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasMultiple]);

  return (
    <div className="tl-lightbox" onClick={onClose} role="dialog" aria-label="画像を拡大表示">
      {/* 閉じるボタン */}
      <button type="button" className="tl-lightbox-close" onClick={onClose} aria-label="閉じる">
        ×
      </button>

      {/* 画像 */}
      <div className="tl-lightbox-img" onClick={(e) => e.stopPropagation()}>
        <Image
          src={img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          sizes="90vw"
          priority
          style={{ objectFit: "contain", maxWidth: "90vw", maxHeight: "90vh", width: "auto", height: "auto" }}
        />
      </div>

      {/* ナビゲーション矢印 */}
      {hasMultiple && (
        <>
          <button
            type="button"
            className="tl-lightbox-nav tl-lightbox-nav--prev"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="前の画像"
          >
            ‹
          </button>
          <button
            type="button"
            className="tl-lightbox-nav tl-lightbox-nav--next"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="次の画像"
          >
            ›
          </button>
        </>
      )}

      {/* カウンター */}
      {hasMultiple && (
        <div className="tl-lightbox-counter">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
