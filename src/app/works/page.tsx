import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Works" };
import { WorksClient } from "@/components/WorksClient";
import { getWorks } from "@/lib/works";
import { CATEGORY_MENU, parseCategory } from "@/lib/categories";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";

export default async function WorksPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tag?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "list" ? "list" : "grid";
  const activeCategory = parseCategory(sp?.tag);
  const q = sp?.q?.toLowerCase() ?? "";
  const works = await getWorks();
  let filteredWorks =
    activeCategory === "All" ? works : works.filter((work) => work.tags.includes(activeCategory));
  if (q) {
    filteredWorks = filteredWorks.filter((work) =>
      work.title.toLowerCase().includes(q) ||
      work.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      work.excerpt.toLowerCase().includes(q)
    );
  }
  const categoryHrefs = Object.fromEntries(
    CATEGORY_MENU.map((category) => {
      const params = new URLSearchParams();
      params.set("view", view);
      if (category !== "All") params.set("tag", category);
      return [category, `/works?${params.toString()}`];
    }),
  ) as Record<(typeof CATEGORY_MENU)[number], string>;
  const worksToggleParams = new URLSearchParams();
  if (activeCategory !== "All") worksToggleParams.set("tag", activeCategory);
  const worksGridHref = `/works?${new URLSearchParams({ ...Object.fromEntries(worksToggleParams), view: "grid" }).toString()}`;
  const worksListHref = `/works?${new URLSearchParams({ ...Object.fromEntries(worksToggleParams), view: "list" }).toString()}`;

  return (
    <CanvasShell>
      <Header
        active="Works"
        title="Works"
        showWorksToggle
        worksView={view}
        worksGridHref={worksGridHref}
        worksListHref={worksListHref}
        activeCategory={activeCategory}
        categoryHrefs={categoryHrefs}
      />
      <WorksClient works={filteredWorks} view={view} renderListDetail={(work) => <WorkDetailsTable details={work.details} />} />
    </CanvasShell>
  );
}
