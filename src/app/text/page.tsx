import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Text" };
import { texts } from "@/lib/mock";
import { CATEGORY_MENU, parseCategory } from "@/lib/categories";

export default async function TextListPage({
  searchParams,
}: {
  searchParams?: Promise<{ tag?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const activeCategory = parseCategory(sp?.tag);
  const q = sp?.q?.toLowerCase() ?? "";
  let filteredTexts =
    activeCategory === "All"
      ? texts
      : texts.filter((post) => post.categories.includes(activeCategory));
  if (q) {
    filteredTexts = filteredTexts.filter((post) =>
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q)
    );
  }
  const categoryHrefs = Object.fromEntries(
    CATEGORY_MENU.map((category) => {
      const params = new URLSearchParams();
      if (category !== "All") params.set("tag", category);
      const qs = params.toString();
      return [category, qs ? `/text?${qs}` : "/text"];
    }),
  );

  return (
    <CanvasShell>
      <Header active="Text" title="Text" activeCategory={activeCategory} categoryHrefs={categoryHrefs} />
      <div style={{ marginTop: "var(--space-12)" }}>
        <div className="hrline" />
        {filteredTexts.map((t) => (
          <div key={t.slug}>
            <Link
              href={`/text/${t.slug}`}
              className="action-link text-list-row"
              style={{
                display: "grid",
                gridTemplateColumns: "64px minmax(0, 1fr) minmax(0, auto)",
                alignItems: "baseline",
                columnGap: "var(--space-6)",
                paddingTop: "var(--space-3)",
                paddingBottom: "var(--space-3)",
              }}
            >
              <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, color: "var(--muted)" }}>{t.year}</div>
              <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{t.title}</div>
              <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", color: "var(--muted)", textAlign: "right", fontWeight: 600 }}>
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
