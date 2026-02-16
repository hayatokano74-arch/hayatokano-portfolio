"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";
import { works, type Work } from "@/lib/mock";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";
import { blurDataURL } from "@/lib/blur";

export function WorkDetailClient({ work }: { work: Work }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [detailOpen, setDetailOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  /* URLパラメータから初期値を読み取り、以降はローカルステートで管理 */
  const [localMode, setLocalMode] = useState<"gallery" | "index">(
    () => (sp.get("mode") === "index" ? "index" : "gallery"),
  );
  const [localImg, setLocalImg] = useState(
    () => Math.max(1, Math.min(work.media.length, Number(sp.get("img") ?? "1") || 1)),
  );

  const mode = localMode;
  const img = localImg;
  const currentWorkIndex = Math.max(
    0,
    works.findIndex((w) => w.slug === work.slug),
  );
  const prevWork = works[(currentWorkIndex - 1 + works.length) % works.length];
  const nextWork = works[(currentWorkIndex + 1) % works.length];
  const total = work.media.length;
  const prevImage = img <= 1 ? total : img - 1;
  const nextImage = img >= total ? 1 : img + 1;
  const currentMedia = work.media[img - 1];
  const galleryStageWidth = "min(100%, clamp(680px, 64vw, 1120px))";
  const galleryStageHeight = "min(100%, clamp(280px, 56dvh, 820px))";

  const goToImage = useCallback(
    (nextImg: number) => {
      setLocalImg(nextImg);
      setLocalMode("gallery");
      window.history.replaceState(null, "", `${pathname}?mode=gallery&img=${nextImg}`);
    },
    [pathname],
  );

  /* ブラウザバック/フォワード対応 */
  useEffect(() => {
    const onPopState = () => {
      const url = new URL(window.location.href);
      setLocalMode(url.searchParams.get("mode") === "index" ? "index" : "gallery");
      setLocalImg(
        Math.max(1, Math.min(work.media.length, Number(url.searchParams.get("img") ?? "1") || 1)),
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [work.media.length]);

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

  useEffect(() => {
    if (mode !== "gallery") return;

    const preloadTargets = [prevImage, nextImage]
      .map((index) => work.media[index - 1])
      .filter(Boolean);

    preloadTargets.forEach((media) => {
      if (media.type === "image") {
        const img = new window.Image();
        img.decoding = "async";
        img.src = media.src;
        return;
      }

      if (media.poster) {
        const poster = new window.Image();
        poster.decoding = "async";
        poster.src = media.poster;
      }
    });
  }, [mode, prevImage, nextImage, work.media]);

  /* スワイプによる画像ナビゲーション（モバイル対応） */
  useEffect(() => {
    if (mode !== "gallery") return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      const threshold = 50;
      if (dx > threshold) goToImage(prevImage);      // 右スワイプ → 前の画像
      else if (dx < -threshold) goToImage(nextImage); // 左スワイプ → 次の画像
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [mode, prevImage, nextImage, goToImage]);

  return (
    <div
      className="work-detail-shell"
      style={{
        height: "100%",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
      }}
    >
      {/* トップバー: 12カラムグリッドで配置 */}
      <div className="work-detail-top" style={{ marginBottom: "var(--space-7)", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", columnGap: "var(--grid-gutter)", alignItems: "center" }}>
        <div style={{ gridColumn: "1 / span 4", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, minWidth: 0 }}>
          <Link
            href="/works"
            className="action-link action-link-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, lineHeight: 1 }}
          >
            <span
              aria-hidden="true"
              style={{ width: 14, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
                <path d="M9 2.5L3 9L9 15.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span style={{ display: "block" }}>Back</span>
          </Link>
        </div>

        <div style={{ gridColumn: "5 / -1", justifySelf: "end", display: "flex", alignItems: "center", gap: "var(--space-7)", fontSize: "var(--space-7)", lineHeight: 1, minWidth: 0 }}>
          <Link
            href={`/works/${prevWork.slug}?mode=gallery&img=1`}
            prefetch={true}
            aria-label="previous work"
            className="action-link action-link-muted"
          >
            ‹
          </Link>
          <Link
            href={`/works/${nextWork.slug}?mode=gallery&img=1`}
            prefetch={true}
            aria-label="next work"
            className="action-link action-link-muted"
          >
            ›
          </Link>
        </div>
      </div>

      <div style={{ position: "relative", minHeight: 0, overflow: "hidden" }}>
        {mode === "gallery" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <button
              type="button"
              aria-label="previous image area"
              onClick={() => goToImage(prevImage)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "50%",
                height: "100%",
                cursor: "w-resize",
                background: "transparent",
                border: 0,
                padding: 0,
                zIndex: 1,
              }}
            />
            <button
              type="button"
              aria-label="next image area"
              onClick={() => goToImage(nextImage)}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: "50%",
                height: "100%",
                cursor: "e-resize",
                background: "transparent",
                border: 0,
                padding: 0,
                zIndex: 1,
              }}
            />
            <div
              style={{
                width: galleryStageWidth,
                maxHeight: galleryStageHeight,
                height: "100%",
                position: "relative",
                display: "grid",
                placeItems: "center",
                zIndex: currentMedia?.type === "video" ? 3 : 0,
              }}
            >
              {currentMedia?.type === "video" ? (
                <video
                  src={currentMedia.src}
                  poster={currentMedia.poster}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "100%",
                    display: "block",
                  }}
                />
              ) : currentMedia?.src ? (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <Image
                    src={currentMedia.src}
                    alt={currentMedia.alt}
                    fill
                    priority={img === 1}
                    sizes="(max-width: 900px) 100vw, min(64vw, 1120px)"
                    placeholder="blur"
                    blurDataURL={blurDataURL(currentMedia.width, currentMedia.height)}
                    style={{
                      objectFit: "contain",
                      objectPosition: "center",
                    }}
                  />
                </div>
              ) : (
                <div style={{ width: "100%", height: "100%", border: "1px solid var(--line)" }} />
              )}
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", overflow: "hidden" }}>
            <IndexGrid work={work} current={img} onSelect={goToImage} />
          </div>
        )}
      </div>

      {/* ボトムバー: 12カラムグリッドで配置 */}
      <div className="work-detail-bottom" style={{ paddingTop: "var(--space-6)", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", columnGap: "var(--grid-gutter)", alignItems: "end" }}>
        <div style={{ gridColumn: "1 / span 11", display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start", minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
          {work.title} | {work.year}
        </div>
        <div className="work-detail-controls" style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", minHeight: "var(--space-6)", fontSize: "var(--font-body)", lineHeight: 1.1, fontWeight: 700, width: "100%" }}>
          <button
            type="button"
            className={`${mode === "gallery" ? "underline-active" : ""} action-link`.trim()}
            style={{ color: mode === "gallery" ? "var(--fg)" : "var(--muted)", transition: "color 140ms linear", display: "inline-flex", alignItems: "center", lineHeight: 1.1 }}
            onClick={() => {
              setLocalMode("gallery");
              window.history.replaceState(null, "", `${pathname}?mode=gallery&img=${img}`);
            }}
          >
            gallery
          </button>
          <button
            type="button"
            className={`${mode === "index" ? "underline-active" : ""} action-link`.trim()}
            style={{ color: mode === "index" ? "var(--fg)" : "var(--muted)", transition: "color 140ms linear", display: "inline-flex", alignItems: "center", lineHeight: 1.1 }}
            onClick={() => {
              setLocalMode("index");
              window.history.replaceState(null, "", `${pathname}?mode=index`);
            }}
          >
            index
          </button>
          <button
            type="button"
            className="action-link"
            style={{
              fontSize: "var(--font-body)",
              lineHeight: 1.1,
              fontWeight: 700,
              textAlign: "left",
              padding: 0,
              border: 0,
              background: "transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            onClick={() => setDetailOpen(true)}
          >
            <span>詳細</span>
            <span aria-hidden="true" style={{ fontSize: "0.95em", transform: "translateY(-0.5px)" }}>
              ↗
            </span>
          </button>
          {/* カウンター: 詳細と同じ行の右端 */}
          <span className="work-detail-counter" style={{ marginLeft: "auto", fontSize: "var(--font-body)", fontWeight: 700 }}>
            {mode === "gallery" ? `${img} / ${work.media.length}` : null}
          </span>
        </div>
        </div>
      </div>

      {detailOpen ? (
        <div className="work-detail-overlay">
          {/* Closeボタン + コンテンツ: 同一グリッド */}
          <div className="work-detail-overlay-grid">
            <div className="work-detail-overlay-close">
              <button
                type="button"
                className="action-link"
                onClick={() => setDetailOpen(false)}
                style={{ fontSize: "var(--font-body)" }}
              >
                Close
              </button>
            </div>

            <div className="work-detail-overlay-content">
              <WorkDetailsTable details={work.details} />
              {work.details.bio ? (
                <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)" }}>
                  <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>BIO</div>
                  <div style={{ marginTop: "var(--space-3)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", color: "var(--fg)" }}>{work.details.bio}</div>
                </div>
              ) : null}
              <div
                className="work-excerpt-html"
                style={{ marginTop: "var(--space-6)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)" }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(work.excerpt.replace(/\r\n/g, "\n").replace(/\n/g, "<br>")) }}
              />
              <div style={{ marginTop: "var(--space-5)", color: "var(--muted)", fontSize: "var(--font-body)" }}>
                {work.tags.map((tag, idx) => (
                  <span key={`${work.slug}-${tag}-${idx}`} className="underline-active" style={{ marginRight: "var(--space-3)" }}>
                    {tag.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IndexGrid({ work, current, onSelect }: { work: Work; current: number; onSelect: (n: number) => void }) {
  const thumbs = useMemo(() => work.media, [work.media]);

  return (
    <div
      style={{
        width: "min(100%, 1240px)",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
        gap: "var(--space-6)",
        height: "100%",
        overflowY: "auto",
        paddingBottom: "var(--space-6)",
        alignContent: "start",
      }}
      className="hide-scrollbar"
    >
      {thumbs.map((image, idx) => {
        const n = idx + 1;
        const isPortrait = image.height > image.width;
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
            aria-label={`image ${n}`}
          >
            <div
              style={{
                position: "relative",
                width: isPortrait
                  ? `${Math.round((image.width / image.height) * 100)}%`
                  : "100%",
                margin: "0 auto",
                aspectRatio: `${image.width} / ${image.height}`,
                overflow: "hidden",
              }}
            >
              {(image.type === "video" ? image.poster : image.src) ? (
                <Image
                  src={image.type === "video" ? (image.poster as string) : image.src}
                  alt={image.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 320px"
                  placeholder="blur"
                  blurDataURL={blurDataURL(image.width, image.height)}
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
