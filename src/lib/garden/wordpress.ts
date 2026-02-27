/**
 * WordPress REST API から Garden 投稿を取得し、
 * GardenFile 形式に変換して既存のパイプラインに流す。
 *
 * Garden カテゴリ (ID: 52) 配下の投稿のみ取得。
 */

import type { GardenFile } from "./dropbox";

/** Garden 親カテゴリ ID（WP側で作成済み） */
const GARDEN_CATEGORY_ID = 52;

/** WP REST API のベースURL */
function getWpApiBase(): string | null {
  const url =
    (process.env.WP_BASE_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_WP_BASE_URL ?? "").trim();
  if (!url) return null;
  return `${url.replace(/\/$/, "")}/wp-json`;
}

/** WP Application Password 認証ヘッダー */
function getAuthHeader(): string | null {
  const user = (process.env.WP_APP_USER ?? "").trim();
  const pass = (process.env.WP_APP_PASSWORD ?? "").trim();
  if (!user || !pass) return null;
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

/** WP投稿の型（REST API レスポンス） */
interface WpPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string; raw?: string };
  date: string;
  modified: string;
  status: string;
  categories: number[];
}

/**
 * WP から Garden カテゴリの全投稿を取得し、GardenFile[] に変換。
 * context=edit で raw content（マークダウン）を取得する。
 */
export async function fetchGardenFromWP(): Promise<GardenFile[]> {
  const base = getWpApiBase();
  if (!base) {
    console.log("[Garden/WP] WP_BASE_URL 未設定 — スキップ");
    return [];
  }

  const auth = getAuthHeader();
  const headers: Record<string, string> = {};
  if (auth) headers["Authorization"] = auth;

  const allPosts: WpPost[] = [];
  let page = 1;
  const perPage = 100;

  /* ページネーションで全件取得 */
  while (true) {
    /* context=view は認証不要、publish のみ取得 */
    const url = `${base}/wp/v2/posts?categories=${GARDEN_CATEGORY_ID}&per_page=${perPage}&page=${page}&status=publish&orderby=date&order=desc`;

    try {
      const res = await fetch(url, {
        headers,
        next: { revalidate: 60 }, /* 1分キャッシュ（ISR） */
      });

      if (!res.ok) {
        if (res.status === 400) break; /* ページ超過 */
        console.error(`[Garden/WP] API エラー: ${res.status}`);
        break;
      }

      const posts = (await res.json()) as WpPost[];
      if (posts.length === 0) break;

      allPosts.push(...posts);

      /* 全ページ取得済み？ */
      const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
      if (page >= totalPages) break;
      page++;
    } catch (e) {
      console.error("[Garden/WP] 通信エラー:", e);
      break;
    }
  }

  console.log(`[Garden/WP] ${allPosts.length} 件取得`);

  /* WpPost → GardenFile に変換 */
  return allPosts.map((post) => {
    const date = post.date.slice(0, 10); /* YYYY-MM-DD */
    const title = decodeHtmlEntities(post.title.rendered);

    /* rendered HTML からプレーンテキストに変換（context=view では raw が使えない） */
    let content = stripHtml(post.content.rendered);

    /* タイトルと日付をフロントマター風に先頭に付与（reader.ts のパーサーが処理できるように） */
    const header = `title: ${title}\ndate: ${date}\n\n`;
    content = header + content;

    return {
      path: `/${date.replace(/-/g, ".")}.md`,
      filename: `${date.replace(/-/g, ".")}.md`,
      content,
      modifiedAt: new Date(post.modified).getTime(),
    };
  });
}

/** HTMLエンティティをデコード */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

/** HTMLタグを除去（rendered → プレーンテキスト） */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}
