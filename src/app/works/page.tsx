import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorksPageClient } from "@/components/WorksPageClient";
import { getWorks } from "@/lib/works";

const BASE_URL = "https://hayatokano.com";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const works = await getWorks();
    const latest = works[0];
    const image = latest?.thumbnail?.src || latest?.media[0]?.src;
    const imageUrl = image?.startsWith("http") ? image : image ? `${BASE_URL}${image}` : undefined;

    return {
      title: "Works",
      openGraph: {
        title: "Works | Hayato Kano",
        ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      },
    };
  } catch {
    return { title: "Works" };
  }
}

export default function WorksPage() {
  return (
    <CanvasShell>
      <WorksPageClient />
    </CanvasShell>
  );
}
