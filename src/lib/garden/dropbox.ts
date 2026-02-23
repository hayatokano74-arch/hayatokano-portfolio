/* Dropbox API クライアント — Garden ファイルの取得 + ファイルキャッシュ */

import fs from "fs";
import path from "path";

/** Dropbox から取得したファイル */
export interface GardenFile {
  /** Dropbox 上のパス */
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
// ビルド時に Dropbox から取得したデータを JSON ファイルに保存する。
// ランタイム（ISR）ではこのファイルから読み取り、Dropbox は呼ばない。
// ============================================================

/** キャッシュファイルのパス（プロジェクトルート） */
const CACHE_PATH = path.join(process.cwd(), ".garden-cache.json");

/** /tmp/ のフォールバックパス（Vercel ランタイムで書き込み可能） */
const TMP_CACHE_PATH = "/tmp/garden-cache.json";

/** キャッシュファイルに書き込む（ビルド時のみ成功） */
function writeCache(files: GardenFile[]): void {
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
function readCache(): GardenFile[] | null {
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

// ============================================================
// Dropbox API（ビルド時のみ使用）
// ============================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

/** refresh token からアクセストークンを取得（キャッシュ付き） */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN!,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Dropbox トークン更新失敗: ${res.status} — ${body}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}

interface DropboxEntry {
  ".tag": "file" | "folder";
  name: string;
  path_lower: string;
  path_display: string;
  server_modified?: string;
}

/** Dropbox API リクエスト（429 リトライ付き） */
async function dropboxFetch(
  url: string,
  options: RequestInit,
  label: string,
  retries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const wait = retryAfter
        ? Number(retryAfter) * 1000
        : Math.min(2000 * 2 ** attempt, 30000);
      console.warn(`[Garden] ${label}: 429 レート制限 — ${wait}ms 待機 (${attempt + 1}/${retries + 1})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    if (!res.ok) {
      throw new Error(`Dropbox ${label} 失敗: ${res.status}`);
    }

    return res;
  }

  throw new Error(`Dropbox ${label}: リトライ超過 (429)`);
}

/** App フォルダ内の全エントリを再帰的に取得 */
async function listAllEntries(): Promise<DropboxEntry[]> {
  const token = await getAccessToken();
  const entries: DropboxEntry[] = [];

  const firstRes = await dropboxFetch(
    "https://api.dropboxapi.com/2/files/list_folder",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: "", recursive: true }),
    },
    "list_folder",
  );

  const firstData = await firstRes.json();
  entries.push(...firstData.entries);
  let cursor: string = firstData.cursor;
  let hasMore: boolean = firstData.has_more;

  while (hasMore) {
    const res = await dropboxFetch(
      "https://api.dropboxapi.com/2/files/list_folder/continue",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cursor }),
      },
      "list_folder/continue",
    );

    const data = await res.json();
    entries.push(...data.entries);
    cursor = data.cursor;
    hasMore = data.has_more;
  }

  return entries;
}

/** JSON 文字列内の非 ASCII 文字を \uXXXX にエスケープ（HTTP ヘッダー用） */
function asciiSafeJson(obj: object): string {
  return JSON.stringify(obj).replace(/[\u0080-\uffff]/g, (c) =>
    `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** 1ファイルの内容をダウンロード（リトライ付き） */
async function downloadFile(filePath: string, retries = 2): Promise<string> {
  const token = await getAccessToken();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Dropbox-API-Arg": asciiSafeJson({ path: filePath }),
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 429) {
        const wait = Math.min(1000 * (attempt + 1), 5000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Dropbox download 失敗: ${res.status} — ${filePath}`);
      }

      return res.text();
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw new Error(`Dropbox download リトライ超過: ${filePath}`);
}

/** 同時実行数を制限しつつ全タスクを実行する */
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ============================================================
// メインの取得関数
// ============================================================

/** 同時ダウンロード上限 */
const DOWNLOAD_CONCURRENCY = 10;

/** 除外するディレクトリ名 */
const EXCLUDED_DIRS = new Set(["templates", ".obsidian", ".trash"]);

/** Dropbox から全ファイルを取得（内部用、キャッシュなし） */
async function fetchFromDropbox(): Promise<GardenFile[]> {
  const entries = await listAllEntries();
  console.log(`[Garden] list_folder: ${entries.length} エントリ`);

  const mdEntries = entries.filter((e) => {
    if (e[".tag"] !== "file") return false;
    if (!e.name.endsWith(".md")) return false;
    const segments = e.path_lower.split("/").filter(Boolean);
    for (const seg of segments) {
      if (seg.startsWith(".") || EXCLUDED_DIRS.has(seg)) return false;
    }
    return true;
  });

  console.log(`[Garden] .md: ${mdEntries.length} 件 — ダウンロード開始`);

  const tasks = mdEntries.map((entry) => async (): Promise<GardenFile> => {
    const content = await downloadFile(entry.path_lower);
    return {
      path: entry.path_display,
      filename: entry.name,
      content,
      modifiedAt: entry.server_modified
        ? new Date(entry.server_modified).getTime()
        : Date.now(),
    };
  });
  const files = await parallelLimit(tasks, DOWNLOAD_CONCURRENCY);
  console.log(`[Garden] ダウンロード完了: ${files.length} ファイル`);

  return files;
}

/**
 * Garden ファイルを取得する。
 *
 * 優先順位:
 *   1. ファイルキャッシュ（ビルド時に生成、デプロイに含まれる）
 *   2. Dropbox API（キャッシュがない場合のみ、ビルド時に実行される）
 *
 * ランタイムではキャッシュファイルが必ず存在するため Dropbox は呼ばれない。
 * ビルド時は Dropbox から取得 → キャッシュファイルに保存。
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  // 1. ファイルキャッシュがあればそれを使う（ランタイムはここで終了）
  const cached = readCache();
  if (cached) return cached;

  // 2. キャッシュがない場合のみ Dropbox から取得（ビルド時のみ到達）
  console.log("[Garden] キャッシュなし — Dropbox から取得します");
  const files = await fetchFromDropbox();

  // 3. キャッシュファイルに保存
  writeCache(files);

  return files;
}
