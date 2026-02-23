/* Markdownファイルの読み込み・パース（Dropbox API 経由） */

import matter from "gray-matter";
import { cache } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { remarkBracketLinks } from "./remark-bracket-links";
import { titleToSlug } from "./slug";
import { fetchAllGardenFiles, type GardenFile } from "./dropbox";
import type { GardenNode, GardenFrontmatter } from "./types";

// --- リクエスト単位のキャッシュ（同一レンダリング内で Dropbox API を1回だけ呼ぶ） ---
export const getGardenFiles = cache(async (): Promise<GardenFile[]> => {
  return fetchAllGardenFiles();
});

/** ファイル名から拡張子を除去してタイトルを推定 */
function titleFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

/** 日付文字列を YYYY-MM-DD に正規化 */
function normalizeDate(raw: string): string {
  // ドット区切り → ハイフン区切り
  const parts = raw.split(/[.\-/]/);
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return raw;
}

/**
 * ファイル名から日付を抽出する。
 * 対応パターン: "2025.12.05.md", "2025-12-05.md", "20251205.md"
 */
function dateFromFilename(filename: string): string | null {
  const base = filename.replace(/\.md$/, "");

  // "2025.12.05" or "2025-12-05"
  const dotDash = base.match(/^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
  if (dotDash) {
    const [, y, m, d] = dotDash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // "20251205"
  const compact = base.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) {
    const [, y, m, d] = compact;
    return `${y}-${m}-${d}`;
  }

  return null;
}

/** 前処理の結果 */
interface PreprocessResult {
  title: string | null;
  date: string | null;
  content: string;
}

/**
 * ファイル内容を前処理する。以下の順序で実行:
 *
 * 1. 先頭行がファイル名と一致する場合に除去（Ulysses 対策）
 * 2. 残りの先頭から title: / date: 行を抽出して除去
 *
 * frontmatter（---）がある場合は何もしない（gray-matter に任せる）。
 *
 * 例（Ulysses で日記）:
 *   ファイル名: "2025.12.20.md"
 *   本文: "2025.12.20\n今日は天気が良かった..."
 *   → 先頭行除去 → { title: null, date: null, content: "今日は天気が良かった..." }
 *
 * 例（Ulysses で名前付き投稿 + date:）:
 *   ファイル名: "散歩の記録.md"
 *   本文: "散歩の記録\ndate:2025-07-15\n今日は..."
 *   → 先頭行除去 → date: 抽出 → { title: null, date: "2025-07-15", content: "今日は..." }
 */
function preprocessContent(raw: string, filename: string): PreprocessResult {
  // frontmatter がある場合はそのまま返す
  if (raw.trimStart().startsWith("---")) {
    return { title: null, date: null, content: raw };
  }

  let remaining = raw;

  // 1. 先頭行がファイル名（拡張子なし）と一致する場合に除去
  const fileTitle = titleFromFilename(filename);
  const firstLineEnd = remaining.indexOf("\n");
  const firstLine = (firstLineEnd === -1 ? remaining : remaining.slice(0, firstLineEnd)).trim();
  if (firstLine === fileTitle) {
    remaining = firstLineEnd === -1 ? "" : remaining.slice(firstLineEnd + 1);
  }

  // 2. 先頭の連続した title:/date: 行を抽出（最大2行、順不同）
  let title: string | null = null;
  let date: string | null = null;

  for (let i = 0; i < 2; i++) {
    const dateMatch = remaining.match(/^date:\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*\n?/);
    if (dateMatch) {
      date = normalizeDate(dateMatch[1]);
      remaining = remaining.slice(dateMatch[0].length);
      continue;
    }

    const titleMatch = remaining.match(/^title:\s*(.+?)\s*\n/);
    if (titleMatch) {
      title = titleMatch[1];
      remaining = remaining.slice(titleMatch[0].length);
      continue;
    }

    break;
  }

  return { title, date, content: remaining };
}

/**
 * frontmatterを補完（title/dateがなければ本文先頭・ファイル名から自動生成）
 * タイトルの優先順位: frontmatter title → 本文先頭 title: → ファイル名
 * 日付の優先順位: frontmatter date → 本文先頭 date: → ファイル名の日付 → Dropbox 更新日時
 */
function completeFrontmatter(
  fm: GardenFrontmatter,
  file: GardenFile,
  inline: { title: string | null; date: string | null },
): GardenFrontmatter {
  const date =
    fm.date ||
    inline.date ||
    dateFromFilename(file.filename) ||
    new Date(file.modifiedAt).toISOString().slice(0, 10);

  const title =
    fm.title ||
    inline.title ||
    titleFromFilename(file.filename);

  return {
    ...fm,
    title,
    date,
    tags: fm.tags ?? [],
  };
}

/** MDファイルが存在するノードのslugセットを取得 */
async function getFileSlugs(files: GardenFile[]): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (const file of files) {
    const pre = preprocessContent(file.content, file.filename);
    const { data } = matter(pre.content);
    const fm = completeFrontmatter(data as GardenFrontmatter, file, pre);
    slugs.add(titleToSlug(fm.title));
  }
  return slugs;
}

/** Markdownを1ファイルパースしてGardenNodeを返す */
async function parseFile(
  file: GardenFile,
  existingSlugs: Set<string>,
): Promise<GardenNode> {
  const pre = preprocessContent(file.content, file.filename);
  const { data, content } = matter(pre.content);
  const fm = completeFrontmatter(data as GardenFrontmatter, file, pre);

  const result = await unified()
    .use(remarkParse)
    .use(remarkBracketLinks, { existingSlugs })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  const contentHtml = String(result);

  const plainText = content
    .replace(/(?<!\!)\[([^\]]+)\](?!\()/g, "$1")
    .replace(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu, " $1")
    .replace(/\n/g, " ")
    .trim();
  const excerpt = plainText.length > 80 ? plainText.slice(0, 80) + "…" : plainText;

  // gray-matterはYAMLの日付をDateオブジェクトに変換するため、文字列に正規化
  const rawDate: unknown = fm.date;
  const dateStr =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate ?? "");

  return {
    slug: titleToSlug(fm.title),
    title: fm.title,
    date: dateStr,
    tags: fm.tags ?? [],
    contentHtml,
    excerpt,
    mtime: file.modifiedAt,
  };
}

/** 全ノードを取得（MDファイルが存在するもののみ。日付降順） */
export async function getAllNodes(): Promise<GardenNode[]> {
  const files = await getGardenFiles();
  if (files.length === 0) return [];
  const existingSlugs = await getFileSlugs(files);

  const nodes = await Promise.all(
    files.map((file) => parseFile(file, existingSlugs)),
  );

  // 日付降順 → 同日ならファイル更新時刻が新しい方が上
  return nodes.sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return b.mtime - a.mtime;
  });
}

/** slugで1ノードを取得（MDファイルが存在するもののみ） */
export async function getNodeBySlug(slug: string): Promise<GardenNode | null> {
  const files = await getGardenFiles();
  if (files.length === 0) return null;
  const existingSlugs = await getFileSlugs(files);

  for (const file of files) {
    const pre = preprocessContent(file.content, file.filename);
    const { data } = matter(pre.content);
    const fm = completeFrontmatter(data as GardenFrontmatter, file, pre);
    if (titleToSlug(fm.title) === slug) {
      return parseFile(file, existingSlugs);
    }
  }
  return null;
}

/**
 * 全ページのslugリストを取得（generateStaticParams用）。
 * MDファイルのあるページ + リンクされているが未作成の仮想ページを含む。
 */
export async function getAllPageSlugs(): Promise<string[]> {
  const files = await getGardenFiles();
  const fileSlugs = await getFileSlugs(files);
  // backlinks の getAllLinkedSlugs は遅延importで循環参照を回避
  const { getAllLinkedSlugs } = await import("./backlinks");
  const linkedSlugs = await getAllLinkedSlugs();

  const all = new Set<string>(fileSlugs);
  for (const slug of linkedSlugs.keys()) {
    all.add(slug);
  }
  return [...all];
}

/**
 * 仮想ページのタイトルを取得。
 * MDファイルがないがリンクされているページのタイトルを返す。
 */
export async function getVirtualPageTitle(slug: string): Promise<string | null> {
  const { getAllLinkedSlugs } = await import("./backlinks");
  const linkedSlugs = await getAllLinkedSlugs();
  return linkedSlugs.get(slug) ?? null;
}

/**
 * 全ページの概要マップを取得（slug → { title, excerpt }）。
 * リンクカード表示用。MDファイルがあるページのみexcerptを持つ。
 */
export async function getNodeSummaryMap(): Promise<Map<string, { title: string; excerpt?: string; date?: string }>> {
  const map = new Map<string, { title: string; excerpt?: string; date?: string }>();
  const files = await getGardenFiles();

  for (const file of files) {
    const pre = preprocessContent(file.content, file.filename);
    const { data, content } = matter(pre.content);
    const fm = completeFrontmatter(data as GardenFrontmatter, file, pre);
    const slug = titleToSlug(fm.title);

    const plainText = content
      .replace(/(?<!\!)\[([^\]]+)\](?!\()/g, "$1")
      .replace(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu, " $1")
      .replace(/\n/g, " ")
      .trim();
    const excerpt = plainText.length > 80 ? plainText.slice(0, 80) + "…" : plainText;

    const rawDate: unknown = fm.date;
    const dateStr =
      rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : String(rawDate ?? "");
    map.set(slug, { title: fm.title, excerpt, date: dateStr });
  }
  return map;
}
