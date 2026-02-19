import type { Metadata } from "next";
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

  // ハッシュタグリンクからの遷移時のみフィルタ適用
  const nodes = activeTag
    ? allNodes.filter((n) => n.tags.includes(activeTag))
    : allNodes;

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <div style={{ marginTop: "var(--space-6)" }}>
        {activeTag && (
          <p className="garden-filter-label">#{activeTag}</p>
        )}
        <GardenGrid nodes={nodes} />
      </div>
    </CanvasShell>
  );
}
