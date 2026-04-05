import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { MeNoHoshiPageClient } from "@/components/MeNoHoshiPageClient";
import { getMeNoHoshiPosts } from "@/lib/meNoHoshi";

const BASE_URL = "https://hayatokano.com";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const posts = await getMeNoHoshiPosts();
    const latest = posts[0];
    const image = latest?.media[0]?.src;
    const imageUrl = image?.startsWith("http") ? image : image ? `${BASE_URL}${image}` : undefined;

    return {
      title: "目の星",
      openGraph: {
        title: "目の星 | Hayato Kano",
        ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      },
    };
  } catch {
    return { title: "目の星" };
  }
}

export default function MeNoHoshiPage() {
  return (
    <CanvasShell>
      <MeNoHoshiPageClient />
    </CanvasShell>
  );
}
