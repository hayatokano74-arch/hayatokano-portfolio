"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { blurDataURL } from "@/lib/blur";
import type { ImageItem } from "@/lib/timeline-utils";
import { TimelineLightbox } from "./TimelineLightbox";

/** Twitter風 複数画像グリッド */
export function TimelineImageGrid({ images }: { images: ImageItem[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((idx: number) => setLightboxIndex(idx), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);
  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  if (!images || images.length === 0) return null;

  const count = images.length;
  const maxShow = 4;
  const visible = images.slice(0, maxShow);
  const extra = count - maxShow;

  /* クリック可能な画像セル */
  function Cell({ img, idx, className }: { img: ImageItem; idx: number; className?: string }) {
    return (
      <button
        type="button"
        className={`tl-photo-cell ${className ?? ""}`.trim()}
        onClick={() => openLightbox(idx)}
        aria-label={`画像${idx + 1}を拡大`}
      >
        <Image src={img.src} alt={img.alt} fill loading="lazy"
          sizes="(max-width: 900px) 90vw, 500px"
          placeholder="blur" blurDataURL={blurDataURL(img.width, img.height)}
          style={{ objectFit: "cover" }} />
      </button>
    );
  }

  const grid = (() => {
    if (count === 1) {
      return (
        <div className="tl-photo-grid tl-photo-grid--1">
          <Cell img={visible[0]} idx={0} />
        </div>
      );
    }
    if (count === 2) {
      return (
        <div className="tl-photo-grid tl-photo-grid--2">
          {visible.map((img, i) => <Cell key={i} img={img} idx={i} />)}
        </div>
      );
    }
    if (count === 3) {
      return (
        <div className="tl-photo-grid tl-photo-grid--3">
          <Cell img={visible[0]} idx={0} className="tl-photo-cell--main" />
          <div className="tl-photo-side">
            {visible.slice(1).map((img, i) => <Cell key={i} img={img} idx={i + 1} />)}
          </div>
        </div>
      );
    }
    return (
      <div className="tl-photo-grid tl-photo-grid--4">
        {visible.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            <Cell img={img} idx={i} />
            {i === 3 && extra > 0 && (
              <span className="tl-photo-extra">+{extra}</span>
            )}
          </div>
        ))}
      </div>
    );
  })();

  return (
    <>
      {grid}
      {lightboxIndex !== null && (
        <TimelineLightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  );
}
