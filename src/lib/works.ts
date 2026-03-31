/**
 * Works データ取得
 *
 * content/works/*.md から gray-matter でパースして返す。
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import type { Work } from "@/lib/types";
import { works as fallbackWorks } from "@/lib/mock";

const WORKS_DIR = path.join(process.cwd(), "content/works");

/* モジュールレベルに RegExp を巻き上げ */
const RE_UNICODE_TEST = /u[0-9a-fA-F]{4}/;
const RE_UNICODE_REPLACE = /u([0-9a-fA-F]{4})/g;

/**
 * 壊れたUnicodeエスケープ（uXXXX → 正しいUnicode文字）を復元
 * WP sanitize_file_name() がCJK文字を壊した場合のフォールバック
 */
function fixBrokenUnicodeUrl(url: string): string {
  if (!RE_UNICODE_TEST.test(url)) return url;
  return url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
}

type RawMedia = {
  id?: string;
  type?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  poster?: string;
};

type RawDetails = Record<string, string | undefined>;

function parseWork(slug: string, data: Record<string, unknown>, content: string): Work | null {
  const title = (String(data.title ?? "")).trim();
  if (!slug || !title) return null;

  const tags = ((data.tags ?? []) as string[])
    .map((t) => String(t).trim())
    .filter(Boolean);

  const media = ((data.media ?? []) as RawMedia[])
    .filter((m) => m?.id && m?.src)
    .map((m) => ({
      id: m.id!,
      type: (m.type === "video" ? "video" : "image") as "image" | "video",
      src: fixBrokenUnicodeUrl(m.src!),
      alt: m.alt ?? "",
      width: m.width ?? 1280,
      height: m.height ?? 800,
      ...(m.poster ? { poster: fixBrokenUnicodeUrl(m.poster) } : {}),
    }));

  if (media.length === 0) return null;

  const thumb = data.thumbnail as { src?: string; alt?: string; width?: number; height?: number } | undefined;
  const thumbnail = thumb?.src
    ? {
        src: fixBrokenUnicodeUrl(thumb.src),
        alt: thumb.alt ?? "",
        width: thumb.width ?? 1280,
        height: thumb.height ?? 800,
      }
    : undefined;

  const d = (data.details ?? {}) as RawDetails;
  return {
    slug,
    date: (String(data.date ?? "")).trim(),
    title,
    tags,
    year: (String(data.year ?? "")).trim(),
    excerpt: content.trim(),
    ...(thumbnail ? { thumbnail } : {}),
    details: {
      exhibition_type: (d.exhibition_type ?? "").trim() || undefined,
      exhibition_title: (d.exhibition_title ?? "").trim() || undefined,
      artist: (d.artist ?? "").trim(),
      period: (d.period ?? "").trim(),
      venue: (d.venue ?? "").trim(),
      address: (d.address ?? "").trim() || undefined,
      access: (d.access ?? "").trim() || undefined,
      hours: (d.hours ?? "").trim() || undefined,
      closed: (d.closed ?? "").trim() || undefined,
      admission: (d.admission ?? "").trim() || undefined,
      organizer: (d.organizer ?? "").trim() || undefined,
      curator: (d.curator ?? "").trim() || undefined,
      artists: (d.artists ?? "").trim() || undefined,
      supported_by: (d.supported_by ?? "").trim() || undefined,
      url: (d.url ?? "").trim() || undefined,
      medium: (d.medium ?? "").trim() || undefined,
      dimensions: (d.dimensions ?? "").trim() || undefined,
      edition: (d.edition ?? "").trim() || undefined,
      series: (d.series ?? "").trim() || undefined,
      publisher: (d.publisher ?? "").trim() || undefined,
      pages: (d.pages ?? "").trim() || undefined,
      binding: (d.binding ?? "").trim() || undefined,
      price: (d.price ?? "").trim() || undefined,
      credit_photo: (d.credit_photo ?? "").trim() || undefined,
      credit_design: (d.credit_design ?? "").trim() || undefined,
      credit_text: (d.credit_text ?? "").trim() || undefined,
      credit_sound: (d.credit_sound ?? "").trim() || undefined,
      credit_video: (d.credit_video ?? "").trim() || undefined,
      credit_translation: (d.credit_translation ?? "").trim() || undefined,
      credit_cooperation: (d.credit_cooperation ?? "").trim() || undefined,
      award: (d.award ?? "").trim() || undefined,
      collection: (d.collection ?? "").trim() || undefined,
      bio: (d.bio ?? "").trim() || undefined,
    },
    media,
    ...(data.pinned ? { pinned: true } : {}),
  };
}

/** Works 全件取得（React.cache でリクエスト単位の重複排除） */
export const getWorks = cache(async (): Promise<Work[]> => {
  try {
    const files = fs.readdirSync(WORKS_DIR).filter((f) => f.endsWith(".md"));
    if (files.length === 0) return fallbackWorks;

    const works: Work[] = [];
    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(WORKS_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const work = parseWork(slug, data, content);
      if (work) works.push(work);
    }

    if (works.length === 0) return fallbackWorks;

    /* date降順（新しい順）でソートし、ピン留め作品を先頭に */
    works.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const pinned = works.filter((w) => w.pinned);
    const rest = works.filter((w) => !w.pinned);
    return [...pinned, ...rest];
  } catch {
    return fallbackWorks;
  }
});

/** slug 指定で1件取得（React.cache でリクエスト単位の重複排除） */
export const getWorkBySlug = cache(async (slug: string): Promise<Work | undefined> => {
  const all = await getWorks();
  return all.find((w) => w.slug === slug);
});
