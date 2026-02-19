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
import type { GardenNode, GardenFrontmatter, GardenNodeType } from "./types";

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");

/** 全ノードのslugセットを取得（ブラケットリンク解決用） */
function getAllSlugs(): Set<string> {
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

  // 抜粋: 最初の段落からHTMLタグを除去し、80文字に切る
  const plainText = content.replace(/\[([^\]]+)\]/g, "$1").replace(/\n/g, " ").trim();
  const excerpt = plainText.length > 80 ? plainText.slice(0, 80) + "…" : plainText;

  return {
    slug: titleToSlug(fm.title),
    title: fm.title,
    date: fm.date,
    tags: fm.tags ?? [],
    type: (fm.type ?? "note") as GardenNodeType,
    contentHtml,
    excerpt,
  };
}

/** 全ノードを取得（日付降順） */
export async function getAllNodes(): Promise<GardenNode[]> {
  if (!fs.existsSync(GARDEN_DIR)) return [];
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const existingSlugs = getAllSlugs();

  const nodes = await Promise.all(
    files.map((file) => parseFile(path.join(GARDEN_DIR, file), existingSlugs)),
  );

  return nodes.sort((a, b) => (a.date > b.date ? -1 : 1));
}

/** slugで1ノードを取得 */
export async function getNodeBySlug(slug: string): Promise<GardenNode | null> {
  if (!fs.existsSync(GARDEN_DIR)) return null;
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const existingSlugs = getAllSlugs();

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
