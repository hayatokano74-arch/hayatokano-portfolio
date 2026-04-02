/* Garden ファイル取得 + キャッシュ管理
   データソース: ローカル content/garden/*.md を優先し、なければ WP API にフォールバック
   キャッシュ: ビルド時に .garden-cache.json に保存し、ランタイムはキャッシュから読む */

import fs from "fs";
import path from "path";

// ============================================================
// ローカル MDX ファイル読み込み（優先データソース）
// content/garden/*.md が存在する場合はこちらを使用する。
// ============================================================

const LOCAL_CONTENT_DIR = path.join(process.cwd(), "content", "garden");

/**
 * content/garden/*.md からすべての GardenFile を読み込む。
 * ファイルが存在しない場合は空配列を返す。
 */
function readLocalGardenFiles(): GardenFile[] {
  try {
    if (!fs.existsSync(LOCAL_CONTENT_DIR)) return [];
    const entries = fs.readdirSync(LOCAL_CONTENT_DIR, { withFileTypes: true });
    const files: GardenFile[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filepath = path.join(LOCAL_CONTENT_DIR, entry.name);
      const content = fs.readFileSync(filepath, "utf-8");
      const stat = fs.statSync(filepath);
      files.push({
        path: `/${entry.name}`,
        filename: entry.name,
        content,
        modifiedAt: stat.mtimeMs,
      });
    }

    // 新しい順（ファイル名降順）
    files.sort((a, b) => b.filename.localeCompare(a.filename));
    return files;
  } catch {
    return [];
  }
}

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

/** キャッシュの有効期限（ミリ秒）— 1時間 */
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Garden ファイルを取得する
 *
 * 優先順位:
 * 1. content/garden/*.md（ローカルMDXファイル）— 移行完了後はこちらが使われる
 * 2. WP API（ローカルファイルが0件の場合のフォールバック）
 * 3. JSONキャッシュ（WP API失敗時のフォールバック）
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  // 1. ローカル MDX ファイルが存在する場合は優先使用（WP API 不要）
  const localFiles = readLocalGardenFiles();
  if (localFiles.length > 0) {
    console.log(`[Garden] ローカルファイル: ${localFiles.length} 件`);
    return localFiles;
  }

  // 2. ローカルファイルが0件 → WP API にフォールバック
  console.log("[Garden] ローカルファイルなし → WP API にフォールバック");

  // JSONキャッシュが新鮮（1時間以内）ならそのまま使う
  const cacheAge = getCacheAge();
  const isFresh = cacheAge > 0 && (Date.now() - cacheAge) < CACHE_MAX_AGE_MS;

  if (isFresh) {
    const cached = readCache();
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  // WP API から取得
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
