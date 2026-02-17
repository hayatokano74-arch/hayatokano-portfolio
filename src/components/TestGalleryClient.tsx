"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { blurDataURL } from "@/lib/blur";
import type { Work } from "@/lib/mock";

type MediaItem = Work["media"][number];

export function TestGalleryClient({
  title,
  category,
  media,
}: {
  title: string;
  category: string;
  media: MediaItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const thumbListRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isScrolling = useRef(false);

  const currentMedia = media[activeIndex];

  /* サムネイルクリックで写真切替 + スクロール */
  const selectImage = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const btn = thumbRefs.current[index];
      if (btn) {
        isScrolling.current = true;
        btn.scrollIntoView({ behavior: "smooth", block: "center" });
        /* smooth scroll 完了後にフラグ解除 */
        setTimeout(() => {
          isScrolling.current = false;
        }, 400);
      }
    },
    [],
  );

  /* キーボード操作 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev <= 0 ? media.length - 1 : prev - 1;
          selectImage(next);
          return next;
        });
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev >= media.length - 1 ? 0 : prev + 1;
          selectImage(next);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [media.length, selectImage]);

  /* サムネイルストリップのスクロールで中央の写真を切替（Intersection Observer） */
  useEffect(() => {
    const list = thumbListRef.current;
    if (!list) return;

    const observer = new IntersectionObserver(
      (entries) => {
        /* プログラムスクロール中は無視 */
        if (isScrolling.current) return;
        /* 最も表示面積の大きいサムネイルをアクティブにする */
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry) {
          const idx = Number((bestEntry.target as HTMLElement).dataset.index);
          if (!isNaN(idx)) {
            setActiveIndex(idx);
          }
        }
      },
      {
        root: list,
        threshold: [0.5, 0.75, 1.0],
      },
    );

    thumbRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [media.length]);

  return (
    <div className="test-gallery-shell">
      {/* 左: カテゴリ情報 */}
      <div className="test-gallery-info">
        <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>
          CATEGORY
        </div>
        <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", fontWeight: 700 }}>
          {category}
        </div>
        <div style={{ marginTop: "var(--space-5)", fontSize: "var(--font-body)", fontWeight: 700 }}>
          {title}
        </div>
        <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-meta)", color: "var(--muted)" }}>
          {activeIndex + 1} / {media.length}
        </div>
      </div>

      {/* 中央: メイン写真（黒ボーダー枠内） */}
      <div className="test-gallery-main">
        <div className="test-gallery-stage">
          {currentMedia?.type === "video" ? (
            <video
              src={currentMedia.src}
              poster={currentMedia.poster}
              controls
              playsInline
              preload="metadata"
              style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
            />
          ) : currentMedia?.src ? (
            <Image
              src={currentMedia.src}
              alt={currentMedia.alt}
              fill
              priority={activeIndex === 0}
              sizes="(max-width: 900px) 100vw, 60vw"
              placeholder="blur"
              blurDataURL={blurDataURL(currentMedia.width, currentMedia.height)}
              style={{ objectFit: "contain", objectPosition: "center" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "var(--media-bg)" }} />
          )}
        </div>
      </div>

      {/* 右: サムネイルストリップ（縦スクロール） */}
      <div className="test-gallery-thumbs hide-scrollbar" ref={thumbListRef}>
        {media.map((item, idx) => (
          <button
            key={item.id}
            ref={(el) => { thumbRefs.current[idx] = el; }}
            type="button"
            data-index={idx}
            className={`test-gallery-thumb-btn ${idx === activeIndex ? "is-active" : ""}`}
            onClick={() => selectImage(idx)}
            aria-label={`写真 ${idx + 1}`}
          >
            <Image
              src={item.type === "video" ? (item.poster ?? "") : item.src}
              alt={item.alt}
              width={120}
              height={80}
              loading={idx < 6 ? "eager" : "lazy"}
              style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
