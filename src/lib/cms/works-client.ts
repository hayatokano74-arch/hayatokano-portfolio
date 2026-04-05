"use client";

/**
 * Works クライアントサイドデータ取得
 * CMS API から直接取得し、Work型に正規化する。
 */

import type { Work } from "@/lib/types";
import type { CmsWork, CmsMediaItem } from "./client";
import { fetchCmsClient } from "./use-cms";

const RE_UNICODE_TEST = /u[0-9a-fA-F]{4}/;
const RE_UNICODE_REPLACE = /u([0-9a-fA-F]{4})/g;

function fixBrokenUnicodeUrl(url: string): string {
  if (!RE_UNICODE_TEST.test(url)) return url;
  const decoded = url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
  /* 日本語文字をURLエンコード（パス部分のみ） */
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

function parseCmsWork(item: CmsWork): Work | null {
  const title = item.title.trim();
  if (!item.slug || !title) return null;

  const tags = (item.tags ?? []).map((t) => String(t).trim()).filter(Boolean);
  const mediaRaw = (item.data.media ?? []) as RawMedia[];
  const media = mediaRaw
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

/** CMS API から全 Works を取得 */
export async function fetchWorksFromCms(): Promise<Work[]> {
  const items = await fetchCmsClient<CmsWork[]>("works.php");
  const works: Work[] = [];
  for (const item of items) {
    const w = parseCmsWork(item);
    if (w) works.push(w);
  }
  const pinned = works.filter((w) => w.pinned);
  const rest = works.filter((w) => !w.pinned);
  return [...pinned, ...rest];
}
