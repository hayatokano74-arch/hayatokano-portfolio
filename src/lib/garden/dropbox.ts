/* Dropbox API クライアント — Garden ファイルの取得 */

import { unzipSync, strFromU8 } from "fflate";

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

// --- トークン管理 ---

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
    // 有効期限の5分前に更新する
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}

// --- ファイル一覧取得（更新日時の取得に使用） ---

interface DropboxEntry {
  ".tag": "file" | "folder";
  name: string;
  path_lower: string;
  path_display: string;
  server_modified?: string;
}

/** App フォルダ内の全エントリを再帰的に取得 */
async function listAllEntries(): Promise<DropboxEntry[]> {
  const token = await getAccessToken();
  const entries: DropboxEntry[] = [];

  const firstRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: "", recursive: true }),
  });

  if (!firstRes.ok) {
    throw new Error(`Dropbox list_folder 失敗: ${firstRes.status}`);
  }

  const firstData = await firstRes.json();
  entries.push(...firstData.entries);
  let cursor: string = firstData.cursor;
  let hasMore: boolean = firstData.has_more;

  while (hasMore) {
    const res = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor }),
    });

    if (!res.ok) {
      throw new Error(`Dropbox list_folder/continue 失敗: ${res.status}`);
    }

    const data = await res.json();
    entries.push(...data.entries);
    cursor = data.cursor;
    hasMore = data.has_more;
  }

  return entries;
}

// --- ZIP 一括ダウンロード ---

/** JSON 文字列内の非 ASCII 文字を \uXXXX にエスケープ（HTTP ヘッダー用） */
function asciiSafeJson(obj: object): string {
  return JSON.stringify(obj).replace(/[\u0080-\uffff]/g, (c) =>
    `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/**
 * Dropbox download_zip でフォルダを一括ダウンロードし、
 * .md ファイルの内容をメモリ上で展開して返す。
 */
async function downloadZip(folderPath: string): Promise<Map<string, string>> {
  const token = await getAccessToken();

  const res = await fetch("https://content.dropboxapi.com/2/files/download_zip", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": asciiSafeJson({ path: folderPath }),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`Dropbox download_zip 失敗: ${res.status} — ${body}`);
  }

  const buf = await res.arrayBuffer();
  const zipData = new Uint8Array(buf);
  const extracted = unzipSync(zipData);

  // ファイル名 → 内容のマップを構築
  const files = new Map<string, string>();
  for (const [path, data] of Object.entries(extracted)) {
    // .md ファイルのみ（ディレクトリエントリはサイズ0でスキップ）
    if (path.endsWith(".md") && data.length > 0) {
      files.set(path, strFromU8(data));
    }
  }

  return files;
}

/** 1ファイルの内容をダウンロード（フォールバック用・リトライ付き） */
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

// --- 並列実行ユーティリティ ---

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

// --- メインの取得関数 ---

/** 同時ダウンロード上限（フォールバック時） */
const DOWNLOAD_CONCURRENCY = 30;

/** 除外するディレクトリ名 */
const EXCLUDED_DIRS = new Set(["templates", ".obsidian", ".trash"]);

/** パスが除外対象かどうか判定 */
function isExcludedPath(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg.startsWith(".") || EXCLUDED_DIRS.has(seg)) return true;
  }
  return false;
}

/**
 * Dropbox App フォルダ内の全 Garden ファイルを取得する。
 *
 * 戦略:
 * 1. list_folder でファイル一覧＆更新日時を取得
 * 2. download_zip でフォルダを一括ダウンロード（1回の API 呼び出し）
 * 3. zip 内の .md ファイルを展開して返す
 * 4. download_zip が失敗した場合は個別ダウンロードにフォールバック
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  // 1. ファイル一覧取得（更新日時の取得に必要）
  const entries = await listAllEntries();
  console.log(`[Garden] list_folder: ${entries.length} エントリ`);

  // .md ファイルだけをフィルタ（除外ディレクトリ内のものはスキップ）
  const mdEntries = entries.filter((e) => {
    if (e[".tag"] !== "file") return false;
    if (!e.name.endsWith(".md")) return false;
    return !isExcludedPath(e.path_lower);
  });

  console.log(`[Garden] .md ファイル: ${mdEntries.length} 件`);

  // パス → 更新日時のマップ
  const modifiedMap = new Map<string, number>();
  for (const e of mdEntries) {
    modifiedMap.set(
      e.path_lower,
      e.server_modified ? new Date(e.server_modified).getTime() : Date.now(),
    );
  }

  // 2. download_zip で一括取得を試みる
  try {
    const zipFiles = await downloadZip("");
    console.log(`[Garden] download_zip: ${zipFiles.size} ファイル展開`);

    const files: GardenFile[] = [];
    for (const [zipPath, content] of zipFiles) {
      // zip 内のパスからファイル名とDropboxパスを復元
      // zip パスは "GardenSync/filename.md" or "GardenSync/日記/2025/12/filename.md" の形式
      const parts = zipPath.split("/");
      const filename = parts[parts.length - 1];

      // Dropbox パスに変換（zip の先頭フォルダ名を除去）
      const dropboxPath = "/" + parts.slice(1).join("/");
      const dropboxPathLower = dropboxPath.toLowerCase();

      // 除外対象のチェック
      if (isExcludedPath(dropboxPathLower)) continue;

      const modifiedAt = modifiedMap.get(dropboxPathLower) ?? Date.now();

      files.push({
        path: dropboxPath,
        filename,
        content,
        modifiedAt,
      });
    }

    console.log(`[Garden] zip 取得完了: ${files.length} ファイル`);
    return files;
  } catch (zipError) {
    console.warn(
      `[Garden] download_zip 失敗、個別ダウンロードにフォールバック:`,
      zipError instanceof Error ? zipError.message : zipError,
    );
  }

  // 3. フォールバック: 個別ダウンロード
  console.log(`[Garden] 個別ダウンロード開始 (${mdEntries.length} 件)`);
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
  console.log(`[Garden] 個別ダウンロード完了: ${files.length} ファイル`);

  return files;
}
