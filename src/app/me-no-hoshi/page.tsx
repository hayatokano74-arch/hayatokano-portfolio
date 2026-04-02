import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterProvider, FilterLayout } from "@/components/FilterableContent";
import { FilteredWorksList, FilteredCount } from "@/components/FilteredWorksList";
import { buildFilterGroups } from "@/lib/categories";
import { getMeNoHoshiPosts } from "@/lib/meNoHoshi";
import { getMeNoHoshiGridSettings } from "@/lib/me-no-hoshi/api";
import { getPerPage } from "@/lib/siteSettings";

export const metadata: Metadata = { title: "目の星" };

export default async function MeNoHoshiPage() {
  /* 静的エクスポート: searchParams はクライアントサイドで処理 */
  const view = "grid";
  const selectedTags: string[] = [];
  const selectedYears: string[] = [];
  const q = "";
  const [posts, perPage, gridSettings] = await Promise.all([
    getMeNoHoshiPosts(),
    getPerPage(),
    getMeNoHoshiGridSettings(),
  ]);

  /* フィルターグループ構築（全データから） */
  const filterGroups = buildFilterGroups(
    posts.flatMap((p) => p.tags),
    posts.map((p) => p.year).filter(Boolean),
  );

  /* 初期選択状態（空: クライアントサイドで URL から復元） */
  const initialSelected = { tags: selectedTags, years: selectedYears };

  const worksGridHref = "/me-no-hoshi?view=grid";
  const worksListHref = "/me-no-hoshi?view=list";

  return (
    <CanvasShell>
      <FilterProvider
        initialSelected={initialSelected}
        basePath="/me-no-hoshi"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="目の星"
          title={<>目の星 / Menohoshi<FilteredCount allWorks={posts} searchQuery={q} basePath="/me-no-hoshi" /></>}
          showTitleRow={false}
          brandLabel="目の星"
          brandHref="/me-no-hoshi"
          showWorksToggle
          worksView={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={posts}
            view={view}
            perPage={perPage}
            basePath="/me-no-hoshi"
            detailQuery=""
            searchQuery={q}
            gridSettings={gridSettings}
          />
        </FilterLayout>
      </FilterProvider>
    </CanvasShell>
  );
}
