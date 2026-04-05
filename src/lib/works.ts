/**
 * Works データ取得
 *
 * 優先順位:
 *  1. PHP CMS API（https://hayatokano.com/_cms/api/works.php）
 *  2. content/works/*.md のローカルファイル（CMS が空 / 未到達時のフォールバック）
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import type { Work } from "@/lib/types";
import { works as fallbackWorks } from "@/lib/mock";
import { fetchCms, type CmsWork, type CmsMediaItem } from "@/lib/cms/client";

const WORKS_DIR = path.join(process.cwd(), "content/works");

const RE_UNICODE_TEST = /u[0-9a-fA-F]{4}/;
const RE_UNICODE_REPLACE = /u([0-9a-fA-F]{4})/g;

/**
 * 壊れたUnicodeエスケープを復元
 */
function fixBrokenUnicodeUrl(url: string): string {
  if (!RE_UNICODE_TEST.test(url)) return url;
  const decoded = url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
  try {
    const u = new URL(decoded);
    u.pathname = u.pathname.split('/').map(s => encodeURIComponent(decodeURIComponent(s))).join('/');
    return u.toString();
  } catch {
    return decoded;
  }
}

type RawMedia = CmsMediaItem & { id?: string; src?: string };
type RawDetails = Record<string, string | undefined>;

/** CMS レスポンスの1件を Work 型に正規化 */
function parseCmsWork(item: CmsWork): Work | null {
  const title = item.title.trim();
  if (!item.slug || !title) return null;

  const tags = (item.tags ?? []).map((t) => String(t).trim()).filter(Boolean);

  const mediaRaw = (item.data.media ?? []) as RawMedia[];
  const media = mediaRaw
    .filter((m) => m?.src)
    .map((m, i) => ({
      id: m.id?.trim() || `media-${i + 1}`,
      type: (m.type === "video" ? "video" : "image") as "image" | "video",
      src: fixBrokenUnicodeUrl(m.src!),
      alt: m.alt ?? "",
      width: m.width ?? 1280,
      height: m.height ?? 800,
      ...(m.poster ? { poster: fixBrokenUnicodeUrl(m.poster) } : {}),
    }));

  if (media.length === 0) return null;

  const thumb = item.data.thumbnail as
    | { src?: string; alt?: string; width?: number; height?: number }
    | undefined;
  const thumbnail = thumb?.src
    ? {
        src: fixBrokenUnicodeUrl(thumb.src),
        alt: thumb.alt ?? "",
        width: thumb.width ?? 1280,
        height: thumb.height ?? 800,
      }
    : undefined;

  /* details: 全キー・バリューをダイナミックに取得（空文字は除外） */
  const rawDetails = item.data.details ?? {};
  const details: Record<string, string | undefined> = {};
  if (typeof rawDetails === "object" && !Array.isArray(rawDetails)) {
    for (const [k, v] of Object.entries(rawDetails)) {
      const val = String(v ?? "").trim();
      if (val) details[k] = val;
    }
  }

  return {
    slug: item.slug,
    date: item.date,
    title,
    tags,
    year: item.year,
    excerpt: item.excerpt || item.body,
    ...((() => {
      if (thumbnail) return { thumbnail };
      const firstImg = media.find((m) => m.type === "image");
      if (firstImg) return { thumbnail: { src: firstImg.src, alt: firstImg.alt, width: firstImg.width, height: firstImg.height } };
      const firstVideo = media.find((m) => m.type === "video" && m.src.includes("youtube"));
      if (firstVideo) {
        const match = firstVideo.src.match(/[?&]v=([^&]+)/);
        if (match) return { thumbnail: { src: `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`, alt: title, width: 480, height: 360 } };
      }
      return {};
    })()),
    details,
    media,
    ...(item.pinned ? { pinned: true } : {}),
  };
}

/** ローカル MD ファイルから Works を読み込む（フォールバック用） */
function loadWorksFromLocal(): Work[] {
  try {
    const files = fs
      .readdirSync(WORKS_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    if (files.length === 0) return [];

    const works: Work[] = [];
    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(WORKS_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const work = parseLocalWork(slug, data, content);
      if (work) works.push(work);
    }
    works.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const pinned = works.filter((w) => w.pinned);
    const rest = works.filter((w) => !w.pinned);
    return [...pinned, ...rest];
  } catch {
    return [];
  }
}

/** ローカル MD ファイル1件をパース */
function parseLocalWork(
  slug: string,
  data: Record<string, unknown>,
  content: string,
): Work | null {
  const title = (String(data.title ?? "")).trim();
  if (!slug || !title) return null;

  const tags = ((data.tags ?? []) as string[])
    .map((t) => String(t).trim())
    .filter(Boolean);

  const media = ((data.media ?? []) as RawMedia[])
    .filter((m) => m?.src)
    .map((m, i) => ({
      id: m.id?.trim() || `media-${i + 1}`,
      type: (m.type === "video" ? "video" : "image") as "image" | "video",
      src: fixBrokenUnicodeUrl(m.src!),
      alt: m.alt ?? "",
      width: m.width ?? 1280,
      height: m.height ?? 800,
      ...(m.poster ? { poster: fixBrokenUnicodeUrl(m.poster) } : {}),
    }));

  if (media.length === 0) return null;

  const thumb = data.thumbnail as
    | { src?: string; alt?: string; width?: number; height?: number }
    | undefined;
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

/** Works 全件取得
 *  1. CMS API → 2. ローカル MD → 3. モックデータ
 */
export const getWorks = cache(async (): Promise<Work[]> => {
  // 1. CMS API を試みる
  try {
    const items = await fetchCms<CmsWork[]>("works.php");
    if (Array.isArray(items) && items.length > 0) {
      const works: Work[] = [];
      for (const item of items) {
        const w = parseCmsWork(item);
        if (w) works.push(w);
      }
      if (works.length > 0) {
        const pinned = works.filter((w) => w.pinned);
        const rest = works.filter((w) => !w.pinned);
        return [...pinned, ...rest];
      }
    }
  } catch {
    // CMS 未到達時はフォールバックへ
  }

  // 2. ローカル MD ファイル
  const local = loadWorksFromLocal();
  if (local.length > 0) return local;

  // 3. モックデータ
  return fallbackWorks;
});

/** slug 指定で1件取得 */
export const getWorkBySlug = cache(
  async (slug: string): Promise<Work | undefined> => {
    const all = await getWorks();
    return all.find((w) => w.slug === slug);
  },
);
