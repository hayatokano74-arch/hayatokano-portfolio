#!/usr/bin/env node
/**
 * Garden記事をWordPressへ一括移行するスクリプト
 *
 * - .garden-cache.json（Dropboxキャッシュ）から全記事を読み込み
 * - WP REST API経由でpostとして投稿
 * - カテゴリ: Garden (ID: 52)
 * - 並列リクエスト（5並列）で高速化
 * - 既存投稿の重複チェック付き
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

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
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    vars[key] = value;
  }
  return vars;
}

const env = loadEnv();
const WP_BASE_URL = env.WP_BASE_URL || "https://wp.hayatokano.com";
const WP_USER = env.WP_APP_USER;
const WP_PASSWORD = env.WP_APP_PASSWORD;

if (!WP_USER || !WP_PASSWORD) {
  console.error("エラー: WP_APP_USER または WP_APP_PASSWORD が .env.local に見つかりません");
  process.exit(1);
}

const WP_API = `${WP_BASE_URL}/wp-json/wp/v2/posts`;
const GARDEN_CATEGORY_ID = 52;
const CONCURRENCY = 5;

// Basic認証ヘッダー
const authHeader =
  "Basic " + Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString("base64");

// --- キャッシュファイル読み込み ---
function loadCache() {
  const cachePath = resolve(PROJECT_ROOT, ".garden-cache.json");
  const raw = readFileSync(cachePath, "utf-8");
  return JSON.parse(raw);
}

// --- ファイル名から日付を抽出 (YYYY.MM.DD.md → YYYY-MM-DD) ---
function extractDateFromFilename(filename) {
  const match = filename.match(/^(\d{4})\.(\d{2})\.(\d{2})\.md$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

// --- contentからfrontmatterを解析 ---
function parseFrontmatter(content) {
  const lines = content.split("\n");
  const meta = {};
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // frontmatter行: "key:value" or "key: value"（先頭の連続行のみ）
    const fmMatch = line.match(/^(date|title)\s*:\s*(.+)$/);
    if (fmMatch) {
      meta[fmMatch[1]] = fmMatch[2].trim();
      bodyStartIndex = i + 1;
      continue;
    }
    // 空行はスキップ（frontmatter後の空行）
    if (line === "" && bodyStartIndex === i) {
      bodyStartIndex = i + 1;
      continue;
    }
    break;
  }

  const body = lines.slice(bodyStartIndex).join("\n").trim();
  return { meta, body };
}

// --- WPの既存Garden投稿を全件取得（重複チェック用） ---
async function fetchExistingPosts() {
  console.log("既存のGarden投稿を取得中...");
  const existing = new Map(); // title → post_id
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${WP_API}?categories=${GARDEN_CATEGORY_ID}&per_page=${perPage}&page=${page}&status=publish,draft,private&_fields=id,title`;
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) {
      // 400 = ページ範囲外
      if (res.status === 400) break;
      const text = await res.text();
      console.error(`既存投稿取得エラー (page ${page}): ${res.status} ${text}`);
      break;
    }

    const posts = await res.json();
    if (posts.length === 0) break;

    for (const post of posts) {
      existing.set(post.title.rendered, post.id);
    }

    const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1", 10);
    if (page >= totalPages) break;
    page++;
  }

  console.log(`既存Garden投稿: ${existing.size}件`);
  return existing;
}

// --- 1件の記事をWPに投稿 ---
async function createPost(title, content, dateStr) {
  const body = {
    title,
    content,
    status: "publish",
    categories: [GARDEN_CATEGORY_ID],
  };

  // 日付がある場合はWPのdate形式に変換
  if (dateStr) {
    // YYYY-MM-DD → YYYY-MM-DDT09:00:00 (JST午前9時をデフォルトに)
    body.date = `${dateStr}T09:00:00`;
  }

  const res = await fetch(WP_API, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WP API error ${res.status}: ${text.substring(0, 300)}`);
  }

  return await res.json();
}

// --- 並列実行ユーティリティ ---
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        const result = await tasks[currentIndex]();
        results[currentIndex] = { success: true, result };
      } catch (error) {
        results[currentIndex] = { success: false, error };
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

// --- メイン処理 ---
async function main() {
  console.log("=== Garden → WordPress 移行スクリプト ===\n");

  // キャッシュ読み込み
  const cache = loadCache();
  console.log(`キャッシュファイル: ${cache.length}件の記事`);

  // 既存投稿を取得
  const existingPosts = await fetchExistingPosts();

  // 投稿データを準備
  const postsToCreate = [];
  let skippedNoDate = 0;
  let skippedDuplicate = 0;

  for (const item of cache) {
    const dateFromFile = extractDateFromFilename(item.filename);
    const { meta, body } = parseFrontmatter(item.content);

    // 日付の決定: frontmatterのdate → ファイル名から抽出
    let dateStr = meta.date || dateFromFile;

    // 日付のフォーマットを統一 (YYYY-MM-DD)
    if (dateStr) {
      dateStr = dateStr.replace(/\./g, "-");
    }

    if (!dateStr) {
      skippedNoDate++;
      continue;
    }

    // タイトル: frontmatterのtitle → ファイル名の日付(YYYY.MM.DD形式)
    const title = meta.title || item.filename.replace(/\.md$/, "");

    // 重複チェック
    if (existingPosts.has(title)) {
      skippedDuplicate++;
      continue;
    }

    // コンテンツ: bodyがあればそれを使い、なければfrontmatter含む全文
    const content = body || item.content;

    postsToCreate.push({ title, content, dateStr, filename: item.filename });
  }

  console.log(`\n--- 移行計画 ---`);
  console.log(`投稿対象: ${postsToCreate.length}件`);
  console.log(`スキップ（重複）: ${skippedDuplicate}件`);
  console.log(`スキップ（日付なし）: ${skippedNoDate}件`);
  console.log(`並列数: ${CONCURRENCY}`);
  console.log(`\n移行を開始します...\n`);

  // タスク作成
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors = [];
  const startTime = Date.now();

  const tasks = postsToCreate.map((post) => {
    return async () => {
      const result = await createPost(post.title, post.content, post.dateStr);
      completed++;
      succeeded++;

      // 50件ごとに進捗表示
      if (completed % 50 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `  進捗: ${completed}/${postsToCreate.length}件 (${elapsed}秒経過, 成功: ${succeeded}, 失敗: ${failed})`
        );
      }

      return result;
    };
  });

  const results = await runWithConcurrency(tasks, CONCURRENCY);

  // 結果集計
  for (let i = 0; i < results.length; i++) {
    if (!results[i].success) {
      failed++;
      succeeded--; // workerで先にインクリメントしてるのでデクリメント
      errors.push({
        filename: postsToCreate[i].filename,
        error: results[i].error.message,
      });
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n=== 移行完了 ===`);
  console.log(`総処理時間: ${totalTime}秒`);
  console.log(`成功: ${succeeded}件`);
  console.log(`失敗: ${failed}件`);
  console.log(`スキップ（重複）: ${skippedDuplicate}件`);
  console.log(`スキップ（日付なし）: ${skippedNoDate}件`);

  if (errors.length > 0) {
    console.log(`\n--- エラー詳細 (先頭10件) ---`);
    for (const err of errors.slice(0, 10)) {
      console.log(`  ${err.filename}: ${err.error}`);
    }
    if (errors.length > 10) {
      console.log(`  ... 他 ${errors.length - 10}件`);
    }
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
