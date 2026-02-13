import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { WorksClient } from "@/components/WorksClient";

export const metadata: Metadata = { title: "目の星" };
import { CATEGORY_MENU, parseCategory } from "@/lib/categories";
import { getMeNoHoshiPosts, type MeNoHoshiPost } from "@/lib/meNoHoshi";

export default async function MeNoHoshiPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; tag?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "list" ? "list" : "grid";
  const activeCategory = parseCategory(sp?.tag);
  const q = sp?.q?.toLowerCase() ?? "";
  const posts = await getMeNoHoshiPosts();
  let filteredPosts =
    activeCategory === "All" ? posts : posts.filter((post) => post.tags.includes(activeCategory));
  if (q) {
    filteredPosts = filteredPosts.filter((post) =>
      post.title.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      post.statement.toLowerCase().includes(q)
    );
  }
  const categoryHrefs = Object.fromEntries(
    CATEGORY_MENU.map((category) => {
      const params = new URLSearchParams();
      params.set("view", view);
      if (category !== "All") params.set("tag", category);
      return [category, `/me-no-hoshi?${params.toString()}`];
    }),
  ) as Record<(typeof CATEGORY_MENU)[number], string>;
  const toggleParams = new URLSearchParams();
  if (activeCategory !== "All") toggleParams.set("tag", activeCategory);
  const worksGridHref = `/me-no-hoshi?${new URLSearchParams({ ...Object.fromEntries(toggleParams), view: "grid" }).toString()}`;
  const worksListHref = `/me-no-hoshi?${new URLSearchParams({ ...Object.fromEntries(toggleParams), view: "list" }).toString()}`;

  return (
    <CanvasShell>
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
        activeCategory={activeCategory}
        categoryHrefs={categoryHrefs}
      />
      <WorksClient
        works={filteredPosts}
        view={view}
        basePath="/me-no-hoshi"
        detailQuery=""
        renderListDetail={(post) => <MeNoHoshiListDetails post={post} />}
      />
    </CanvasShell>
  );
}

function MeNoHoshiListDetails({ post }: { post: MeNoHoshiPost }) {
  const rows = [
    { label: "ARTIST", value: post.details.artist },
    { label: "PERIOD", value: post.details.period },
    { label: "VENUE", value: post.details.venue },
    { label: "HOURS", value: post.details.hours },
    { label: "CLOSED", value: post.details.closed },
    { label: "ADMISSION", value: post.details.admission },
    { label: "ADDRESS", value: post.details.address },
    { label: "ACCESS", value: post.details.access },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <section>
      <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "var(--space-2)" }}>DETAILS</div>
      <div style={{ borderTop: "1px solid var(--line-light)" }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "112px minmax(0,1fr)",
              borderBottom: "1px solid var(--line-light)",
              gap: "var(--space-2)",
              paddingTop: "var(--space-2)",
              paddingBottom: "var(--space-2)",
            }}
          >
            <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>{row.label}</div>
            <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>{row.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
