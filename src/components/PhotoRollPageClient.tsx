"use client";

import Image from "next/image";
import type { PhotoRollItem } from "@/lib/photo-roll";
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
          {photos.map((photo) => (
            <article key={photo.slug} className="photo-roll-entry">
              <time className="photo-roll-date">{photo.date} {photo.time?.slice(0, 5)}</time>
              <div className="photo-roll-image-wrap">
                <Image
                  src={photo.src}
                  alt={photo.title}
                  width={photo.width || 800}
                  height={photo.height || 600}
                  className="photo-roll-image"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
