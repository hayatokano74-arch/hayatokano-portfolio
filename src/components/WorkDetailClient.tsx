"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Work } from "@/lib/types";
import { useGalleryNav } from "@/hooks/useGalleryNav";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useDetailOverlay } from "@/hooks/useDetailOverlay";
import { GalleryStage } from "@/components/work-detail/GalleryStage";
import { IndexGrid } from "@/components/work-detail/IndexGrid";
import { InfoOverlay } from "@/components/work-detail/InfoOverlay";
import { BottomBar } from "@/components/work-detail/BottomBar";

export function WorkDetailClient({
  work: initialWork,
  allWorks,
  initialSlug,
}: {
  work: Work;
  allWorks: Work[];
  initialSlug: string;
}) {
  /* 現在表示中の作品（クライアント側で切替） */
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const work = allWorks.find((w) => w.slug === currentSlug) ?? initialWork;

  const stageRef = useRef<HTMLDivElement>(null);
  const pathname = `/works/${work.slug}`;

  /* 前後の作品を計算 */
  const currentWorkIndex = Math.max(
    0,
    allWorks.findIndex((w) => w.slug === work.slug),
  );
  const prevWork = allWorks[(currentWorkIndex - 1 + allWorks.length) % allWorks.length];
  const nextWork = allWorks[(currentWorkIndex + 1) % allWorks.length];

  /* ギャラリーナビゲーション */
  const {
    mode, setMode,
    img, setImg,
    prevImage, nextImage,
    currentMedia,
    goToImage,
    resetTo,
  } = useGalleryNav({
    pathname,
    media: work.media,
    initialMode: "gallery",
    initialImg: 1,
  });

  /* Infoオーバーレイ */
  const { detailOpen, setDetailOpen, overlayRef } = useDetailOverlay();

  /* スワイプジェスチャー（モバイル対応） */
  const onSwipeLeft = useCallback(() => goToImage(nextImage), [goToImage, nextImage]);
  const onSwipeRight = useCallback(() => goToImage(prevImage), [goToImage, prevImage]);
  useSwipeGesture({
    targetRef: stageRef,
    enabled: mode === "gallery",
    onSwipeLeft,
    onSwipeRight,
  });

  /* ブラウザバック/フォワードでslugを復元 */
  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/works\/([^/]+)/);
      if (match) {
        const slug = match[1];
        setCurrentSlug(slug);
        resetTo(1, "gallery");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [resetTo]);

  /* 作品間ナビゲーション（ページ遷移なし、クライアント側で切替） */
  const navigateToWork = useCallback((slug: string) => {
    setCurrentSlug(slug);
    resetTo(1, "gallery");
    setDetailOpen(false);
    /* URLだけ更新（ページ遷移なし、クリーンURL） */
    window.history.pushState(null, "", `/works/${slug}/`);
  }, [resetTo, setDetailOpen]);

  return (
    <div
      className="work-detail-shell"
      style={{
        height: "100%",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
      }}
    >
      {/* トップバー: 枠線区切りの横並び */}
      <div className="work-detail-top-bar">
        <Link href="/works" className="wdb-cell wdb-btn wdb-back">
          <span aria-hidden="true" className="wdb-back-icon">
            <svg width="10" height="14" viewBox="0 0 12 18" fill="none">
              <path d="M9 2.5L3 9L9 15.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Back
        </Link>
        <span className="wdb-cell wdb-spacer" />
        <button
          type="button"
          aria-label={`前の作品: ${prevWork.title}`}
          className="wdb-cell wdb-btn wdb-nav-arrow"
          onClick={() => navigateToWork(prevWork.slug)}
        >
          ‹
          <span className="wdb-nav-tooltip">{prevWork.title}</span>
        </button>
        <button
          type="button"
          aria-label={`次の作品: ${nextWork.title}`}
          className="wdb-cell wdb-btn wdb-nav-arrow"
          onClick={() => navigateToWork(nextWork.slug)}
        >
          ›
          <span className="wdb-nav-tooltip">{nextWork.title}</span>
        </button>
      </div>

      <div ref={stageRef} className="work-detail-stage-grid">
        {mode === "gallery" ? (
          <GalleryStage
            currentMedia={currentMedia}
            imgIndex={img}
            onPrev={() => goToImage(prevImage)}
            onNext={() => goToImage(nextImage)}
          />
        ) : (
          <div className="work-detail-index-stage">
            <IndexGrid work={work} current={img} onSelect={goToImage} />
          </div>
        )}
      </div>

      {/* Infoオーバーレイ（コンテンツのみスライド、バーは含まない） */}
      <InfoOverlay work={work} detailOpen={detailOpen} overlayRef={overlayRef} />

      {/* ボトムバー: 常時固定表示（オーバーレイの上に配置） */}
      <BottomBar
        work={work}
        mode={mode}
        img={img}
        detailOpen={detailOpen}
        pathname={pathname}
        onGallery={() => {
          setDetailOpen(false);
          setMode("gallery");
          /* URLはクリーンに保つ（状態はステートで管理） */
        }}
        onIndex={() => {
          setDetailOpen(false);
          setMode("index");
          /* URLはクリーンに保つ */
        }}
        onToggleInfo={() => setDetailOpen(!detailOpen)}
      />
    </div>
  );
}
