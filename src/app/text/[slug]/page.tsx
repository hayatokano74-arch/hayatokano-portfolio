import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { TextDetailPageClient } from "@/components/TextDetailPageClient";
import { getTexts, getTextBySlug } from "@/lib/text";

export const dynamicParams = false;
export async function generateStaticParams() {
  try {
    const texts = await getTexts();
    if (texts.length > 0) return texts.map((t) => ({ slug: t.slug }));
  } catch { /* noop */ }
  // コンテンツなし: ダミーエントリで静的エクスポートのバリデーションを通過させる
  return [{ slug: '_placeholder' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getTextBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.body.slice(0, 160),
  };
}

export default function TextDetail() {
  return (
    <CanvasShell>
      <TextDetailPageClient />
    </CanvasShell>
  );
}
