"use client";

import { useEffect, useState } from "react";
import { fetchPhotoRoll, type PhotoRollItem } from "@/lib/cms/photo-roll-client";
import { Header } from "./Header";

export function PhotoRollPageClient() {
  const [photos, setPhotos] = useState<PhotoRollItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotoRoll()
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Header
        active="Photo Roll"
        title="Photo Roll"
        showTitleRow={false}
        showCategoryRow={false}
      />
    );
  }

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
                <img
                  src={photo.src}
                  alt={photo.title}
                  width={photo.width || undefined}
                  height={photo.height || undefined}
                  loading="lazy"
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
