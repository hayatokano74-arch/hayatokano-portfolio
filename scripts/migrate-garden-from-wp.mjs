#!/usr/bin/env node
/**
 * Garden 移行スクリプト: WordPress → ローカル MDX
 *
 * WP REST API から Garden カテゴリ (ID: 52) の全投稿を取得し、
 * content/garden/YYYY-MM-DD.md として保存する。
 *
 * 使い方:
 *   node scripts/migrate-garden-from-wp.mjs
 *   node scripts/migrate-garden-from-wp.mjs --dry-run  # ファイル保存なしで確認
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const CONTENT_DIR = resolve(PROJECT_ROOT, "content", "garden");
const DRY_RUN = process.argv.includes("--dry-run");

// --- .env.local から認証情報を読み込み ---
function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  const vars = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    vars[trimmed.substring(0, eqIndex).trim()] = trimmed.substring(eqIndex + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const WP_BASE_URL = (env.WP_BASE_URL || "https://wp.hayatokano.com").replace(/\/$/, "");
const WP_USER = env.WP_APP_USER;
const WP_PASSWORD = env.WP_APP_PASSWORD;

if (!WP_USER || !WP_PASSWORD) {
  console.error("エラー: WP_APP_USER または WP_APP_PASSWORD が .env.local に見つかりません");
  process.exit(1);
}

const WP_API = `${WP_BASE_URL}/wp-json/wp/v2/posts`;
const GARDEN_CATEGORY_ID = 52;
const authHeader = "Basic " + Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString("base64");

// --- HTMLエンティティをデコード ---
function decodeHtml(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * rendered HTML → Markdown に変換
 *
 * WP の Garden 投稿は Markdown で書かれており、
 * レンダリング後も <p>![](url)</p> という形で Markdown 記法が残っている。
 * HTML タグを除去するだけで Markdown が復元できる。
 */
function htmlToMarkdown(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<p\s*[^>]*>/gi, "")
    .replace(/<\/p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => decodeHtml(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- WP から全 Garden 投稿を取得 ---
async function fetchAllPosts() {
  const allPosts = [];
  let page = 1;
  const perPage = 100;

  process.stdout.write("WP から取得中 ");

  while (true) {
    const url = `${WP_API}?categories=${GARDEN_CATEGORY_ID}&per_page=${perPage}&page=${page}&status=publish&orderby=date&order=asc`;
    const res = await fetch(url, { headers: { Authorization: authHeader } });

    if (!res.ok) {
      if (res.status === 400) break; // ページ範囲外
      console.error(`\nAPI エラー (page ${page}): ${res.status}`);
      break;
    }

    const posts = await res.json();
    if (posts.length === 0) break;

    allPosts.push(...posts);
    process.stdout.write(".");

    const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1", 10);
    if (page >= totalPages) break;
    page++;
  }

  console.log(` ${allPosts.length} 件取得完了`);
  return allPosts;
}

// --- 投稿1件を MDX ファイルの内容に変換 ---
function postToMdx(post) {
  const date = post.date.slice(0, 10); // YYYY-MM-DD
  const title = decodeHtml(post.title.rendered);
  const content = htmlToMarkdown(post.content.rendered);

  // tags は WP REST API の tags フィールド（ID配列）から取得できないため空配列
  // 必要な場合は別途 /wp/v2/tags で解決する
  const frontmatter = [
    "---",
    `title: "${title}"`,
    `date: "${date}"`,
    `tags: []`,
    "---",
    "",
  ].join("\n");

  return frontmatter + content + "\n";
}

// --- ファイル名の重複回避 ---
function resolveFilename(date, usedFilenames) {
  let filename = `${date}.md`;
  if (!usedFilenames.has(filename)) {
    usedFilenames.add(filename);
    return filename;
  }
  // 同日複数投稿: YYYY-MM-DD-2.md, YYYY-MM-DD-3.md ...
  let i = 2;
  while (true) {
    filename = `${date}-${i}.md`;
    if (!usedFilenames.has(filename)) {
      usedFilenames.add(filename);
      return filename;
    }
    i++;
  }
}

// --- メイン処理 ---
async function main() {
  console.log("=== Garden WP → MDX 移行スクリプト ===");
  if (DRY_RUN) console.log("（ドライランモード: ファイルは保存されません）\n");

  // content/garden ディレクトリを作成
  if (!DRY_RUN) {
    mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // WP から全投稿取得
  const posts = await fetchAllPosts();

  // 変換・保存
  let created = 0;
  let skipped = 0;
  const errors = [];
  const usedFilenames = new Set();

  for (const post of posts) {
    try {
      const date = post.date.slice(0, 10);
      const filename = resolveFilename(date, usedFilenames);
      const filepath = resolve(CONTENT_DIR, filename);

      // 既存ファイルはスキップ（上書きしない）
      if (!DRY_RUN && existsSync(filepath)) {
        skipped++;
        continue;
      }

      const mdx = postToMdx(post);

      if (DRY_RUN) {
        if (created < 3) {
          console.log(`\n--- ${filename} ---`);
          console.log(mdx.slice(0, 200) + (mdx.length > 200 ? "..." : ""));
        }
      } else {
        writeFileSync(filepath, mdx, "utf-8");
      }

      created++;

      // 進捗表示
      if (created % 100 === 0) {
        console.log(`  保存済み: ${created}/${posts.length} 件`);
      }
    } catch (err) {
      errors.push({ title: post.title.rendered, error: err.message });
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`保存: ${created} 件`);
  if (skipped > 0) console.log(`スキップ（既存）: ${skipped} 件`);
  if (errors.length > 0) {
    console.log(`エラー: ${errors.length} 件`);
    for (const e of errors.slice(0, 5)) {
      console.log(`  ${e.title}: ${e.error}`);
    }
  }
  if (!DRY_RUN) {
    console.log(`\n保存先: ${CONTENT_DIR}`);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
