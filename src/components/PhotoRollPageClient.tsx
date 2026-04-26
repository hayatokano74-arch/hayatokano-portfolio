"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { PhotoRollItem } from "@/lib/photo-roll";
import { blurDataURL } from "@/lib/blur";
import { Header } from "./Header";
import { GardenPagination } from "./GardenPagination";

const PER_PAGE = 20;

export function PhotoRollPageClient({ photos }: { photos: PhotoRollItem[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(photos.length / PER_PAGE);

  const start = (currentPage - 1) * PER_PAGE;
  const pagePhotos = photos.slice(start, start + PER_PAGE);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
          {pagePhotos.map((photo, idx) => (
            <article key={photo.slug} className="photo-roll-entry">
              <time className="photo-roll-date">{photo.date} {photo.time?.slice(0, 5)}</time>
              <div className="photo-roll-image-wrap">
                <Image
                  src={photo.src}
                  alt={photo.title}
                  width={photo.width || 800}
                  height={photo.height || 600}
                  className="photo-roll-image"
                  sizes="(max-width: 900px) 100vw, 600px"
                  priority={idx < 2}
                  loading={idx < 2 ? undefined : "lazy"}
                  placeholder="blur"
                  blurDataURL={blurDataURL(photo.width || 800, photo.height || 600)}
                />
              </div>
            </article>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="photo-roll-pagination-wrap">
            <GardenPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageLabels={[]}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </>
  );
}
