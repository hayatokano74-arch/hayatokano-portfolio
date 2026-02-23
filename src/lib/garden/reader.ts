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

/** frontmatterを補完（title/dateがなければファイル名・日付から自動生成） */
function completeFrontmatter(
  fm: GardenFrontmatter,
  file: GardenFile,
): GardenFrontmatter {
  return {
    ...fm,
    title: fm.title || titleFromFilename(file.filename),
    date: fm.date || new Date(file.modifiedAt).toISOString().slice(0, 10),
    tags: fm.tags ?? [],
  };
}

/** MDファイルが存在するノードのslugセットを取得 */
async function getFileSlugs(files: GardenFile[]): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (const file of files) {
    const { data } = matter(file.content);
    const fm = completeFrontmatter(data as GardenFrontmatter, file);
    slugs.add(titleToSlug(fm.title));
  }
  return slugs;
}

/** Markdownを1ファイルパースしてGardenNodeを返す */
async function parseFile(
  file: GardenFile,
  existingSlugs: Set<string>,
): Promise<GardenNode> {
  const { data, content } = matter(file.content);
  const fm = completeFrontmatter(data as GardenFrontmatter, file);

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
    const { data } = matter(file.content);
    const fm = completeFrontmatter(data as GardenFrontmatter, file);
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
    const { data, content } = matter(file.content);
    const fm = completeFrontmatter(data as GardenFrontmatter, file);
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
