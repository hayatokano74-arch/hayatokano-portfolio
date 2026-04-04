import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { TextPageClient } from "@/components/TextPageClient";

export const metadata: Metadata = { title: "Text" };

export default function TextListPage() {
  return (
    <CanvasShell>
      <TextPageClient />
    </CanvasShell>
  );
}
