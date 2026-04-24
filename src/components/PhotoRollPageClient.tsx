"use client";

import Image from "next/image";
import type { PhotoRollItem } from "@/lib/photo-roll";
import { blurDataURL } from "@/lib/blur";
import { Header } from "./Header";

export function PhotoRollPageClient({ photos }: { photos: PhotoRollItem[] }) {
  return (
    <>
      <Header
        active="Photo Roll"
        title={<>Photo Roll<span className="page-title-count">({photos.length})</span></>}
        showTitleRow={false}
        showCategoryRow={false}
      />
      <div className="photo-roll-layout">
        <div className="photo-roll-stream">
          {photos.map((photo, idx) => (
            <article key={photo.slug} className="photo-roll-entry">
              <time className="photo-roll-date">{photo.date} {photo.time?.slice(0, 5)}</time>
              <div className="photo-roll-image-wrap">
                <Image
                  src={photo.src}
                  alt={photo.title}
                  width={photo.width || 800}
                  height={photo.height || 600}
                  className="photo-roll-image"
                  /* モバイルはほぼフル幅、デスクトップは最大 600px */
                  sizes="(max-width: 900px) 100vw, 600px"
                  /* 最初の2枚は優先取得、それ以降は遅延読み込み */
                  priority={idx < 2}
                  loading={idx < 2 ? undefined : "lazy"}
                  placeholder="blur"
                  blurDataURL={blurDataURL(photo.width || 800, photo.height || 600)}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
