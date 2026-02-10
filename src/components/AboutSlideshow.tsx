"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { blurDataURL } from "@/lib/blur";

type Photo = { src: string; width: number; height: number };

export function AboutSlideshow({ photos }: { photos: Photo[] }) {
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  const goTo = useCallback((i: number) => {
    setFade(false);
    setTimeout(() => {
      setCurrent(i);
      setFade(true);
    }, 300);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % photos.length);
  }, [current, photos.length, goTo]);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  const photo = photos[current];

  return (
    <div
      className="about-slideshow"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* 画像: 自然なサイズで表示、高さのみ制限 */}
      <Image
        key={photo.src}
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        sizes="(max-width: 900px) 100vw, 920px"
        priority={current === 0}
        placeholder="blur"
        blurDataURL={blurDataURL(photo.width, photo.height)}
        style={{
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "calc(100% - 24px)",
          objectFit: "contain",
          display: "block",
          opacity: fade ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      />

      {/* インジケータ */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: "var(--space-2)",
          flexShrink: 0,
        }}
      >
        {photos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`写真 ${i + 1}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              border: 0,
              padding: 0,
              background: i === current ? "var(--fg)" : "var(--muted)",
              opacity: i === current ? 1 : 0.4,
              cursor: "pointer",
              transition: "opacity 200ms",
            }}
          />
        ))}
      </div>
    </div>
  );
}
