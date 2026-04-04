import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorksPageClient } from "@/components/WorksPageClient";

export const metadata: Metadata = { title: "Works" };

export default function WorksPage() {
  return (
    <CanvasShell>
      <WorksPageClient />
    </CanvasShell>
  );
}
