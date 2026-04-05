import type { Metadata } from "next";
import { GardenShell } from "@/components/GardenShell";
import { GardenPageClient } from "@/components/GardenPageClient";
import { getAllNodes } from "@/lib/garden/reader";

const BASE_URL = "https://hayatokano.com";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const nodes = await getAllNodes();
    // 最新の画像付き投稿を探す
    let imageUrl: string | undefined;
    for (const node of nodes) {
      const match = node.contentHtml.match(/src="([^"]+\.(jpg|jpeg|png|webp))"/i);
      if (match) {
        const src = match[1];
        imageUrl = src.startsWith("http") ? src : `${BASE_URL}${src}`;
        break;
      }
    }

    return {
      title: "Garden",
      description: "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。",
      openGraph: {
        title: "Garden | Hayato Kano",
        description: "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。",
        ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      },
    };
  } catch {
    return {
      title: "Garden",
      description: "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。",
    };
  }
}

export default function GardenPage() {
  return (
    <GardenShell>
      <GardenPageClient />
    </GardenShell>
  );
}
