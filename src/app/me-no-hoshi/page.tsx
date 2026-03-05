import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { FilterProvider, FilterLayout } from "@/components/FilterableContent";
import { WorksClient } from "@/components/WorksClient";

export const metadata: Metadata = { title: "目の星" };
import { parseTags, buildFilterGroups } from "@/lib/categories";
import { getMeNoHoshiPosts, type MeNoHoshiPost } from "@/lib/meNoHoshi";

export default async function MeNoHoshiPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tags?: string; tag?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "list" ? "list" : "grid";
  const selectedTags = parseTags(sp);
  const q = sp?.q?.toLowerCase() ?? "";
  const posts = await getMeNoHoshiPosts();

  /* フィルタリング: 複数タグ選択対応 */
  let filteredPosts = selectedTags.length > 0
    ? posts.filter((post) => selectedTags.some((t) => post.tags.includes(t)))
    : posts;
  if (q) {
    filteredPosts = filteredPosts.filter((post) =>
      post.title.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      post.statement.toLowerCase().includes(q)
    );
  }

  /* フィルターグループ構築 */
  const filterGroups = buildFilterGroups(posts.flatMap((p) => p.tags), "Category");

  /* 現在のURLパラメータ */
  const spRecord: Record<string, string> = {};
  if (sp?.view) spRecord.view = sp.view;
  if (sp?.q) spRecord.q = sp.q;
  if (sp?.tags) spRecord.tags = sp.tags;

  /* Grid/Listトグル用のURL */
  const toggleBase = new URLSearchParams();
  if (selectedTags.length > 0) toggleBase.set("tags", selectedTags.join(","));
  if (q) toggleBase.set("q", q);
  const worksGridHref = `/me-no-hoshi?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "grid" }).toString()}`;
  const worksListHref = `/me-no-hoshi?${new URLSearchParams({ ...Object.fromEntries(toggleBase), view: "list" }).toString()}`;

  return (
    <CanvasShell>
      <FilterProvider selectedTags={selectedTags}>
        <Header
          active="目の星"
          title="目の星"
          brandLabel="目の星 menohoshi"
          brandHref="/me-no-hoshi"
          showTitleRow={false}
          showWorksToggle
          worksView={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          showFilterButton
        />
        <FilterLayout
          groups={filterGroups}
          selectedTags={selectedTags}
          basePath="/me-no-hoshi"
          currentSearchParams={spRecord}
        >
          <WorksClient
            works={filteredPosts}
            view={view}
            basePath="/me-no-hoshi"
            detailQuery=""
            renderListDetail={(post) => <MeNoHoshiListDetails post={post} />}
          />
        </FilterLayout>
      </FilterProvider>
    </CanvasShell>
  );
}

function MeNoHoshiListDetails({ post }: { post: MeNoHoshiPost }) {
  const rows = post.details.filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <section>
      <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "var(--space-2)" }}>DETAILS</div>
      <div style={{ borderTop: "1px solid var(--line-light)" }}>
        {rows.map((row) => (
          <div
            key={row.key}
            className="work-details-row"
          >
            <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>{row.label}</div>
            <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>{row.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
