/* Dropbox API クライアント — Garden ファイルの取得 */

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
    throw new Error(`Dropbox トークン更新失敗: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    // 有効期限の5分前に更新する
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}

// --- ファイル一覧取得 ---

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

// --- ファイルダウンロード ---

/** JSON 文字列内の非 ASCII 文字を \uXXXX にエスケープ（HTTP ヘッダー用） */
function asciiSafeJson(obj: object): string {
  return JSON.stringify(obj).replace(/[\u0080-\uffff]/g, (c) =>
    `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** 1ファイルの内容をダウンロード */
async function downloadFile(filePath: string): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": asciiSafeJson({ path: filePath }),
    },
  });

  if (!res.ok) {
    throw new Error(`Dropbox download 失敗: ${res.status} — ${filePath}`);
  }

  return res.text();
}

// --- メインの取得関数 ---

/** 除外するディレクトリ名 */
const EXCLUDED_DIRS = new Set(["templates", ".obsidian", ".trash"]);

/**
 * Dropbox App フォルダ内の全 Garden ファイルを取得する。
 * テンプレート、.obsidian、隠しファイルは除外。
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  const entries = await listAllEntries();

  // .md ファイルだけをフィルタ（除外ディレクトリ内のものはスキップ）
  const mdEntries = entries.filter((e) => {
    if (e[".tag"] !== "file") return false;
    if (!e.name.endsWith(".md")) return false;
    // パスの各セグメントを確認
    const segments = e.path_lower.split("/").filter(Boolean);
    for (const seg of segments) {
      if (seg.startsWith(".") || EXCLUDED_DIRS.has(seg)) return false;
    }
    return true;
  });

  // 全ファイルを並列ダウンロード
  const files = await Promise.all(
    mdEntries.map(async (entry): Promise<GardenFile> => {
      const content = await downloadFile(entry.path_lower);
      return {
        path: entry.path_display,
        filename: entry.name,
        content,
        modifiedAt: entry.server_modified
          ? new Date(entry.server_modified).getTime()
          : Date.now(),
      };
    }),
  );

  return files;
}
