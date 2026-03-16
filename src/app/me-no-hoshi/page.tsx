import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterProvider, FilterLayout } from "@/components/FilterableContent";
import { FilteredWorksList, FilteredCount } from "@/components/FilteredWorksList";
import { parseTags, parseYears, buildFilterGroups } from "@/lib/categories";
import { getMeNoHoshiPosts } from "@/lib/meNoHoshi";
import { getPerPage } from "@/lib/siteSettings";

export const metadata: Metadata = { title: "目の星" };

export default async function MeNoHoshiPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tags?: string; tag?: string; years?: string; q?: string; page?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "list" ? "list" : "grid";
  const selectedTags = parseTags(sp);
  const selectedYears = parseYears(sp);
  const q = sp?.q?.toLowerCase() ?? "";
  const [posts, perPage] = await Promise.all([getMeNoHoshiPosts(), getPerPage()]);

  /* フィルターグループ構築（全データから） */
  const filterGroups = buildFilterGroups(
    posts.flatMap((p) => p.tags),
    posts.map((p) => p.year).filter(Boolean),
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
  const worksGridHref = `/me-no-hoshi?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "grid" }).toString()}`;
  const worksListHref = `/me-no-hoshi?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "list" }).toString()}`;

  return (
    <CanvasShell>
      <FilterProvider
        initialSelected={initialSelected}
        basePath="/me-no-hoshi"
        currentSearchParams={spRecord}
        groups={filterGroups}
      >
        <Header
          active="目の星"
          title={<>目の星 / Menohoshi<FilteredCount allWorks={posts} searchQuery={q} basePath="/me-no-hoshi" /></>}
          brandLabel="目の星 menohoshi"
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
          />
        </FilterLayout>
      </FilterProvider>
    </CanvasShell>
  );
}
