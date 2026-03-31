/**
 * Text データ取得
 *
 * content/text/*.md から gray-matter でパースして返す。
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import type { TextPost } from "@/lib/types";

const TEXT_DIR = path.join(process.cwd(), "content/text");

/** Text 全件取得（React.cache でリクエスト単位の重複排除） */
export const getTexts = cache(async (): Promise<TextPost[]> => {
  try {
    const files = fs.readdirSync(TEXT_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    if (files.length === 0) return [];

    const posts: TextPost[] = [];
    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(TEXT_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      const title = (String(data.title ?? "")).trim();
      if (!slug || !title) continue;

      const categories = ((data.categories ?? []) as string[])
        .map((c) => String(c).trim())
        .filter(Boolean);

      const toc = ((data.toc ?? []) as { id?: string; label?: string }[])
        .filter((t) => t.id && t.label)
        .map((t) => ({ id: t.id!, label: t.label! }));

      const sections = ((data.sections ?? []) as { id?: string; heading?: string; body?: string }[])
        .filter((s) => s.id && s.heading)
        .map((s) => ({
          id: s.id!,
          heading: s.heading!,
          body: (s.body ?? "").trim(),
        }));

      posts.push({
        slug,
        year: (String(data.year ?? "")).trim(),
        title,
        categories,
        body: content.trim(),
        ...(toc.length > 0 ? { toc } : {}),
        ...(sections.length > 0 ? { sections } : {}),
      });
    }

    return posts;
  } catch {
    return [];
  }
});

/** slug 指定で1件取得（React.cache でリクエスト単位の重複排除） */
export const getTextBySlug = cache(async (slug: string): Promise<TextPost | undefined> => {
  const all = await getTexts();
  return all.find((t) => t.slug === slug);
});
