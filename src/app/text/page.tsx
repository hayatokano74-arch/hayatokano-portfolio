import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Text" };
import { getTexts } from "@/lib/text";
import { buildCategoryMenu, parseCategory } from "@/lib/categories";

export default async function TextListPage({
  searchParams,
}: {
  searchParams?: Promise<{ tag?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const activeCategory = parseCategory(sp?.tag);
  const q = sp?.q?.toLowerCase() ?? "";
  const texts = await getTexts();
  let filteredTexts =
    activeCategory === "All"
      ? texts
      : texts.filter((post) => (post.categories as string[]).includes(activeCategory));
  if (q) {
    filteredTexts = filteredTexts.filter((post) =>
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q)
    );
  }
  /* 投稿に含まれるタグだけをカテゴリメニューに表示 */
  const categoryMenu = buildCategoryMenu(texts.flatMap((t) => t.categories));
  const categoryHrefs = Object.fromEntries(
    categoryMenu.map((category) => {
      const params = new URLSearchParams();
      if (category !== "All") params.set("tag", category);
      const qs = params.toString();
      return [category, qs ? `/text?${qs}` : "/text"];
    }),
  );

  return (
    <CanvasShell>
      <Header active="Text" title="Text" activeCategory={activeCategory} categoryHrefs={categoryHrefs} />
      <div style={{ marginTop: "var(--space-6)" }}>
        <div className="hrline" />
        {filteredTexts.map((t) => (
          <div key={t.slug}>
            <Link
              href={`/text/${t.slug}`}
              className="action-link text-list-row"
            >
              <div className="text-list-year" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, color: "var(--muted)" }}>{t.year}</div>
              <div className="text-list-title" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{t.title}</div>
              <div className="text-list-categories" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", color: "var(--muted)", fontWeight: 600 }}>
                {t.categories.join("    ")}
              </div>
            </Link>
            <div className="hrline" />
          </div>
        ))}
      </div>
    </CanvasShell>
  );
}
