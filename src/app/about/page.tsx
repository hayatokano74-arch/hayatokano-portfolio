import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { AboutPageClient } from "@/components/AboutPageClient";
import { getAbout } from "@/lib/about";

export const revalidate = 3600;
export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const about = await getAbout().catch(() => null);
  return (
    <CanvasShell>
      <AboutPageClient about={about} />
    </CanvasShell>
  );
}
