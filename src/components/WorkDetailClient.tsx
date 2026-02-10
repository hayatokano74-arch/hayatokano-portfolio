"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { works, type Work } from "@/lib/mock";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";
import { blurDataURL } from "@/lib/blur";

function setQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  params: URLSearchParams,
) {
  const qs = params.toString();
  router.push(qs ? `${pathname}?${qs}` : pathname);
}

export function WorkDetailClient({ work }: { work: Work }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [detailOpen, setDetailOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const mode = sp.get("mode") === "index" ? "index" : "gallery";
  const img = Math.max(1, Math.min(work.media.length, Number(sp.get("img") ?? "1") || 1));
  const currentWorkIndex = Math.max(
    0,
    works.findIndex((w) => w.slug === work.slug),
  );
  const prevWork = works[(currentWorkIndex - 1 + works.length) % works.length];
  const nextWork = works[(currentWorkIndex + 1) % works.length];
  const prevImage = Math.max(1, img - 1);
  const nextImage = Math.min(work.media.length, img + 1);
  const currentMedia = work.media[img - 1];
  const galleryStageWidth = "min(100%, clamp(680px, 64vw, 1120px))";
  const galleryStageHeight = "min(100%, clamp(420px, 68vh, 820px))";

  const goToImage = useCallback(
    (nextImg: number) => {
      const p = new URLSearchParams(sp.toString());
      p.set("mode", "gallery");
      p.set("img", String(nextImg));
      setQuery(router, pathname, p);
    },
    [router, pathname, sp],
  );

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
        height: "calc(100vh - 76px)",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
      }}
    >
      <div className="work-detail-top flex items-start justify-between" style={{ marginBottom: "var(--space-7)" }}>
        <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
          <Link
            href="/works"
            className="action-link action-link-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, lineHeight: 1 }}
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

        <div className="flex items-center" style={{ gap: "var(--space-7)", fontSize: "var(--space-7)", lineHeight: 1 }}>
          <Link
            href={`/works/${prevWork.slug}?mode=gallery&img=1`}
            aria-label="previous work"
            className="action-link action-link-muted"
          >
            ‹
          </Link>
          <Link
            href={`/works/${nextWork.slug}?mode=gallery&img=1`}
            aria-label="next work"
            className="action-link action-link-muted"
          >
            ›
          </Link>
        </div>
      </div>

      <div style={{ position: "relative", minHeight: 0 }}>
        {mode === "gallery" ? (
          <div style={{ position: "relative", height: "100%" }}>
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
                height: galleryStageHeight,
                margin: "0 auto",
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
                    priority
                    sizes="(max-width: 1200px) 100vw, 1040px"
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
            <IndexGrid work={work} current={img} />
          </div>
        )}
      </div>

      <div className="work-detail-bottom flex items-end justify-between" style={{ paddingTop: "var(--space-6)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "flex-start" }}>
        <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
          {work.title} | {work.year}
        </div>
        <div className="flex items-center" style={{ gap: "var(--space-5)", alignItems: "center", minHeight: "var(--space-6)", fontSize: "var(--font-body)", lineHeight: 1.1, fontWeight: 700 }}>
          <button
            type="button"
            className={`${mode === "gallery" ? "underline-active" : ""} action-link`.trim()}
            style={{ color: mode === "gallery" ? "var(--fg)" : "var(--muted)", transition: "color 140ms linear", display: "inline-flex", alignItems: "center", lineHeight: 1.1 }}
            onClick={() => {
              const p = new URLSearchParams(sp.toString());
              p.set("mode", "gallery");
              setQuery(router, pathname, p);
            }}
          >
            gallery
          </button>
          <button
            type="button"
            className={`${mode === "index" ? "underline-active" : ""} action-link`.trim()}
            style={{ color: mode === "index" ? "var(--fg)" : "var(--muted)", transition: "color 140ms linear", display: "inline-flex", alignItems: "center", lineHeight: 1.1 }}
            onClick={() => {
              const p = new URLSearchParams(sp.toString());
              p.set("mode", "index");
              setQuery(router, pathname, p);
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
              gap: 4,
            }}
            onClick={() => setDetailOpen(true)}
          >
            <span>詳細</span>
            <span aria-hidden="true" style={{ fontSize: "0.95em", transform: "translateY(-0.5px)" }}>
              ↗
            </span>
          </button>
        </div>
        </div>

        <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
          {mode === "gallery" ? `${img} / ${work.media.length}` : null}
        </div>
      </div>

      {detailOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--bg)",
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            className="action-link"
            onClick={() => setDetailOpen(false)}
            style={{ position: "absolute", right: "var(--space-7)", top: "var(--space-5)", fontSize: "var(--font-body)" }}
          >
            Close
          </button>

          <div style={{ height: "100%", display: "grid", placeItems: "center", paddingInline: "var(--space-5)", overflowY: "auto" }}>
            <div style={{ width: "min(100%, 760px)", margin: "0 auto" }}>
              <WorkDetailsTable details={work.details} />
              {work.details.bio ? (
                <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)" }}>
                  <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>BIO</div>
                  <div style={{ marginTop: "var(--space-3)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", color: "var(--fg)", maxWidth: 640 }}>{work.details.bio}</div>
                </div>
              ) : null}
              <div style={{ marginTop: "var(--space-6)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", maxWidth: 640 }}>{work.excerpt}</div>
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

function IndexGrid({ work, current }: { work: Work; current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
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
            onClick={() => {
              const p = new URLSearchParams(sp.toString());
              p.set("mode", "gallery");
              p.set("img", String(n));
              setQuery(router, pathname, p);
            }}
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
                  sizes="(max-width: 720px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
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
                    width: 18,
                    height: 14,
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
