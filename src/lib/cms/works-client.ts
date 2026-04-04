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
  return url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
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

  const d = (item.data.details ?? {}) as RawDetails;
  return {
    slug: item.slug,
    date: item.date,
    title,
    tags,
    year: item.year,
    excerpt: item.excerpt || item.body,
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
