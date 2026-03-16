import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterProvider, FilterLayout } from "@/components/FilterableContent";
import { FilteredWorksList, FilteredCount } from "@/components/FilteredWorksList";
import { getWorks } from "@/lib/works";
import { parseTags, parseYears, buildFilterGroups } from "@/lib/categories";
import { getPerPage } from "@/lib/siteSettings";

export const metadata: Metadata = { title: "Works" };

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

  /* フィルターグループ構築（全データから） */
  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

  /* 初期選択状態（URLパラメータから） */
  const initialSelected = { tags: selectedTags, years: selectedYears };

  /* 現在のURLパラメータ（フィルター以外を維持） */
  const spRecord: Record<string, string> = {};
  if (sp?.view) spRecord.view = sp.view;
  if (sp?.q) spRecord.q = sp.q;

  /* Grid/Listトグル用URL */
  const toggleBase = new URLSearchParams();
  if (selectedTags.length > 0) toggleBase.set("tags", selectedTags.join(","));
  if (selectedYears.length > 0) toggleBase.set("years", selectedYears.join(","));
  if (q) toggleBase.set("q", q);
  const worksGridHref = `/works?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "grid" }).toString()}`;
  const worksListHref = `/works?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "list" }).toString()}`;

  return (
    <CanvasShell>
      <FilterProvider
        initialSelected={initialSelected}
        basePath="/works"
        currentSearchParams={spRecord}
        groups={filterGroups}
      >
        <Header
          active="Works"
          title={<>Works<FilteredCount allWorks={works} searchQuery={q} basePath="/works" /></>}
          showWorksToggle
          worksView={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={works}
            view={view}
            perPage={perPage}
            basePath="/works"
            searchQuery={q}
          />
        </FilterLayout>
      </FilterProvider>
    </CanvasShell>
  );
}
