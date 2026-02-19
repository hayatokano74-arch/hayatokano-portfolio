import { Suspense } from "react";
import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

export default async function GardenPage() {
  const nodes = await getAllNodes();

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <Suspense>
        <GardenPageContent nodes={nodes} />
      </Suspense>
    </CanvasShell>
  );
}
