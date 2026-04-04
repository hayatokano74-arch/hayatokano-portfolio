import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { NewsPageClient } from "@/components/NewsPageClient";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <CanvasShell>
      <NewsPageClient />
    </CanvasShell>
  );
}
