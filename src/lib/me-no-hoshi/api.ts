/**
 * 目の星 — Markdownファイル読み込み・フォールバックデータ・キャッシュ付きエクスポート関数
 */
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import type { MeNoHoshiPost, WpMeNoHoshiResponse } from "./types";
import { normalizePost } from "./normalize";

const ME_NO_HOSHI_DIR = path.join(process.cwd(), "content/me-no-hoshi");

/** グリッドカードの表示フィールド設定 */
export type MeNoHoshiGridField = {
  key: string;
  label: string;
  visible: boolean;
};

/** グリッド設定のデフォルト値 */
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

/** グリッド表示設定（固定値を返す） */
export const getMeNoHoshiGridSettings = cache(async (): Promise<MeNoHoshiGridField[]> => {
  return defaultGridFields;
});

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
      { key: "artist", label: "ARTIST", value: "架空 太郎" },
      { key: "period", label: "PERIOD", value: "2024.05.01–2024.05.19" },
      { key: "hours", label: "HOURS", value: "12:00–18:00" },
      { key: "venue", label: "VENUE", value: "目の星（石巻）" },
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

/** Markdownファイルから目の星データを読み込む */
function loadMeNoHoshiPosts(): MeNoHoshiPost[] | null {
  try {
    const files = fs.readdirSync(ME_NO_HOSHI_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    if (files.length === 0) return null;

    const posts: MeNoHoshiPost[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(ME_NO_HOSHI_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      /* Markdown本文（statement）をフロントマターにマージしてnormalizePostに渡す */
      const wpLike: WpMeNoHoshiResponse = {
        ...(data as WpMeNoHoshiResponse),
        statement: content.trim() || (data.statement as string | undefined),
        excerpt: content.trim() || (data.excerpt as string | undefined),
      };

      const post = normalizePost(wpLike);
      if (post) posts.push(post);
    }

    return posts.length > 0 ? posts : null;
  } catch {
    return null;
  }
}

/** 目の星 全件取得（React.cache でリクエスト単位の重複排除） */
export const getMeNoHoshiPosts = cache(async (): Promise<MeNoHoshiPost[]> => {
  const posts = loadMeNoHoshiPosts();
  return posts ?? meNoHoshiFallbackPosts;
});

/** slug 指定で1件取得（React.cache でリクエスト単位の重複排除） */
export const getMeNoHoshiBySlug = cache(async (slug: string): Promise<MeNoHoshiPost | undefined> => {
  const all = await getMeNoHoshiPosts();
  return all.find((p) => p.slug === slug);
});
