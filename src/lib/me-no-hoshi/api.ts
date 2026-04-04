/**
 * 目の星 — データ取得・フォールバック・キャッシュ付きエクスポート関数
 *
 * 優先順位:
 *  1. PHP CMS API（https://hayatokano.com/_cms/api/me-no-hoshi.php）
 *  2. content/me-no-hoshi/*.md のローカルファイル（CMS が空 / 未到達時のフォールバック）
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import type { MeNoHoshiPost, WpMeNoHoshiResponse } from "./types";
import { normalizePost } from "./normalize";
import { fetchCms, type CmsMeNoHoshi } from "@/lib/cms/client";

const ME_NO_HOSHI_DIR = path.join(process.cwd(), "content/me-no-hoshi");

/** グリッドカードの表示フィールド設定 */
export type MeNoHoshiGridField = {
  key: string;
  label: string;
  visible: boolean;
};

const defaultGridFields: MeNoHoshiGridField[] = [
  { key: "artist",    label: "ARTIST",    visible: true  },
  { key: "period",    label: "PERIOD",    visible: true  },
  { key: "open_date", label: "OPEN",      visible: true  },
  { key: "hours",     label: "HOURS",     visible: true  },
  { key: "closed",    label: "CLOSED",    visible: false },
  { key: "admission", label: "ADMISSION", visible: false },
  { key: "venue",     label: "VENUE",     visible: true  },
  { key: "address",   label: "ADDRESS",   visible: false },
  { key: "access",    label: "ACCESS",    visible: false },
];

export const getMeNoHoshiGridSettings = cache(
  async (): Promise<MeNoHoshiGridField[]> => defaultGridFields,
);

/** API取得失敗時のフォールバックデータ */
export const meNoHoshiFallbackPosts: MeNoHoshiPost[] = [
  {
    slug: "yume-no-niwa",
    date: "2024/05/01",
    title: "夢の庭",
    subtitle: "架空 太郎",
    tags: ["Exhibition", "Photography", "Personal"],
    year: "2024",
    excerpt: "本展は、居住と記憶の境界をめぐる写真展。展示は小さな空間の中で、光と距離に応答しながら構成された。",
    media: [
      {
        id: "hero-1",
        type: "image",
        src: "https://picsum.photos/seed/me-no-hoshi-hero-1/1600/1000",
        alt: "夢の庭 hero",
        width: 1600,
        height: 1000,
      },
    ],
    details: [
      { key: "artist",  label: "ARTIST", value: "架空 太郎" },
      { key: "period",  label: "PERIOD", value: "2024.05.01–2024.05.19" },
      { key: "hours",   label: "HOURS",  value: "12:00–18:00" },
      { key: "venue",   label: "VENUE",  value: "目の星（石巻）" },
    ],
    bio: "",
    pastExhibitions: [],
    snsLinks: [],
    statement: "本展は、居住と記憶の境界をめぐる写真展。",
    notice: "",
    showKeyVisuals: true,
    showPastWorks: true,
    showArchiveWorks: true,
    keyVisuals: [
      {
        id: "kv-1",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-hero-1/1600/1000",
          alt: "夢の庭 key visual 1",
          width: 1600,
          height: 1000,
        },
        caption: "",
      },
    ],
    heroCaption: "",
    pastWorks: [],
    archiveNote: "",
    archiveWorks: [],
  },
];

/** CMS レスポンスを WpMeNoHoshiResponse 形式に変換して normalizePost に渡す */
function cmsItemToPost(item: CmsMeNoHoshi): MeNoHoshiPost | null {
  const d = item.data as Record<string, unknown>;
  const wpLike: WpMeNoHoshiResponse = {
    slug: item.slug,
    title: item.title,
    date: item.date,
    year: item.year,
    tags: item.tags,
    excerpt: item.excerpt,
    // data フィールドに格納されたすべての追加情報を展開
    media: d.media as WpMeNoHoshiResponse["media"],
    details: d.details as WpMeNoHoshiResponse["details"],
    bio: typeof d.bio === "string" ? d.bio : undefined,
    // body を statement として使用（インポート時に本文として保存済み）
    statement: item.body || (typeof d.statement === "string" ? d.statement : undefined),
    notice: typeof d.notice === "string" ? d.notice : undefined,
    subtitle: typeof d.subtitle === "string" ? d.subtitle : undefined,
    keyVisuals: d.keyVisuals as WpMeNoHoshiResponse["keyVisuals"],
    heroCaption: typeof d.heroCaption === "string" ? d.heroCaption : undefined,
    pastWorks: d.pastWorks as WpMeNoHoshiResponse["pastWorks"],
    archiveNote: typeof d.archiveNote === "string" ? d.archiveNote : undefined,
    archiveWorks: d.archiveWorks as WpMeNoHoshiResponse["archiveWorks"],
    showKeyVisuals: typeof d.showKeyVisuals === "boolean" ? d.showKeyVisuals : undefined,
    showPastWorks: typeof d.showPastWorks === "boolean" ? d.showPastWorks : undefined,
    showArchiveWorks: typeof d.showArchiveWorks === "boolean" ? d.showArchiveWorks : undefined,
    pastExhibitions: d.pastExhibitions as WpMeNoHoshiResponse["pastExhibitions"],
    snsLinks: d.snsLinks as WpMeNoHoshiResponse["snsLinks"],
  };
  return normalizePost(wpLike);
}

/** ローカル MD ファイルから読み込む（フォールバック用） */
function loadMeNoHoshiPosts(): MeNoHoshiPost[] | null {
  try {
    const files = fs
      .readdirSync(ME_NO_HOSHI_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    if (files.length === 0) return null;

    const posts: MeNoHoshiPost[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(ME_NO_HOSHI_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const wpLike: WpMeNoHoshiResponse = {
        ...(data as WpMeNoHoshiResponse),
        statement: content.trim() || (data.statement as string | undefined),
        excerpt: content.trim() || (data.excerpt as string | undefined),
      };
      const post = normalizePost(wpLike);
      if (post) posts.push(post);
    }
    if (posts.length === 0) return null;
    posts.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    return posts;
  } catch {
    return null;
  }
}

/** 目の星 全件取得
 *  1. CMS API → 2. ローカル MD → 3. フォールバック
 */
export const getMeNoHoshiPosts = cache(async (): Promise<MeNoHoshiPost[]> => {
  // 1. CMS API
  try {
    const items = await fetchCms<CmsMeNoHoshi[]>("me-no-hoshi.php");
    if (Array.isArray(items) && items.length > 0) {
      const posts: MeNoHoshiPost[] = [];
      for (const item of items) {
        const p = cmsItemToPost(item);
        if (p) posts.push(p);
      }
      if (posts.length > 0) return posts;
    }
  } catch {
    // CMS 未到達時はフォールバックへ
  }

  // 2. ローカル MD ファイル
  const local = loadMeNoHoshiPosts();
  if (local) return local;

  // 3. フォールバック
  return meNoHoshiFallbackPosts;
});

/** slug 指定で1件取得 */
export const getMeNoHoshiBySlug = cache(
  async (slug: string): Promise<MeNoHoshiPost | undefined> => {
    const all = await getMeNoHoshiPosts();
    return all.find((p) => p.slug === slug);
  },
);
