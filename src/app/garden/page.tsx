import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenGrid } from "@/components/GardenGrid";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

export default async function GardenPage({
  searchParams,
}: {
  searchParams?: Promise<{ tag?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const activeTag = sp?.tag ?? null;

  const allNodes = await getAllNodes();

  // 全ノードからユニークなタグを収集
  const allTags = [...new Set(allNodes.flatMap((n) => n.tags))].sort();

  // タグフィルタ適用
  const nodes = activeTag
    ? allNodes.filter((n) => n.tags.includes(activeTag))
    : allNodes;

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <div style={{ marginTop: "var(--space-6)" }}>
        {allTags.length > 0 && (
          <div className="garden-tag-filter">
            <Link
              href="/garden"
              className={`garden-filter-tag ${!activeTag ? "garden-filter-tag--active" : ""}`}
            >
              All
            </Link>
            {allTags.map((tag) => (
              <Link
                key={tag}
                href={`/garden?tag=${encodeURIComponent(tag)}`}
                className={`garden-filter-tag ${activeTag === tag ? "garden-filter-tag--active" : ""}`}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        <GardenGrid nodes={nodes} />
      </div>
    </CanvasShell>
  );
}
