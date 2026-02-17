"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import DOMPurify from "dompurify";
import { works, type Work } from "@/lib/mock";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";
import { blurDataURL } from "@/lib/blur";

/** YouTube / Vimeo の URL を埋め込み用に変換。該当しなければ null */
function getEmbedUrl(src: string): string | null {
  /* YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID */
  const ytMatch = src.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;

  /* Vimeo: vimeo.com/ID */
  const vmMatch = src.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;

  return null;
}

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
      <div className="work-detail-top" style={{ marginBottom: "var(--space-7)" }}>
        <div style={{ gridColumn: "1 / span 4", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, minWidth: 0 }}>
          <Link
            href="/works"
            className="action-link action-link-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", lineHeight: 1 }}
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

      <div className="work-detail-stage-grid">
        {mode === "gallery" ? (
          <>
            {/* 左半分クリック: 前の画像 */}
            <button
              type="button"
              aria-label="previous image area"
              onClick={() => goToImage(prevImage)}
              className="work-detail-click-prev"
            />
            {/* 右半分クリック: 次の画像 */}
            <button
              type="button"
              aria-label="next image area"
              onClick={() => goToImage(nextImage)}
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
                  <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9" }}>
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
                  src={currentMedia.src}
                  alt={currentMedia.alt}
                  width={currentMedia.width}
                  height={currentMedia.height}
                  priority={img === 1}
                  sizes="(max-width: 900px) 100vw, 66vw"
                  placeholder="blur"
                  blurDataURL={blurDataURL(currentMedia.width, currentMedia.height)}
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "min(72vh, 820px)",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ aspectRatio: "16 / 9", width: "100%", border: "1px solid var(--line)" }} />
              )}
            </div>
          </>
        ) : (
          <div className="work-detail-index-stage">
            <IndexGrid work={work} current={img} onSelect={goToImage} />
          </div>
        )}
      </div>

      {/* ボトムバー: 12カラムグリッドで配置 */}
      <div className="work-detail-bottom" style={{ paddingTop: "var(--space-6)" }}>
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
              gap: "var(--space-2)",
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
      className="index-grid hide-scrollbar"
      style={{
        gap: "var(--space-6)",
        height: "100%",
        overflowY: "auto",
        paddingBottom: "var(--space-6)",
      }}
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
