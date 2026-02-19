import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenGrid } from "@/components/GardenGrid";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

export default async function GardenPage() {
  const nodes = await getAllNodes();

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <div style={{ marginTop: "var(--space-6)" }}>
        <GardenGrid nodes={nodes} />
      </div>
    </CanvasShell>
  );
}
