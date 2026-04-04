"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilterContext } from "@/components/FilterableContent";
import { useViewMode } from "@/components/ViewModeContext";
import { WorksClient } from "@/components/WorksClient";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";
import type { Work } from "@/lib/types";
import type { MeNoHoshiGridField } from "@/lib/me-no-hoshi/api";

/** WorksClient が受け取る最小型 */
type WorkLike = Omit<Work, "details"> & { details: unknown };

/** Works用の検索フィールド抽出 */
function getWorksSearchFields(w: Work): string[] {
  return [
    w.title,
    ...w.tags,
    w.excerpt,
    w.year,
    w.date,
    ...Object.values(w.details).filter((v): v is string => typeof v === "string"),
  ];
}

/** 目の星用の検索フィールド抽出 */
function getMeNoHoshiSearchFields(w: WorkLike): string[] {
  const details = w.details as { label?: string; value?: string }[];
  return [
    w.title,
    ...w.tags,
    (w as { statement?: string }).statement ?? "",
    w.year,
    w.date,
    ...(Array.isArray(details)
      ? details.flatMap((d) => [d.value ?? "", d.label ?? ""])
      : []),
  ];
}

/**
 * クライアント側でフィルタリング・ページネーションを実行。
 * FilterProvider の selected を参照して即座にフィルター結果を反映する。
 */
export function FilteredWorksList<T extends WorkLike>({
  allWorks,
  perPage,
  basePath = "/works",
  detailQuery,
  searchQuery = "",
  gridSettings,
}: {
  allWorks: T[];
  perPage: number;
  basePath?: "/works" | "/me-no-hoshi";
  detailQuery?: string;
  searchQuery?: string;
  gridSettings?: MeNoHoshiGridField[];
}) {
  const { selected } = useFilterContext();
  const { view } = useViewMode();
  const selectedTags = selected.tags ?? [];
  const selectedYears = selected.years ?? [];

  const [currentPage, setCurrentPage] = useState(1);

  /* フィルター変更時にページ1にリセット */
  const filterKey = `${selectedTags.join(",")}|${selectedYears.join(",")}`;
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKey]);

  /* 検索フィールド抽出関数を basePath で選択 */
  const getSearchFields = basePath === "/me-no-hoshi" ? getMeNoHoshiSearchFields : getWorksSearchFields;

  /* クライアント側フィルタリング */
  const filteredWorks = useMemo(() => {
    let result = allWorks;
    if (selectedTags.length > 0) {
      result = result.filter((w) => selectedTags.some((t) => w.tags.includes(t)));
    }
    if (selectedYears.length > 0) {
      result = result.filter((w) => selectedYears.includes(w.year));
    }
    if (searchQuery) {
      result = result.filter((w) =>
        getSearchFields(w as WorkLike & Work).some((field) => field.toLowerCase().includes(searchQuery)),
      );
    }
    return result;
  }, [allWorks, selectedTags, selectedYears, searchQuery, getSearchFields]);

  /* ページネーション */
  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const pagedWorks = filteredWorks.slice((safePage - 1) * perPage, safePage * perPage);

  /* ページ変更ハンドラ */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* リスト詳細レンダリング（Works用: WorkDetailsTable） */
  const renderListDetail = basePath === "/works"
    ? (work: T) => <WorkDetailsTable details={(work as unknown as Work).details} />
    : basePath === "/me-no-hoshi"
      ? (work: T) => <MeNoHoshiListDetails details={work.details as { key: string; label: string; value: string }[]} gridSettings={gridSettings} />
      : undefined;

  return (
    <>
      <WorksClient
        works={pagedWorks}
        view={view}
        basePath={basePath}
        detailQuery={detailQuery}
        renderListDetail={renderListDetail}
        gridSettings={gridSettings}
      />
      <ClientPagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  );
}

/** 目の星のリスト詳細（グリッド設定に基づいてフィルタ＋並べ替え） */
function MeNoHoshiListDetails({
  details,
  gridSettings,
}: {
  details: { key: string; label: string; value: string }[];
  gridSettings?: MeNoHoshiGridField[];
}) {
  let rows: { key: string; label: string; value: string }[];

  if (gridSettings && gridSettings.length > 0) {
    /* グリッド設定の順序で、visibleなフィールドのみ表示 */
    const visibleKeys = gridSettings.filter((f) => f.visible).map((f) => f.key);
    const detailMap = new Map(details.map((d) => [d.key, d]));
    rows = visibleKeys
      .map((key) => detailMap.get(key))
      .filter((d): d is { key: string; label: string; value: string } => !!d && !!d.value);
  } else {
    rows = details.filter((row) => row.value && !row.key.startsWith("bio-"));
  }

  if (rows.length === 0) return null;

  return (
    <section className="work-details-table">
      <div className="work-details-table-header">DETAILS</div>
      {rows.map((row) => (
        <div key={row.key} className="work-details-row">
          <div className="work-details-label">{row.label}:</div>
          <div className="work-details-value">{row.value}</div>
        </div>
      ))}
    </section>
  );
}

/** フィルター結果の件数を表示するクライアントコンポーネント */
export function FilteredCount<T extends WorkLike>({
  allWorks,
  searchQuery = "",
  basePath = "/works",
}: {
  allWorks: T[];
  searchQuery?: string;
  basePath?: "/works" | "/me-no-hoshi";
}) {
  const { selected } = useFilterContext();
  const selectedTags = selected.tags ?? [];
  const selectedYears = selected.years ?? [];
  const getSearchFields = basePath === "/me-no-hoshi" ? getMeNoHoshiSearchFields : getWorksSearchFields;

  const count = useMemo(() => {
    let result = allWorks;
    if (selectedTags.length > 0) {
      result = result.filter((w) => selectedTags.some((t) => w.tags.includes(t)));
    }
    if (selectedYears.length > 0) {
      result = result.filter((w) => selectedYears.includes(w.year));
    }
    if (searchQuery) {
      result = result.filter((w) =>
        getSearchFields(w as WorkLike & Work).some((field) => field.toLowerCase().includes(searchQuery)),
      );
    }
    return result.length;
  }, [allWorks, selectedTags, selectedYears, searchQuery, getSearchFields]);

  return <span className="page-title-count">({count})</span>;
}

/** クライアント側ページネーション（Linkではなくボタンで制御） */
function ClientPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="ページ送り">
      {currentPage > 1 ? (
        <button type="button" className="pagination-arrow" aria-label="前のページ" onClick={() => onPageChange(currentPage - 1)}>
          ←
        </button>
      ) : (
        <span className="pagination-arrow is-disabled" aria-hidden="true">←</span>
      )}

      {pages.map((item, i) => {
        if (item === "...") {
          return <span key={`ellipsis-${i}`} className="pagination-ellipsis" aria-hidden="true">...</span>;
        }
        const page = item as number;
        return page === currentPage ? (
          <span key={page} className="pagination-page is-current" aria-current="page">{page}</span>
        ) : (
          <button type="button" key={page} className="pagination-page" onClick={() => onPageChange(page)}>{page}</button>
        );
      })}

      {currentPage < totalPages ? (
        <button type="button" className="pagination-arrow" aria-label="次のページ" onClick={() => onPageChange(currentPage + 1)}>
          →
        </button>
      ) : (
        <span className="pagination-arrow is-disabled" aria-hidden="true">→</span>
      )}
    </nav>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  const set = new Set<number>();
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
