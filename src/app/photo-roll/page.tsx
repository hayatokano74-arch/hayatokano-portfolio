import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { PhotoRollPageClient } from "@/components/PhotoRollPageClient";

export const metadata: Metadata = {
  title: "Photo Roll",
  description: "日々のスナップ。",
};

export default function PhotoRollPage() {
  return (
    <CanvasShell>
      <PhotoRollPageClient />
    </CanvasShell>
  );
}
