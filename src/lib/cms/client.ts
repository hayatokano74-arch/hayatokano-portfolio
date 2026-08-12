/**
 * PHP CMS API クライアント
 *
 * ビルド時に https://hayatokano.com/_cms/api/ からデータを取得する。
 * CMS_API_URL 環境変数で上書き可能（ローカル開発・テスト用）。
 *
 * レスポンス形式: { "success": true, "data": ... }
 */

const CMS_API_BASE = (
  process.env.CMS_API_URL ?? "https://media.hayatokano.com/_cms/api"
).replace(/\/$/, "");

/**
 * CMS API からデータを取得する汎用ヘルパー。
 * 失敗時はスロー → 呼び出し元でキャッチしてローカルファイルフォールバック。
 *
 * レスポンス形式は2種類に対応:
 *  - 生データ直接返し: [...] または {...}
 *  - ラッパー形式: { success: true, data: ... }
 */
export async function fetchCms<T>(path: string): Promise<T> {
  const url = `${CMS_API_BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    // 通常はCMS保存時のオンデマンド再検証（revalidatePath）で即座に反映される。
    // この1時間は、そのWebhookが何らかの理由で失敗した場合の保険（最悪でも
    // 1時間で自動的に最新化される。以前は24時間だったため、Webhook失敗時の
    // 影響が長時間残っていた）。
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`CMS API エラー: ${res.status} ${url}`);
  }
  const json = await res.json();
  /* ラッパー形式 { success, data } の場合 */
  if (json && typeof json === "object" && !Array.isArray(json) && "success" in json) {
    if (!json.success) {
      throw new Error(`CMS API レスポンスエラー: ${url}`);
    }
    return json.data as T;
  }
  /* 生データ直接返し */
  return json as T;
}

// ─── CMS レスポンス型定義 ─────────────────────────────────────

export type CmsWork = {
  id: number;
  slug: string;
  title: string;
  date: string;
  year: string;
  tags: string[];
  excerpt: string;
  pinned: number;
  data: {
    media?: CmsMediaItem[];
    details?: Record<string, string>;
    thumbnail?: { src?: string; alt?: string; width?: number; height?: number };
    [key: string]: unknown;
  };
  body: string;
  created_at: string;
  updated_at: string;
};

export type CmsMeNoHoshi = {
  id: number;
  slug: string;
  title: string;
  date: string;
  year: string;
  tags: string[];
  excerpt: string;
  data: Record<string, unknown>;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CmsNews = {
  id: number;
  slug: string;
  title: string;
  date: string;
  data: {
    id?: string;
    image?: { src: string; width?: number; height?: number };
    [key: string]: unknown;
  };
  body: string;
  created_at: string;
  updated_at: string;
};

export type CmsText = {
  id: number;
  slug: string;
  title: string;
  date: string;
  year: string;
  categories: string[];
  data: {
    toc?: { id: string; label: string }[];
    sections?: { id: string; heading: string; body?: string }[];
    [key: string]: unknown;
  };
  body: string;
  created_at: string;
  updated_at: string;
};

export type CmsAbout = {
  id: number;
  data: {
    statement?: string;
    photos?: { src: string; width?: number; height?: number }[];
    cv?: { year: string; content: string }[];
    [key: string]: unknown;
  };
  body: string;
  updated_at: string | null;
};

export type CmsGardenItem = {
  id: number;
  slug: string;
  date: string;
  title: string;
  tags: string[];
  type: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CmsMediaItem = {
  id?: string;
  type?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  poster?: string;
};
