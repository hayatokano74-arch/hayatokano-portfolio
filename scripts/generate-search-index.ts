/**
 * Garden 検索インデックス生成スクリプト
 * content/garden/*.md を読み込み、public/garden-search-index.json に出力する。
 * prebuild で自動実行される。
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
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

/** 除外するディレクトリ名 */
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

/** git の最終コミット時刻をYYYY-MM-DD形式で取得 */
function gitDateForFile(filePath: string): string {
  try {
    const ts = execSync(`git log -1 --format=%ct -- "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (ts) return new Date(parseInt(ts, 10) * 1000).toISOString().slice(0, 10);
  } catch {
    // フォールバック
  }
  return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
}

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

  const files = collectMdFiles(GARDEN_DIR);
  const docs: SearchDoc[] = [];

  for (const { filePath, filename } of files) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    const fm = data as { title?: string; date?: string | Date; tags?: string[] };

    // frontmatter がなくてもファイル名から自動補完
    const title = fm.title || filename.replace(/\.md$/, "");
    const rawDate = fm.date;
    const date =
      rawDate instanceof Date
        ? rawDate.toISOString().slice(0, 10)
        : rawDate
          ? String(rawDate)
          : gitDateForFile(filePath);

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

  // public ディレクトリが存在することを確認
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(docs, null, 2), "utf-8");
  console.log(`検索インデックスを生成しました: ${docs.length} ドキュメント → ${OUTPUT_PATH}`);
}

main();
