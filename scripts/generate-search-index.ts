/**
 * Garden 検索インデックス生成スクリプト
 * Dropbox API からファイルを取得し、public/garden-search-index.json に出力する。
 * prebuild で自動実行される。
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fetchAllGardenFiles } from "../src/lib/garden/dropbox";

interface SearchDoc {
  id: string;
  title: string;
  date: string;
  tags: string[];
  body: string;
}

const OUTPUT_PATH = path.join(process.cwd(), "public", "garden-search-index.json");

function stripMarkdown(content: string): string {
  return content
    .replace(/(?<!\!)\[([^\]]+)\](?!\()/g, "$1")
    .replace(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu, " $1")
    .replace(/\n/g, " ")
    .trim();
}

async function main() {
  let files;
  try {
    files = await fetchAllGardenFiles();
  } catch (error) {
    console.error("Dropbox からファイルを取得できませんでした:", error);
    console.log("空のインデックスを出力します。");
    fs.writeFileSync(OUTPUT_PATH, "[]", "utf-8");
    return;
  }

  const docs: SearchDoc[] = [];

  for (const file of files) {
    const { data, content } = matter(file.content);
    const fm = data as { title?: string; date?: string | Date; tags?: string[] };

    const title = fm.title || file.filename.replace(/\.md$/, "");
    const rawDate = fm.date;
    const date =
      rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : rawDate
          ? String(rawDate)
          : new Date(file.modifiedAt).toISOString().slice(0, 10);

    docs.push({
      id: title,
      title,
      date,
      tags: fm.tags ?? [],
      body: stripMarkdown(content),
    });
  }

  // 日付降順
  docs.sort((a, b) => (a.date > b.date ? -1 : 1));

  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(docs, null, 2), "utf-8");
  console.log(`検索インデックスを生成しました: ${docs.length} ドキュメント → ${OUTPUT_PATH}`);
}

main();
