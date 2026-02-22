/**
 * Garden 検索インデックス生成スクリプト
 * content/garden/*.md を読み込み、public/garden-search-index.json に出力する。
 * prebuild で自動実行される。
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface SearchDoc {
  id: string;
  title: string;
  date: string;
  tags: string[];
  body: string;
}

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");
const OUTPUT_PATH = path.join(process.cwd(), "public", "garden-search-index.json");

function stripMarkdown(content: string): string {
  return content
    // ブラケットリンク [タイトル] → タイトル
    .replace(/(?<!\!)\[([^\]]+)\](?!\()/g, "$1")
    // ハッシュタグ #tag → tag
    .replace(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu, " $1")
    // 改行を空白に
    .replace(/\n/g, " ")
    .trim();
}

function main() {
  if (!fs.existsSync(GARDEN_DIR)) {
    console.log("content/garden/ が存在しません。空のインデックスを出力します。");
    fs.writeFileSync(OUTPUT_PATH, "[]", "utf-8");
    return;
  }

  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const docs: SearchDoc[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(GARDEN_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as { title: string; date: string; tags?: string[] };
    if (!fm.title) continue;

    docs.push({
      id: fm.title,
      title: fm.title,
      date: fm.date,
      tags: fm.tags ?? [],
      body: stripMarkdown(content),
    });
  }

  // 日付降順
  docs.sort((a, b) => (a.date > b.date ? -1 : 1));

  // public ディレクトリが存在することを確認
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(docs, null, 2), "utf-8");
  console.log(`検索インデックスを生成しました: ${docs.length} ドキュメント → ${OUTPUT_PATH}`);
}

main();
