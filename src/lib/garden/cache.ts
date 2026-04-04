/* Garden ファイル取得 + キャッシュ管理
   データソース優先順位:
    1. PHP CMS API（https://hayatokano.com/_cms/api/garden.php?all=1）
    2. content/garden/*.md のローカルファイル（CMS が空 / 未到達時のフォールバック）
   キャッシュ: ビルド時に .garden-cache.json に保存し、ランタイムはキャッシュから読む */

import fs from "fs";
import path from "path";
import { fetchCms, type CmsGardenItem } from "@/lib/cms/client";

// ============================================================
// ローカル MDX ファイル読み込み（フォールバック）
// ============================================================

const LOCAL_CONTENT_DIR = path.join(process.cwd(), "content", "garden");

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

    files.sort((a, b) => b.filename.localeCompare(a.filename));
    return files;
  } catch {
    return [];
  }
}

/** Garden の1ファイル */
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
// ============================================================

const CACHE_PATH = path.join(process.cwd(), ".garden-cache.json");
const TMP_CACHE_PATH = "/tmp/garden-cache.json";

export function writeCache(files: GardenFile[]): void {
  const json = JSON.stringify(files);
  try {
    fs.writeFileSync(CACHE_PATH, json, "utf-8");
    console.log(`[Garden] キャッシュ保存: ${files.length} ファイル → ${CACHE_PATH}`);
  } catch {
    // ランタイムでは読み取り専用のため失敗する — 正常
  }
  try {
    fs.writeFileSync(TMP_CACHE_PATH, json, "utf-8");
  } catch {
    // /tmp/ 書き込み失敗 — 無視
  }
}

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

// ============================================================
// CMS API からの GardenFile 生成
// ============================================================

/**
 * CMS API レスポンス1件を GardenFile に変換する。
 * reader.ts の既存パイプライン（remark/unified）をそのまま利用するため、
 * YAML frontmatter 付きの合成 content 文字列を生成する。
 * frontmatter に slug: フィールドを含めることで reader.ts がそれを使用できる。
 */
function cmsItemToGardenFile(item: CmsGardenItem): GardenFile {
  // YAML frontmatter を合成（slug を明示的に含める）
  const tagsYaml =
    item.tags.length > 0
      ? `tags:\n${item.tags.map((t) => `  - ${t}`).join("\n")}\n`
      : "";

  const content =
    `---\nslug: ${item.slug}\ntitle: ${item.title}\ndate: ${item.date}\n${tagsYaml}---\n\n${item.body}`;

  return {
    path: `/${item.slug}.md`,
    filename: `${item.slug}.md`,
    content,
    modifiedAt: new Date(item.updated_at).getTime(),
  };
}

/**
 * Garden ファイルを取得する
 *
 * 優先順位:
 *  1. CMS API（?all=1 で全件取得）
 *  2. content/garden/*.md のローカルファイル
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  // 1. CMS API を試みる
  try {
    const items = await fetchCms<CmsGardenItem[]>("garden.php?all=1");
    if (Array.isArray(items) && items.length > 0) {
      const files = items.map(cmsItemToGardenFile);
      console.log(`[Garden] CMS API から取得: ${files.length} 件`);
      return files;
    }
  } catch {
    // CMS 未到達時はフォールバックへ
  }

  // 2. ローカル MD ファイル
  const localFiles = readLocalGardenFiles();
  console.log(`[Garden] ローカルファイル: ${localFiles.length} 件`);
  return localFiles;
}
