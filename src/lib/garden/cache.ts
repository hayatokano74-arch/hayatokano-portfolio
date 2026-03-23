/* Garden ファイル取得 + キャッシュ管理
   データソース: WordPress REST API（Garden カテゴリ ID: 52）
   キャッシュ: ビルド時に .garden-cache.json に保存し、ランタイムはキャッシュから読む */

import fs from "fs";
import path from "path";

/** Garden の1ファイル（WordPress 投稿 or キャッシュから復元） */
export interface GardenFile {
  /** ファイルパス（互換用） */
  path: string;
  /** ファイル名（例: 2026.02.22.md） */
  filename: string;
  /** ファイルの中身（Markdown テキスト） */
  content: string;
  /** 更新日時（Unix ミリ秒） */
  modifiedAt: number;
}

// ============================================================
// ファイルキャッシュ
// ビルド時に WP API から取得したデータを JSON ファイルに保存する。
// ランタイム（ISR）ではこのファイルから読み取り、WP API は呼ばない。
// ============================================================

/** キャッシュファイルのパス（プロジェクトルート） */
const CACHE_PATH = path.join(process.cwd(), ".garden-cache.json");

/** /tmp/ のフォールバックパス（Vercel ランタイムで書き込み可能） */
const TMP_CACHE_PATH = "/tmp/garden-cache.json";

/** キャッシュファイルに書き込む（ビルド時のみ成功） */
export function writeCache(files: GardenFile[]): void {
  const json = JSON.stringify(files);
  // プロジェクトルート（ビルド時に書き込み可能、デプロイに含まれる）
  try {
    fs.writeFileSync(CACHE_PATH, json, "utf-8");
    console.log(`[Garden] キャッシュ保存: ${files.length} ファイル → ${CACHE_PATH}`);
  } catch {
    // ランタイムでは読み取り専用のため失敗する — 正常
  }
  // /tmp/（ランタイムでも書き込み可能、ただし揮発性）
  try {
    fs.writeFileSync(TMP_CACHE_PATH, json, "utf-8");
  } catch {
    // /tmp/ 書き込み失敗 — 無視
  }
}

/** キャッシュファイルから読み取る */
export function readCache(): GardenFile[] | null {
  for (const p of [CACHE_PATH, TMP_CACHE_PATH]) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, "utf-8")) as GardenFile[];
        if (data.length > 0) {
          console.log(`[Garden] キャッシュ読み込み: ${data.length} ファイル ← ${p}`);
          return data;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** キャッシュファイルを削除する（On-demand revalidate時に呼び出す） */
export function clearCache(): void {
  for (const p of [CACHE_PATH, TMP_CACHE_PATH]) {
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`[Garden] キャッシュ削除: ${p}`);
      }
    } catch {
      // 削除失敗 — 無視
    }
  }
}

/** キャッシュの最終更新時刻を取得（ミリ秒） */
function getCacheAge(): number {
  for (const p of [CACHE_PATH, TMP_CACHE_PATH]) {
    try {
      if (fs.existsSync(p)) {
        return fs.statSync(p).mtimeMs;
      }
    } catch {
      continue;
    }
  }
  return 0;
}

/** キャッシュの有効期限（ミリ秒）— 5分 */
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Garden ファイルを取得する（WordPress API のみ）
 *
 * キャッシュが5分以内ならキャッシュを使用。
 * 5分を超えたらWP APIから再取得してキャッシュを更新。
 * これにより新しい投稿が自動的に反映される。
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  // 1. キャッシュが新鮮（5分以内）ならそのまま使う
  const cacheAge = getCacheAge();
  const isFresh = cacheAge > 0 && (Date.now() - cacheAge) < CACHE_MAX_AGE_MS;

  if (isFresh) {
    const cached = readCache();
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  // 2. WP API から取得（キャッシュが古い or 存在しない場合）
  let wpFiles: GardenFile[] = [];
  try {
    const { fetchGardenFromWP } = await import("./wordpress");
    wpFiles = await fetchGardenFromWP();
    console.log(`[Garden] WordPress API: ${wpFiles.length} 件取得`);
  } catch (e) {
    console.error("[Garden] WordPress API 取得失敗:", e);
    // API失敗時は古いキャッシュにフォールバック
    const cached = readCache();
    if (cached && cached.length > 0) {
      console.log("[Garden] API失敗 → 古いキャッシュにフォールバック");
      return cached;
    }
  }

  // 3. 取得できたらキャッシュを更新
  if (wpFiles.length > 0) {
    writeCache(wpFiles);
    return wpFiles;
  }

  // 4. WP も空ならエラー
  console.error("[Garden] データソースが空です（WP API 0件、キャッシュなし）");
  return [];
}
