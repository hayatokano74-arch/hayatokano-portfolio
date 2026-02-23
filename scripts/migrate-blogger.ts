#!/usr/bin/env npx tsx
/**
 * Blogger → Garden 移植スクリプト（Atom フィード版）
 *
 * 使い方:
 *   npx tsx scripts/migrate-blogger.ts
 *
 * Blogger の公開 Atom フィードから全投稿を取得し、
 * 画像を Xserver にアップロード、Markdown を Dropbox に配置する。
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, renameSync, rmSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";

// --- 設定 ---
const DRY_RUN = process.argv.includes("--dry-run");
const TEST_LIMIT = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "0", 10);
const BLOG_URL = "https://www.datelandscape.com";
const FEED_MAX = 150; // 1リクエストあたりの最大取得数
const DROPBOX_GARDEN = join(process.env.HOME!, "Dropbox/アプリ/GardenSync");
const XSERVER_IMAGE_DIR =
  "/home/hayatokano/hayatokano.com/public_html/wp/garden-images";
const IMAGE_BASE_URL = "https://wp.hayatokano.com/garden-images";
const TEMP_DIR = "/tmp/blogger-migration";
const XSERVER_HOST = "xserver";
const BATCH_SIZE = 100; // バッチあたりの処理件数（画像アップロード→削除の単位）

// --- Blogger Atom フィードから投稿を取得 ---

interface BlogPost {
  title: string;
  published: string;
  content: string;
  labels: string[];
  url: string;
}

/** Blogger Atom フィードから全投稿を取得（ページネーション対応） */
async function fetchAllPosts(): Promise<BlogPost[]> {
  const allPosts: BlogPost[] = [];
  let startIndex = 1;

  while (true) {
    const feedUrl = `${BLOG_URL}/feeds/posts/default?alt=json&max-results=${FEED_MAX}&start-index=${startIndex}`;
    console.log(`  フィード取得中... (${startIndex}件目〜)`);

    const res = await fetch(feedUrl);
    if (!res.ok) {
      throw new Error(`フィード取得失敗: ${res.status}`);
    }

    const data = await res.json();
    const entries = data.feed?.entry;
    if (!entries || entries.length === 0) break;

    for (const entry of entries) {
      const title = entry.title?.$t ?? "";
      const published = entry.published?.$t ?? "";
      const content = entry.content?.$t ?? "";
      const url =
        entry.link?.find((l: any) => l.rel === "alternate")?.href ?? "";

      // ラベル抽出
      const labels: string[] = [];
      if (entry.category) {
        for (const cat of entry.category) {
          if (cat.scheme === "http://www.blogger.com/atom/ns#") {
            labels.push(cat.term);
          }
        }
      }

      allPosts.push({ title, published, content, labels, url });
    }

    // 次のページ
    const totalResults = parseInt(data.feed?.openSearch$totalResults?.$t ?? "0", 10);
    startIndex += entries.length;
    if (startIndex > totalResults) break;

    // レート制限対策
    await new Promise((r) => setTimeout(r, 500));
  }

  return allPosts;
}

// --- 画像処理 ---

/** HTML から画像 URL を抽出 */
function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    let url = match[1];
    // Blogger の画像 URL を最大解像度に変換
    url = url.replace(/\/s\d+(-[a-z]+)?\//, "/s0/");
    url = url.replace(/\/w\d+-h\d+(-[a-z]+)?\//, "/s0/");
    urls.push(url);
  }
  return [...new Set(urls)];
}

/** 画像をダウンロード */
async function downloadImage(
  url: string,
  destPath: string,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) {
      console.error(`    ⚠ ダウンロード失敗 (${res.status}): ${url.slice(0, 80)}...`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(destPath, buffer);
    return true;
  } catch (e) {
    console.error(`    ⚠ ダウンロードエラー: ${(e as Error).message}`);
    return false;
  }
}

/** ダウンロードしたファイルの実際の形式を判定し、必要なら拡張子を修正 */
function fixExtension(filePath: string): string {
  try {
    const header = readFileSync(filePath).slice(0, 4);

    let realExt: string | null = null;
    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      realExt = ".jpg";
    }
    // PNG: 89 50 4E 47
    else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      realExt = ".png";
    }
    // GIF: 47 49 46
    else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
      realExt = ".gif";
    }
    // WebP: 52 49 46 46 (RIFF)
    else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
      realExt = ".webp";
    }

    if (realExt) {
      const currentExt = filePath.match(/\.[a-z]+$/i)?.[0]?.toLowerCase();
      if (currentExt && currentExt !== realExt && currentExt !== ".jpeg") {
        const newPath = filePath.replace(/\.[a-z]+$/i, realExt);
        renameSync(filePath, newPath);
        return newPath;
      }
    }
  } catch { /* 判定失敗時はそのまま */ }
  return filePath;
}

/** 画像ファイル名を生成（ブラウザ非対応の拡張子は .jpg にフォールバック） */
function imageFilename(url: string, index: number): string {
  try {
    const urlPath = new URL(url).pathname;
    let ext =
      urlPath.match(/\.(jpe?g|png|gif|webp|svg)/i)?.[0] ?? ".jpg";
    // ブラウザ非対応（tif, bmp等）は .jpg にフォールバック
    const name = basename(urlPath, urlPath.match(/\.[a-z]+$/i)?.[0] ?? "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 30);
    return `${name || `img${index}`}${ext}`;
  } catch {
    return `img${index}.jpg`;
  }
}

// --- HTML → Markdown 変換 ---

function htmlToMarkdown(html: string): string {
  let md = html;

  // <br> → 改行
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // <p>...</p> → 段落
  md = md.replace(/<p[^>]*>/gi, "\n");
  md = md.replace(/<\/p>/gi, "\n");

  // <div>...</div>
  md = md.replace(/<div[^>]*>/gi, "\n");
  md = md.replace(/<\/div>/gi, "\n");

  // <h1>〜<h6>
  for (let i = 1; i <= 6; i++) {
    const hashes = "#".repeat(i);
    md = md.replace(
      new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi"),
      `\n${hashes} $1\n`,
    );
  }

  // <strong>, <b>
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, "**$2**");

  // <em>, <i>
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, "*$2*");

  // <a href="...">text</a>
  md = md.replace(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  // <blockquote>
  md = md.replace(
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, text) => {
      return text
        .split("\n")
        .map((line: string) => `> ${line.trim()}`)
        .join("\n");
    },
  );

  // 残りの HTML タグを除去（img は既に変換済み）
  md = md.replace(/<[^>]+>/g, "");

  // HTML エンティティ
  md = md
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );

  // 連続する空行を最大2つに
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

// --- メイン処理 ---

async function main() {
  if (DRY_RUN) console.log("🔍 ドライランモード（アップロード・コピーをスキップ）\n");
  if (TEST_LIMIT > 0) console.log(`📋 テストモード: 最大 ${TEST_LIMIT} 件\n`);

  console.log("📡 Blogger フィードから投稿を取得中...\n");
  let posts = await fetchAllPosts();
  console.log(`\n  合計 ${posts.length} 件の投稿を取得\n`);

  if (posts.length === 0) {
    console.log("投稿が見つかりません。");
    process.exit(0);
  }

  // テストモード: 件数制限
  if (TEST_LIMIT > 0) {
    posts = posts.slice(0, TEST_LIMIT);
    console.log(`  テストモード: ${posts.length} 件に制限\n`);
  }

  // 一時ディレクトリ作成
  mkdirSync(TEMP_DIR, { recursive: true });
  mkdirSync(join(TEMP_DIR, "images"), { recursive: true });
  mkdirSync(join(TEMP_DIR, "markdown"), { recursive: true });

  // 統計
  let totalImages = 0;
  let downloadedImages = 0;
  let processedPosts = 0;

  // 日付の古い順にソート（同名ファイルの衝突を日付で管理）
  posts.sort(
    (a, b) => new Date(a.published).getTime() - new Date(b.published).getTime(),
  );

  // ファイル名の重複を管理
  const usedFilenames = new Set<string>();

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const date = new Date(post.published);
    if (isNaN(date.getTime())) {
      console.error(`  ⚠ 無効な日付 — スキップ: ${post.title}`);
      continue;
    }

    const dateStr = date.toISOString().slice(0, 10);
    // ファイル名用のドット区切り日付（サイト表示と一致させる）
    const dateDot = dateStr.replace(/-/g, ".");
    const yearMonth = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;

    // タイトルを整形（サフィックス除去 + ファイル名安全化）
    let rawTitle = (post.title || "untitled").trim();

    // 日付タイトル（例: "2024.12.12_日記"）からサフィックスを除去
    rawTitle = rawTitle.replace(/[_\s]+(日記|写真|メモ|雑記|記録)$/, "");

    const safeTitle = rawTitle
      .replace(/[\/\\:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60);

    // タイトルが日付パターンのみかどうか判定
    const isDateOnlyTitle = /^\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}$/.test(safeTitle)
      || safeTitle === dateStr
      || safeTitle === "untitled";

    // ファイル名: ドット区切り日付（Ulysses の慣習に合わせる）
    let mdFilename = isDateOnlyTitle
      ? `${dateDot}.md`
      : `${dateDot}_${safeTitle}.md`;
    let counter = 2;
    while (usedFilenames.has(mdFilename)) {
      mdFilename = isDateOnlyTitle
        ? `${dateDot}_${counter}.md`
        : `${dateDot}_${safeTitle}_${counter}.md`;
      counter++;
    }
    usedFilenames.add(mdFilename);

    console.log(
      `[${i + 1}/${posts.length}] ${dateStr} — ${isDateOnlyTitle ? "(日付のみ)" : safeTitle}`,
    );

    // 画像を抽出・ダウンロード
    const imageUrls = extractImageUrls(post.content);
    totalImages += imageUrls.length;

    const imageMap = new Map<string, string>();
    const imageDir = join(TEMP_DIR, "images", yearMonth);
    mkdirSync(imageDir, { recursive: true });

    for (let j = 0; j < imageUrls.length; j++) {
      const url = imageUrls[j];
      const fname = `${dateStr}_${String(j + 1).padStart(2, "0")}_${imageFilename(url, j)}`;
      let localPath = join(imageDir, fname);

      if (!existsSync(localPath)) {
        const ok = await downloadImage(url, localPath);
        if (ok) {
          downloadedImages++;
          // 拡張子が実際の形式と異なる場合に修正（.tif → .jpg 等）
          localPath = fixExtension(localPath);
        }
        // レート制限対策
        await new Promise((r) => setTimeout(r, 50));
      } else {
        downloadedImages++;
      }

      const actualFname = basename(localPath);
      const newUrl = `${IMAGE_BASE_URL}/${yearMonth}/${actualFname}`;
      imageMap.set(url, newUrl);
    }

    // HTML 内の画像を Markdown 画像に変換（URL を置換しつつ）
    let processedHtml = post.content;

    // <a> で囲まれた <img> のパターン（Blogger でよくある）
    processedHtml = processedHtml.replace(
      /<a[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*<\/a>/gi,
      (_, imgSrc) => {
        let src = imgSrc;
        src = src.replace(/\/s\d+(-[a-z]+)?\//, "/s0/");
        src = src.replace(/\/w\d+-h\d+(-[a-z]+)?\//, "/s0/");
        const newUrl = imageMap.get(src) ?? src;
        return `\n![](${newUrl})\n`;
      },
    );

    // 残りの <img>
    processedHtml = processedHtml.replace(
      /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
      (_, imgSrc) => {
        let src = imgSrc;
        src = src.replace(/\/s\d+(-[a-z]+)?\//, "/s0/");
        src = src.replace(/\/w\d+-h\d+(-[a-z]+)?\//, "/s0/");
        const newUrl = imageMap.get(src) ?? src;
        return `\n![](${newUrl})\n`;
      },
    );

    // HTML → Markdown 変換
    const bodyMd = htmlToMarkdown(processedHtml);

    // Markdown ファイル生成
    const lines: string[] = [];
    // date: は常に付与（コピー日付問題の対策）
    lines.push(`date:${dateStr}`);
    // 日付のみのタイトルでなければ title: を付与
    if (!isDateOnlyTitle) {
      lines.push(`title:${safeTitle}`);
    }
    lines.push("");
    lines.push(bodyMd);

    const mdPath = join(TEMP_DIR, "markdown", mdFilename);
    writeFileSync(mdPath, lines.join("\n"), "utf-8");
    processedPosts++;

    // バッチ処理: BATCH_SIZE件ごとに画像をアップロード→ローカル削除（ディスク節約）
    if (!DRY_RUN && processedPosts % BATCH_SIZE === 0) {
      console.log(`\n📤 バッチアップロード (${processedPosts}件目まで完了)...`);
      try {
        execSync(
          `rsync -avz --quiet ${TEMP_DIR}/images/ ${XSERVER_HOST}:${XSERVER_IMAGE_DIR}/`,
          { stdio: "inherit", timeout: 600000 },
        );
        // アップロード成功 → ローカル画像を削除してディスクを解放
        rmSync(join(TEMP_DIR, "images"), { recursive: true, force: true });
        mkdirSync(join(TEMP_DIR, "images"), { recursive: true });
        console.log(`  ✓ アップロード完了 — ローカル画像を削除\n`);
      } catch (e) {
        console.error(`  ⚠ バッチアップロード失敗 — ローカル画像を保持して続行`);
      }
    }
  }

  console.log("\n--- 変換完了 ---");
  console.log(`  投稿: ${processedPosts} 件`);
  console.log(`  画像: ${downloadedImages} / ${totalImages} 枚`);
  console.log(`  Markdown: ${TEMP_DIR}/markdown/`);

  if (DRY_RUN) {
    console.log(`  画像: ${TEMP_DIR}/images/\n`);
    console.log("🔍 ドライラン — アップロード・コピーをスキップ");
    console.log(`  Markdown 確認: ls ${TEMP_DIR}/markdown/`);
    console.log(`  画像 確認: ls ${TEMP_DIR}/images/\n`);
  } else {
    // 残りの画像をアップロード（最後のバッチ）
    console.log("\n📤 最終バッチの画像をアップロード中...");
    try {
      execSync(
        `rsync -avz --quiet ${TEMP_DIR}/images/ ${XSERVER_HOST}:${XSERVER_IMAGE_DIR}/`,
        { stdio: "inherit", timeout: 600000 },
      );
      rmSync(join(TEMP_DIR, "images"), { recursive: true, force: true });
      console.log("  ✓ アップロード完了\n");
    } catch (e) {
      console.error("  ⚠ アップロード失敗。手動で実行してください:");
      console.error(
        `  rsync -avz ${TEMP_DIR}/images/ ${XSERVER_HOST}:${XSERVER_IMAGE_DIR}/`,
      );
      console.log("");
    }

    // Dropbox にコピー
    console.log("📁 Markdown を Dropbox にコピー中...");
    try {
      mkdirSync(DROPBOX_GARDEN, { recursive: true });
      execSync(`cp "${TEMP_DIR}/markdown/"*.md "${DROPBOX_GARDEN}/"`, {
        stdio: "inherit",
      });
      console.log(`  ✓ ${DROPBOX_GARDEN}/ にコピー完了\n`);
    } catch (e) {
      console.error("  ⚠ コピー失敗。手動で実行してください:");
      console.error(
        `  cp "${TEMP_DIR}/markdown/"*.md "${DROPBOX_GARDEN}/"`,
      );
      console.log("");
    }
  }

  console.log("🎉 移植完了！");
  console.log("  サイトは約60秒後に自動更新されます（Vercel ISR）。");
  console.log(`  確認: https://hayatokano.com/garden`);
}

main().catch((e) => {
  console.error("エラー:", e);
  process.exit(1);
});
