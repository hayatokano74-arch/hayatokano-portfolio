/**
 * Garden キャッシュ生成スクリプト
 *
 * WordPress API から全記事を取得し、.garden-cache.json に保存する。
 * next build はこのキャッシュファイルからデータを読み取り、
 * ランタイムでは WP API を直接呼ばない（ISR 再検証時を除く）。
 *
 * prebuild で自動実行される（generate-search-index.ts より先に実行）。
 */

import { fetchAllGardenFiles } from "../src/lib/garden/cache";

async function main() {
  console.log("[prebuild] Garden キャッシュを生成します...");

  try {
    const files = await fetchAllGardenFiles();
    console.log(`[prebuild] 完了: ${files.length} ファイルをキャッシュしました`);
  } catch (error) {
    console.error("[prebuild] WordPress API からの取得に失敗:", error);

    // キャッシュファイルが既に存在する場合は問題なし
    const fs = await import("fs");
    const path = await import("path");
    const cachePath = path.join(process.cwd(), ".garden-cache.json");
    if (fs.existsSync(cachePath)) {
      console.log("[prebuild] 既存のキャッシュファイルを使用します");
    } else {
      console.error("[prebuild] キャッシュファイルが存在しません。ビルドは失敗する可能性があります。");
      process.exit(1);
    }
  }
}

main();
