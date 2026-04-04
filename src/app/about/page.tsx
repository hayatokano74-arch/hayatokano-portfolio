import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { AboutPageClient } from "@/components/AboutPageClient";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <CanvasShell>
      <AboutPageClient />
    </CanvasShell>
  );
}
