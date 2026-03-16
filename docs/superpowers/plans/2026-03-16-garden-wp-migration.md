# Garden WordPress 完全移行 実装計画

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garden のデータソースを Dropbox から WordPress に完全移行し、Ulysses → WP 直接投稿 → 自動反映のフローを実現する

**Architecture:** 既存の `wordpress.ts`（WP REST API 取得）を主データソースにし、`dropbox.ts` のフェッチロジックを段階的に除去。On-demand ISR で WP 投稿時に即時反映。1,079件の既存記事は `migrate-garden-to-wp.mjs` で一括移行。移行確認後に Dropbox コードを削除。

**Tech Stack:** Next.js 15 (App Router / ISR), WordPress REST API, TypeScript

---

## 前提条件

- WP Application Password は設定済み（`WP_APP_USER`, `WP_APP_PASSWORD`）
- WP Garden カテゴリ ID: 52
- 既存の `migrate-garden-to-wp.mjs` スクリプトが動作可能
- Dropbox の既存キャッシュファイル（`.garden-cache.json`）が存在

## リスク対策

| リスク | 対策 |
|---|---|
| WP 一括投稿で API が不安定 | 5並列制限（既存スクリプト）、50件ごとの進捗確認 |
| 移行後にデータ欠損 | 移行前にキャッシュファイルをバックアップ、WP 投稿数を照合 |
| Wiki リンクが壊れる | WP HTML → Markdown パース → リンク抽出の既存パイプライン維持 |
| 検索が壊れる | prebuild で検索インデックスを再生成 |
| 画像パスが変わる | `garden-images/` URL は WP メディアとは独立なので影響なし |
| On-demand ISR が失敗 | フォールバックとして ISR 3600s を維持 |
| 移行途中でサイトが壊れる | 全フェーズで git commit、ロールバック可能 |

---

## Chunk 1: バックアップと事前検証

### Task 1: バックアップ

**Files:**
- Read: `.garden-cache.json`, `.garden-nodes-cache.json`, `.garden-links-cache.json`

- [ ] **Step 1: キャッシュファイルをバックアップ**

```bash
cd ~/Projects/hayatokano-portfolio
mkdir -p .garden-backup
cp .garden-cache.json .garden-backup/
cp .garden-nodes-cache.json .garden-backup/
cp .garden-links-cache.json .garden-backup/
cp public/garden-search-index.json .garden-backup/
```

- [ ] **Step 2: 記事数を記録**

```bash
node -e "const d=require('./.garden-cache.json'); console.log('Dropbox記事数:', d.length)"
```

Expected: `Dropbox記事数: 1079`（前後の数字を記録）

- [ ] **Step 3: WP の既存 Garden 投稿数を確認**

```bash
curl -s "https://wp.hayatokano.com/wp-json/wp/v2/posts?categories=52&per_page=1" \
  -H "Authorization: Basic $(echo -n "$WP_APP_USER:$WP_APP_PASSWORD" | base64)" \
  -D - -o /dev/null 2>&1 | grep -i x-wp-total
```

Expected: `X-WP-Total: N`（現在の WP 投稿数を記録）

---

### Task 2: WP への一括移行実行

**Files:**
- Run: `scripts/migrate-garden-to-wp.mjs`

- [ ] **Step 1: 移行スクリプトのドライラン（最初の5件だけ確認）**

スクリプトの挙動を確認。既存スクリプトは重複チェック済みなので、既にWPにある記事はスキップされる。

```bash
cd ~/Projects/hayatokano-portfolio
node scripts/migrate-garden-to-wp.mjs 2>&1 | head -50
```

Expected: 投稿の作成開始、重複はスキップ、進捗表示

- [ ] **Step 2: 全件移行を実行（完了まで待機）**

```bash
node scripts/migrate-garden-to-wp.mjs 2>&1 | tee .garden-backup/migration-log.txt
```

Expected: 全記事の投稿完了。ログを `.garden-backup/migration-log.txt` に保存。

- [ ] **Step 3: WP 投稿数を再確認して照合**

```bash
curl -s "https://wp.hayatokano.com/wp-json/wp/v2/posts?categories=52&per_page=1" \
  -H "Authorization: Basic $(echo -n "$WP_APP_USER:$WP_APP_PASSWORD" | base64)" \
  -D - -o /dev/null 2>&1 | grep -i x-wp-total
```

Expected: `X-WP-Total: N`（Dropbox 記事数と一致 or 近い値）

**照合基準**: WP 投稿数 ≥ Dropbox 記事数 × 0.95（日付なしでスキップされる記事を考慮）

- [ ] **Step 4: WP から数件サンプル取得して内容確認**

```bash
curl -s "https://wp.hayatokano.com/wp-json/wp/v2/posts?categories=52&per_page=3&orderby=date&order=desc" \
  -H "Authorization: Basic $(echo -n "$WP_APP_USER:$WP_APP_PASSWORD" | base64)" \
  | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); d.forEach(p => console.log(p.date, p.title.rendered))"
```

Expected: 最新3件のタイトルと日付が表示される

- [ ] **Step 5: コミット（バックアップ + ログ）**

```bash
git add .garden-backup/
git commit -m "backup: Garden移行前のキャッシュファイルとログを保存"
```

---

## Chunk 2: データ取得層の切り替え

### Task 3: `dropbox.ts` の `fetchAllGardenFiles()` を WP only に変更

**Files:**
- Modify: `src/lib/garden/dropbox.ts`

- [ ] **Step 1: `fetchAllGardenFiles()` を WP のみから取得するよう変更**

`dropbox.ts` の `fetchAllGardenFiles()` 内で:
1. Dropbox からの取得を完全に除去
2. WP API からのみ取得
3. キャッシュの読み書きロジックは維持（ビルド高速化のため）

変更箇所（`dropbox.ts` の `fetchAllGardenFiles` 関数）:

```typescript
/**
 * Garden ファイル一覧を取得（WordPress API のみ）
 *
 * ビルド時: WP API → キャッシュに保存
 * ランタイム: キャッシュから読み込み（WP API は ISR 時のみ）
 */
export async function fetchAllGardenFiles(): Promise<GardenFile[]> {
  // キャッシュがあればそれを使う（ランタイム高速化）
  const cached = readCache();
  if (cached && cached.length > 0) {
    return cached;
  }

  // WP API から取得
  const wpFiles = await fetchGardenFromWP();
  if (wpFiles.length > 0) {
    writeCache(wpFiles);
    return wpFiles;
  }

  // WP も空ならキャッシュファイルにフォールバック
  console.warn("[garden] WP API returned empty, using stale cache if available");
  return cached ?? [];
}
```

- [ ] **Step 2: ローカルでビルドテスト**

```bash
cd ~/Projects/hayatokano-portfolio
rm -rf .next
npm run prebuild 2>&1 | tail -20
```

Expected: prebuild が WP API から記事を取得して完了

- [ ] **Step 3: dev サーバーで Garden ページを確認**

```bash
npx next dev -p 3000
```

ブラウザで確認:
- `/garden` — 記事一覧が表示されるか
- `/garden/（任意のslug）` — 詳細ページが表示されるか
- 検索が動作するか
- Wiki リンク・バックリンクが表示されるか

- [ ] **Step 4: コミット**

```bash
git add src/lib/garden/dropbox.ts
git commit -m "refactor: Garden データソースを WordPress API のみに切り替え"
```

---

### Task 4: On-demand ISR API Route の追加

**Files:**
- Create: `src/app/api/revalidate/garden/route.ts`
- Modify: なし（WP 側の設定は後で手動）

- [ ] **Step 1: revalidate API Route を作成**

```typescript
// src/app/api/revalidate/garden/route.ts
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/** WP から呼び出される Garden 再検証エンドポイント。
 *  secret パラメータで認証し、Garden ページを即時再生成する。 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  try {
    // Garden 一覧と全詳細ページを再検証
    revalidatePath("/garden", "layout");
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { message: "Revalidation failed", error: String(err) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 環境変数に `REVALIDATE_SECRET` を追加**

```bash
# .env.local に追加（ランダムな文字列）
echo "REVALIDATE_SECRET=$(openssl rand -hex 16)" >> .env.local
```

Vercel にも同期:
```bash
./scripts/sync-env-to-vercel.sh REVALIDATE_SECRET
```

- [ ] **Step 3: ローカルで API Route をテスト**

```bash
# dev サーバー起動中に
SECRET=$(grep REVALIDATE_SECRET .env.local | cut -d= -f2)
curl -X POST "http://localhost:3000/api/revalidate/garden?secret=$SECRET"
```

Expected: `{"revalidated":true,"now":...}`

- [ ] **Step 4: コミット**

```bash
git add src/app/api/revalidate/garden/route.ts
git commit -m "feat: Garden On-demand ISR APIルートを追加"
```

---

## Chunk 3: WP Webhook 設定と Dropbox コード削除

### Task 5: WP 側に revalidate Webhook を設定

**Files:**
- Create: WP mu-plugin（Xserver 上）

- [ ] **Step 1: WP mu-plugin を作成**

Xserver SSH で:
```bash
ssh xserver
cat > /home/hayatokano/hayatokano.com/public_html/wp/wp-content/mu-plugins/garden-revalidate.php << 'PHP'
<?php
/**
 * Garden カテゴリの投稿が公開/更新されたら Next.js の On-demand ISR を叩く
 */
add_action('publish_post', function ($post_id) {
    $post = get_post($post_id);
    if (!$post || $post->post_status !== 'publish') return;

    // Garden カテゴリ (ID: 52) に属するか確認
    if (!has_category(52, $post)) return;

    $secret = defined('REVALIDATE_SECRET') ? REVALIDATE_SECRET : '';
    if (!$secret) return;

    $url = 'https://hayatokano.com/api/revalidate/garden?secret=' . urlencode($secret);

    wp_remote_post($url, [
        'timeout' => 5,
        'blocking' => false, // 非同期（投稿保存を遅延させない）
    ]);
}, 10, 1);
PHP
```

- [ ] **Step 2: WP の wp-config.php に REVALIDATE_SECRET を設定**

```bash
ssh xserver
# wp-config.php の適切な位置に追加
echo "define('REVALIDATE_SECRET', 'ここに.env.localと同じ値');" >> /home/hayatokano/hayatokano.com/public_html/wp/wp-config.php
```

- [ ] **Step 3: WP 管理画面から Garden カテゴリでテスト投稿**

1. WP 管理画面にログイン
2. 新規投稿 → Garden カテゴリを選択 → タイトル「テスト投稿」→ 公開
3. 数秒後に `https://hayatokano.com/garden` にアクセスして表示を確認
4. 確認後、テスト投稿を削除

---

### Task 6: prebuild スクリプトの簡素化

**Files:**
- Modify: `scripts/prebuild-garden-cache.ts`
- Modify: `package.json`

- [ ] **Step 1: prebuild-garden-cache.ts を WP のみに簡素化**

Dropbox のフォールバックロジックを削除。WP API からの取得のみにする。

- [ ] **Step 2: ビルドテスト**

```bash
rm -rf .next .garden-cache.json
npm run prebuild 2>&1 | tail -20
npm run build 2>&1 | tail -20
```

Expected: WP API のみでビルド完了

- [ ] **Step 3: コミット**

```bash
git add scripts/prebuild-garden-cache.ts package.json
git commit -m "simplify: prebuild を WordPress API のみに簡素化"
```

---

### Task 7: 本番デプロイと最終検証

- [ ] **Step 1: 本番デプロイ**

```bash
git push
# Vercel が自動ビルド
```

- [ ] **Step 2: 本番で全機能を検証**

チェックリスト:
- [ ] `/garden` — 一覧表示（記事数が移行前と同等か）
- [ ] `/garden/（任意のslug）` — 詳細ページ表示
- [ ] 検索機能が動作するか
- [ ] Wiki リンク `[[ページ名]]` がリンクとして機能するか
- [ ] バックリンク（関連ページ）が表示されるか
- [ ] 画像が正常に表示されるか
- [ ] ダークモードで崩れないか
- [ ] モバイル表示が正常か
- [ ] OGP 画像が生成されるか

- [ ] **Step 3: Ulysses → WP 投稿テスト**

1. Ulysses から WP に直接投稿（Garden カテゴリ）
2. 数秒後に本番サイトで表示を確認

---

### Task 8: Dropbox コードの削除（全検証完了後のみ）

**⚠️ 全検証が完了し、1週間以上問題なく運用できた後に実行する**

**Files:**
- Delete: Dropbox 関連の fetch ロジック（`dropbox.ts` 内の Dropbox API 呼び出し部分）
- Delete: `scripts/migrate-garden-to-wp.mjs`
- Delete: `scripts/push-garden.sh`
- Delete: `scripts/migrate-blogger.ts`
- Remove: `.env.local` から `DROPBOX_*` 環境変数
- Remove: Vercel から `DROPBOX_*` 環境変数
- Archive: `.garden-backup/` は保持（安全のため）

- [ ] **Step 1: Dropbox 環境変数を削除**

```bash
# .env.local から DROPBOX_* を削除
# Vercel からも削除
```

- [ ] **Step 2: 不要スクリプトを削除**

```bash
rm scripts/migrate-garden-to-wp.mjs
rm scripts/push-garden.sh
rm scripts/migrate-blogger.ts
```

- [ ] **Step 3: dropbox.ts から Dropbox API ロジックを削除**

ファイル自体は `fetchAllGardenFiles()` とキャッシュ管理を含むため残す。
Dropbox API の関数（`getAccessToken`, `listAllEntries`, `downloadFile`, `fetchFromDropbox`）のみ削除。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "cleanup: Dropbox 関連コード・スクリプト・環境変数を削除"
git push
```

---

## 完了後のフロー

```
Ulysses で記事を書く
    ↓
Ulysses → WordPress に直接投稿（Garden カテゴリ）
    ↓
WP save_post フック → Next.js revalidate API を呼び出し
    ↓
On-demand ISR で Garden ページが即時再生成
    ↓
数秒で本番に反映
```
