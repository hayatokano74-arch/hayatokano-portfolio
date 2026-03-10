import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterProvider, FilterLayout } from "@/components/FilterableContent";

export const metadata: Metadata = { title: "Works" };
import { WorksClient } from "@/components/WorksClient";
import { getWorks } from "@/lib/works";
import { parseTags, parseYears, buildFilterGroups } from "@/lib/categories";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";
import { Pagination } from "@/components/Pagination";
import { getPerPage } from "@/lib/siteSettings";

export default async function WorksPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tags?: string; tag?: string; years?: string; q?: string; page?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "grid" ? "grid" : "list";
  const selectedTags = parseTags(sp);
  const selectedYears = parseYears(sp);
  const q = sp?.q?.toLowerCase() ?? "";
  const [works, perPage] = await Promise.all([getWorks(), getPerPage()]);

  /* フィルタリング: Category + Year 複数選択対応 */
  let filteredWorks = works;
  if (selectedTags.length > 0) {
    filteredWorks = filteredWorks.filter((w) => selectedTags.some((t) => w.tags.includes(t)));
  }
  if (selectedYears.length > 0) {
    filteredWorks = filteredWorks.filter((w) => selectedYears.includes(w.year));
  }
  if (q) {
    filteredWorks = filteredWorks.filter((work) =>
      work.title.toLowerCase().includes(q) ||
      work.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      work.excerpt.toLowerCase().includes(q) ||
      work.year.includes(q) ||
      work.date.includes(q) ||
      Object.values(work.details).some((v) => typeof v === "string" && v.toLowerCase().includes(q))
    );
  }

  /* フィルターグループ構築（Category + Year） */
  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

  /* 現在の選択状態 */
  const selected = { tags: selectedTags, years: selectedYears };

  /* 現在のURLパラメータ */
  const spRecord: Record<string, string> = {};
  if (sp?.view) spRecord.view = sp.view;
  if (sp?.q) spRecord.q = sp.q;
  if (sp?.tags) spRecord.tags = sp.tags;
  if (sp?.years) spRecord.years = sp.years;

  /* ページネーション */
  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / perPage));
  const currentPage = Math.min(Math.max(1, parseInt(sp?.page ?? "1", 10) || 1), totalPages);
  const pagedWorks = filteredWorks.slice((currentPage - 1) * perPage, currentPage * perPage);

  /* Grid/Listトグル・ページネーション用のベースパラメータ */
  const toggleBase = new URLSearchParams();
  if (selectedTags.length > 0) toggleBase.set("tags", selectedTags.join(","));
  if (selectedYears.length > 0) toggleBase.set("years", selectedYears.join(","));
  if (q) toggleBase.set("q", q);
  const worksGridHref = `/works?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "grid" }).toString()}`;
  const worksListHref = `/works?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "list" }).toString()}`;

  /** ページ番号からURLを生成（page=1のときはパラメータ省略） */
  const buildPageHref = (page: number) => {
    const params = new URLSearchParams(toggleBase);
    params.set("view", view);
    if (page > 1) params.set("page", String(page));
    return `/works?${params.toString()}`;
  };

  return (
    <CanvasShell>
      <FilterProvider selected={selected}>
        <Header
          active="Works"
          title={<>Works<span className="page-title-count">({filteredWorks.length})</span></>}
          showWorksToggle
          worksView={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          showFilterButton
        />
        <FilterLayout
          groups={filterGroups}
          selected={selected}
          basePath="/works"
          currentSearchParams={spRecord}
        >
          <WorksClient works={pagedWorks} view={view} renderListDetail={(work) => <WorkDetailsTable details={work.details} />} />
          <Pagination currentPage={currentPage} totalPages={totalPages} buildHref={buildPageHref} />
        </FilterLayout>
      </FilterProvider>
    </CanvasShell>
  );
}
