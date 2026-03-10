import Link from "next/link";

/**
 * ページネーション
 *
 * UI例: ← 1 2 ... 27 →
 * - 現在ページの前後1ページ + 最初・最後のページを表示
 * - 間が飛ぶ場合は ... で省略
 */
export function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  /** ページ番号からURLを生成 */
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  /* 表示するページ番号を計算 */
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="ページ送り">
      {/* 前へ */}
      {currentPage > 1 ? (
        <Link href={buildHref(currentPage - 1)} className="pagination-arrow" aria-label="前のページ">
          ←
        </Link>
      ) : (
        <span className="pagination-arrow is-disabled" aria-hidden="true">←</span>
      )}

      {/* ページ番号 */}
      {pages.map((item, i) => {
        if (item === "...") {
          return <span key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">...</span>;
        }
        const page = item as number;
        return page === currentPage ? (
          <span key={page} className="pagination-page is-current" aria-current="page">{page}</span>
        ) : (
          <Link key={page} href={buildHref(page)} className="pagination-page">{page}</Link>
        );
      })}

      {/* 次へ */}
      {currentPage < totalPages ? (
        <Link href={buildHref(currentPage + 1)} className="pagination-arrow" aria-label="次のページ">
          →
        </Link>
      ) : (
        <span className="pagination-arrow is-disabled" aria-hidden="true">→</span>
      )}
    </nav>
  );
}

/**
 * ページ番号の配列を生成
 *
 * 常に表示: 最初, 最後, 現在, 現在±1
 * 飛ぶ箇所には "..." を挿入
 */
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  const set = new Set<number>();
  /* 常に表示するページ */
  set.add(1);
  set.add(total);
  set.add(current);
  if (current > 1) set.add(current - 1);
  if (current < total) set.add(current + 1);

  const sorted = [...set].sort((a, b) => a - b);
  const result: (number | "...")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("...");
    }
    result.push(sorted[i]);
  }
  return result;
}
