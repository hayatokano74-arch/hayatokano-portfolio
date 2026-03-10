/**
 * Garden ノード＆リンクキャッシュ生成スクリプト
 *
 * 1. Markdown → HTML の変換をビルド時に実行 → .garden-nodes-cache.json
 * 2. リンクスキャンをビルド時に実行 → .garden-links-cache.json
 *
 * ランタイムではキャッシュを読むだけで全処理をスキップする。
 */

import fs from "fs";
import path from "path";
import { getAllNodes } from "../src/lib/garden/reader";
import { scanAllLinksForPrebuild } from "../src/lib/garden/backlinks";

const NODES_PATH = path.join(process.cwd(), ".garden-nodes-cache.json");
const NODES_TMP_PATH = "/tmp/garden-nodes-cache.json";

function safeWrite(filePath: string, json: string) {
  try { fs.writeFileSync(filePath, json, "utf-8"); } catch {}
}

async function main() {
  console.log("[prebuild] Garden ノード＆リンクキャッシュを生成します...");
  const start = Date.now();

  try {
    /* 1. ノードキャッシュ（HTML変換済み） */
    const nodes = await getAllNodes();
    const nodesJson = JSON.stringify(nodes);
    safeWrite(NODES_PATH, nodesJson);
    safeWrite(NODES_TMP_PATH, nodesJson);
    const nodesSizeMB = (nodesJson.length / 1024 / 1024).toFixed(1);
    console.log(`[prebuild] ノードキャッシュ: ${nodes.length} ノード, ${nodesSizeMB}MB`);

    /* 2. リンクキャッシュ */
    const links = await scanAllLinksForPrebuild();
    console.log(`[prebuild] リンクキャッシュ: ${links.length} リンク`);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[prebuild] 完了: ${elapsed}秒`);
  } catch (error) {
    console.error("[prebuild] キャッシュ生成に失敗:", error);

    if (fs.existsSync(NODES_PATH)) {
      console.log("[prebuild] 既存のキャッシュを使用します");
    } else {
      console.warn("[prebuild] キャッシュなし — ランタイムで毎回処理が走ります");
    }
  }
}

main();
