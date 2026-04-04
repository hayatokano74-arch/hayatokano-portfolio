import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { MeNoHoshiPageClient } from "@/components/MeNoHoshiPageClient";

export const metadata: Metadata = { title: "目の星" };

export default function MeNoHoshiPage() {
  return (
    <CanvasShell>
      <MeNoHoshiPageClient />
    </CanvasShell>
  );
}
