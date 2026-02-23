"use client";

interface GardenPaginationProps {
  currentPage: number;
  totalPages: number;
  /** 各ページの期間ラベル（例: "2025年7月 — 9月"） */
  pageLabels: string[];
  onPageChange: (page: number) => void;
}

/** 表示するページ番号を計算（省略記号付き） */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

export function GardenPagination({
  currentPage,
  totalPages,
  pageLabels,
  onPageChange,
}: GardenPaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);
  const rangeLabel = pageLabels[currentPage - 1] ?? "";

  return (
    <nav className="garden-pagination" aria-label="ページナビゲーション">
      <div className="garden-pagination-controls">
        {currentPage > 1 && (
          <button
            className="garden-pagination-arrow"
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="前のページ"
          >
            ←
          </button>
        )}

        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="garden-pagination-ellipsis">
              …
            </span>
          ) : (
            <button
              key={page}
              className={`garden-pagination-number ${page === currentPage ? "garden-pagination-number--active" : ""}`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}

        {currentPage < totalPages && (
          <button
            className="garden-pagination-arrow"
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="次のページ"
          >
            →
          </button>
        )}
      </div>

      {rangeLabel && (
        <div className="garden-pagination-range">{rangeLabel}</div>
      )}
    </nav>
  );
}
