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

/** MDファイルが存在するノードのslugセットを取得 */
function getFileSlugs(): Set<string> {
  if (!fs.existsSync(GARDEN_DIR)) return new Set();
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const slugs = new Set<string>();
  for (const file of files) {
    const raw = fs.readFileSync(path.join(GARDEN_DIR, file), "utf-8");
    const { data } = matter(raw);
    const fm = data as GardenFrontmatter;
    slugs.add(fm.title ? titleToSlug(fm.title) : file.replace(/\.md$/, ""));
  }
  return slugs;
}

/** Markdownを1ファイルパースしてGardenNodeを返す */
async function parseFile(filePath: string, existingSlugs: Set<string>): Promise<GardenNode> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const fm = data as GardenFrontmatter;

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
  };
}

/** 全ノードを取得（MDファイルが存在するもののみ。日付降順） */
export async function getAllNodes(): Promise<GardenNode[]> {
  if (!fs.existsSync(GARDEN_DIR)) return [];
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const existingSlugs = getFileSlugs();

  const results = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(GARDEN_DIR, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(raw);
      // frontmatterにtitleがないファイルはスキップ
      if (!(data as GardenFrontmatter).title) return null;
      return parseFile(filePath, existingSlugs);
    }),
  );
  const nodes = results.filter((n): n is GardenNode => n !== null);

  return nodes.sort((a, b) => (a.date > b.date ? -1 : 1));
}

/** slugで1ノードを取得（MDファイルが存在するもののみ） */
export async function getNodeBySlug(slug: string): Promise<GardenNode | null> {
  if (!fs.existsSync(GARDEN_DIR)) return null;
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const existingSlugs = getFileSlugs();

  for (const file of files) {
    const filePath = path.join(GARDEN_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    const fm = data as GardenFrontmatter;
    if (titleToSlug(fm.title) === slug) {
      return parseFile(filePath, existingSlugs);
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
  if (!fs.existsSync(GARDEN_DIR)) return map;

  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(GARDEN_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as GardenFrontmatter;
    // frontmatterにtitleがないファイルはスキップ
    if (!fm.title) continue;
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
