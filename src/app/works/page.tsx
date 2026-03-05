import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterableContent } from "@/components/FilterableContent";

export const metadata: Metadata = { title: "Works" };
import { WorksClient } from "@/components/WorksClient";
import { getWorks } from "@/lib/works";
import { parseTags, buildFilterGroups } from "@/lib/categories";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";

export default async function WorksPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tags?: string; tag?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "grid" ? "grid" : "list";
  const selectedTags = parseTags(sp);
  const q = sp?.q?.toLowerCase() ?? "";
  const works = await getWorks();

  /* フィルタリング: 複数タグ選択対応 */
  let filteredWorks = selectedTags.length > 0
    ? works.filter((work) => selectedTags.some((t) => work.tags.includes(t)))
    : works;
  if (q) {
    filteredWorks = filteredWorks.filter((work) =>
      work.title.toLowerCase().includes(q) ||
      work.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      work.excerpt.toLowerCase().includes(q)
    );
  }

  /* フィルターグループ構築 */
  const filterGroups = buildFilterGroups(works.flatMap((w) => w.tags), "Category");

  /* 現在のURLパラメータ */
  const spRecord: Record<string, string> = {};
  if (sp?.view) spRecord.view = sp.view;
  if (sp?.q) spRecord.q = sp.q;
  if (sp?.tags) spRecord.tags = sp.tags;

  /* Grid/Listトグル用のURL */
  const toggleBase = new URLSearchParams();
  if (selectedTags.length > 0) toggleBase.set("tags", selectedTags.join(","));
  if (q) toggleBase.set("q", q);
  const worksGridHref = `/works?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "grid" }).toString()}`;
  const worksListHref = `/works?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "list" }).toString()}`;

  return (
    <CanvasShell>
      <FilterableContent
        groups={filterGroups}
        selectedTags={selectedTags}
        basePath="/works"
        currentSearchParams={spRecord}
      >
        <Header
          active="Works"
          title="Works"
          showWorksToggle
          worksView={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          showFilterButton
        />
        <WorksClient works={filteredWorks} view={view} renderListDetail={(work) => <WorkDetailsTable details={work.details} />} />
      </FilterableContent>
    </CanvasShell>
  );
}
