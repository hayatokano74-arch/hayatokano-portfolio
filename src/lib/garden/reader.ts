/* Markdownファイルの読み込み・パース */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { remarkBracketLinks } from "./remark-bracket-links";
import { titleToSlug } from "./slug";
import { getAllLinkedSlugs } from "./backlinks";
import type { GardenNode, GardenFrontmatter } from "./types";

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");

/** 除外するディレクトリ名（テンプレート等） */
const EXCLUDED_DIRS = new Set(["templates", ".obsidian"]);

/** content/garden/ 以下の全 .md ファイルを再帰的に収集 */
function collectMdFiles(dir: string): { filePath: string; filename: string }[] {
  if (!fs.existsSync(dir)) return [];
  const results: { filePath: string; filename: string }[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      results.push(...collectMdFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push({ filePath: path.join(dir, entry.name), filename: entry.name });
    }
  }

  return results;
}

/** ファイル名から拡張子を除去してタイトルを推定 */
function titleFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

/** ファイルの更新日をYYYY-MM-DD形式で取得 */
function dateFromFile(filePath: string): string {
  const stat = fs.statSync(filePath);
  return stat.mtime.toISOString().slice(0, 10);
}

/** frontmatterを補完（title/dateがなければファイル名・日付から自動生成） */
function completeFrontmatter(
  fm: GardenFrontmatter,
  filePath: string,
  filename: string,
): GardenFrontmatter {
  return {
    ...fm,
    title: fm.title || titleFromFilename(filename),
    date: fm.date || dateFromFile(filePath),
    tags: fm.tags ?? [],
  };
}

/** MDファイルが存在するノードのslugセットを取得 */
function getFileSlugs(): Set<string> {
  const files = collectMdFiles(GARDEN_DIR);
  const slugs = new Set<string>();
  for (const { filePath, filename } of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const fm = completeFrontmatter(data as GardenFrontmatter, filePath, filename);
    slugs.add(titleToSlug(fm.title));
  }
  return slugs;
}

/** Markdownを1ファイルパースしてGardenNodeを返す */
async function parseFile(filePath: string, filename: string, existingSlugs: Set<string>): Promise<GardenNode> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const fm = completeFrontmatter(data as GardenFrontmatter, filePath, filename);

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

  const mtime = fs.statSync(filePath).mtime.getTime();

  return {
    slug: titleToSlug(fm.title),
    title: fm.title,
    date: dateStr,
    tags: fm.tags ?? [],
    contentHtml,
    excerpt,
    mtime,
  };
}

/** 全ノードを取得（MDファイルが存在するもののみ。日付降順） */
export async function getAllNodes(): Promise<GardenNode[]> {
  const files = collectMdFiles(GARDEN_DIR);
  if (files.length === 0) return [];
  const existingSlugs = getFileSlugs();

  const nodes = await Promise.all(
    files.map(({ filePath, filename }) => parseFile(filePath, filename, existingSlugs)),
  );

  // 日付降順 → 同日ならファイル更新時刻が新しい方が上
  return nodes.sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1;
    return b.mtime - a.mtime;
  });
}

/** slugで1ノードを取得（MDファイルが存在するもののみ） */
export async function getNodeBySlug(slug: string): Promise<GardenNode | null> {
  const files = collectMdFiles(GARDEN_DIR);
  if (files.length === 0) return null;
  const existingSlugs = getFileSlugs();

  for (const { filePath, filename } of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const fm = completeFrontmatter(data as GardenFrontmatter, filePath, filename);
    if (titleToSlug(fm.title) === slug) {
      return parseFile(filePath, filename, existingSlugs);
    }
  }
  return null;
}

/**
 * 全ページのslugリストを取得（generateStaticParams用）。
 * MDファイルのあるページ + リンクされているが未作成の仮想ページを含む。
 */
export function getAllPageSlugs(): string[] {
  const fileSlugs = getFileSlugs();
  const linkedSlugs = getAllLinkedSlugs();

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
export function getVirtualPageTitle(slug: string): string | null {
  const linkedSlugs = getAllLinkedSlugs();
  return linkedSlugs.get(slug) ?? null;
}

/**
 * 全ページの概要マップを取得（slug → { title, excerpt }）。
 * リンクカード表示用。MDファイルがあるページのみexcerptを持つ。
 */
export function getNodeSummaryMap(): Map<string, { title: string; excerpt?: string; date?: string }> {
  const map = new Map<string, { title: string; excerpt?: string; date?: string }>();
  const files = collectMdFiles(GARDEN_DIR);

  for (const { filePath, filename } of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const fm = completeFrontmatter(data as GardenFrontmatter, filePath, filename);
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
