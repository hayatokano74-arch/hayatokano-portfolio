import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterProvider, FilterLayout } from "@/components/FilterableContent";
import { FilteredWorksList, FilteredCount } from "@/components/FilteredWorksList";
import { getWorks } from "@/lib/works";
import { buildFilterGroups } from "@/lib/categories";
import { getPerPage } from "@/lib/siteSettings";

export const metadata: Metadata = { title: "Works" };

export default async function WorksPage() {
  /* 静的エクスポート: searchParams はクライアントサイドで処理 */
  const view = "list";
  const q = "";
  const [works, perPage] = await Promise.all([getWorks(), getPerPage()]);

  /* フィルターグループ構築（全データから） */
  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

  const initialSelected = { tags: [] as string[], years: [] as string[] };
  const worksGridHref = "/works?view=grid";
  const worksListHref = "/works?view=list";

  return (
    <CanvasShell>
      <FilterProvider
        initialSelected={initialSelected}
        basePath="/works"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="Works"
          title={<>Works<FilteredCount allWorks={works} searchQuery={q} basePath="/works" /></>}
          showTitleRow={false}
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
