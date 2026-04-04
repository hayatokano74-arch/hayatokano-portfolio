# PHP+SQLite CMS 移行プラン

**作成日:** 2026-04-04
**目標:** WordPress・Vercel を廃止し、PHP+SQLite CMS を Xserver 上で動かしてスマホからも編集可能にする
**依存先:** Xserver（ホスティング）＋ GitHub（コード管理＋CI/CD）のみ

---

## 現状調査結果

### WordPress 依存箇所

| コンテンツ | ファイル | API エンドポイント | 備考 |
|---|---|---|---|
| Works | `src/lib/works.ts` | `hayato/v1/works`, `hayato/v1/works/{slug}` | ローカル MD への移行ほぼ完了 |
| 目の星 | `src/lib/me-no-hoshi/api.ts` | `hayato/v1/me-no-hoshi` | ローカル MD への移行ほぼ完了 |
| News | `src/lib/news.ts` | `hayato/v1/news` | ローカル MD への移行ほぼ完了 |
| About | `src/lib/about.ts` | `hayato/v1/about` | ローカル MD への移行ほぼ完了 |
| Timeline | `src/lib/timeline.ts` | `hayato/v1/timeline` | **WP 専用、ローカルファイルなし** |
| Text | `src/app/text/[slug]/page.tsx` 等 | `hayato/v1/text`, `hayato/v1/text/{slug}` | **WP 専用、ローカルファイルなし** |
| Garden | `src/lib/garden/wordpress.ts` | `/wp/v2/posts?categories=52` | ローカルファイルと WP 両方から取得中 |
| サイト設定 | `src/lib/siteSettings.ts` | WP REST API | タイトル・説明等 |

**WP API クライアント:** `src/lib/wp/client.ts`（`fetchWpApi<T>()`）
**認証:** WP Application Password（HTTP Basic）

### Vercel 依存箇所

| 機能 | 場所 | 内容 |
|---|---|---|
| ISR | `src/lib/wp/client.ts` | `next: { revalidate: 3600 }` — Vercel ISR キャッシュ |
| On-demand ISR | `src/app/api/revalidate/garden/route.ts` | Garden 更新時の即時再生成 |
| 環境変数管理 | `scripts/sync-env-to-vercel.sh` | `.env.local` → Vercel 同期 |
| 自動デプロイ | GitHub push → Vercel | CI/CD |

**非 Vercel 設計:** `deploy.sh` で静的エクスポート＋rsync が既に動作済み

### 管理画面の現状（localhost:3000/admin）

| 機能 | 実装状態 | 備考 |
|---|---|---|
| Works 一覧・編集・削除 | ✅ 完成 | gray-matter でローカル MD 読み書き |
| 目の星 一覧・編集・削除 | ✅ 完成 | 同上 |
| News 一覧・編集・削除 | ✅ 完成 | 同上 |
| Garden 一覧 | ✅ 完成（読み取り専用） | |
| Garden 編集 | ❌ 未実装 | |
| Timeline 管理 | ❌ 未実装 | |
| 認証 | ❌ 未実装 | dev サーバー専用のため |
| デプロイボタン | ✅ 完成 | `next build` + rsync |
| 画像アップロード | ✅ 完成 | `public/media/{section}/{slug}/` |

### コンテンツの種類と件数

| コンテンツ | 保存場所 | 件数 | フォーマット |
|---|---|---|---|
| Works | `content/works/*.md` | 5件 | MD + YAML frontmatter |
| 目の星 | `content/me-no-hoshi/*.md` | 4件 | MD + YAML frontmatter |
| News | `content/news/*.md` | 1件 | MD + YAML frontmatter |
| About | `content/about/index.md` | 1件 | MD + YAML frontmatter |
| Garden | `content/garden/*.md` + WP | 約 1,079件 | MD（Ulysses エクスポート） |
| Timeline | WP のみ | 不明 | WP posts |
| Text | WP のみ | 不明 | WP posts |

### 画像管理

- **保存先:** `public/media/{section}/{slug}/`（ローカルファイル）
- **外部参照:** WP メディアサーバー（wp.hayatokano.com）から直接参照中（移行未完了）
- **最適化:** `next.config.mjs` で `images.unoptimized: true`（next/image の最適化なし）

### デプロイフロー（現在）

```
git push → Vercel 自動ビルド → hayatokano.com
または
./deploy.sh → next build + rsync → Xserver
```

---

## 目標アーキテクチャ

```
[スマホ / PC / Mac]
    ↓ HTTPS（パスワード認証）
[Xserver: PHP+SQLite CMS]  ← admin.hayatokano.com
    ↓ 「デプロイ」ボタン押下
    ↓ GitHub Actions API を呼び出し（webhook）
[GitHub Actions]
    ↓ git checkout
    ↓ PHP CMS API からコンテンツ取得（JSON）or git pull（MD）
    ↓ next build（静的エクスポート）
    ↓ rsync to Xserver
[Xserver: 静的 HTML]  ← hayatokano.com（一般公開）
```

**設計方針:**
- PHP CMS は SQLite に全コンテンツを保存
- PHP CMS は REST API（JSON）を公開 → Next.js ビルド時に読み込む（WordPress API の代替）
- Garden のみ `content/garden/*.md` ファイル継続（Ulysses エクスポートの維持）
- 画像は Xserver ファイルシステムに保存、Next.js ビルド時に rsync で `public/media/` にコピー

---

## 移行フェーズ

### Phase 1 — Vercel 廃止（2〜3日）

**やること:**
- GitHub Actions ワークフローを追加（`next build` + rsync）
- `deploy.sh` を GitHub Actions に移植
- Vercel プロジェクトを削除（または無効化）
- DNS を Vercel から Xserver の静的ファイルに切り替え

**変更ファイル:**
```
.github/workflows/deploy.yml  ← 新規作成
deploy.sh                     ← GitHub Actions から呼び出す形に整理
```

**GitHub Actions ワークフロー概要:**
```yaml
on:
  workflow_dispatch:        # 手動トリガー（後で PHP から呼び出す）
  push:
    branches: [main]        # git push 時も自動デプロイ（任意）

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: STATIC_EXPORT=true npx next build
      - run: rsync -az --delete out/ ${{ secrets.XSERVER_USER }}@${{ secrets.XSERVER_HOST }}:~/hayatokano.com/public_html/
```

**Secrets 設定（GitHub リポジトリ設定）:**
- `XSERVER_SSH_KEY` — Xserver SSH 秘密鍵
- `XSERVER_USER` — SSH ユーザー名
- `XSERVER_HOST` — ホスト名

**完了条件:** `git push` → Xserver に自動デプロイされること

---

### Phase 2 — WP 残存コンテンツのローカルファイル化（3〜5日）

**やること:**

**2-A: Timeline を MD ファイルに移行**
- WP から Timeline 投稿を全件エクスポート（JSON）
- `content/timeline/YYYY-MM-DD-HHmm.md` 形式に変換スクリプト作成
- `src/lib/timeline.ts` を WP API なしでローカルファイル読み込みに変更

**Timeline MD フォーマット:**
```yaml
---
date: "2024-05-01"
time: "14:30"
type: "photo"  # photo | text
images:
  - src: "/media/timeline/20240501-1.jpg"
    width: 1200
    height: 800
    alt: ""
---
本文テキスト（任意）
```

**2-B: Text を MD ファイルに移行**
- WP から Text 投稿を全件エクスポート
- `content/text/{slug}.md` 形式に変換
- `src/lib/text.ts`（新規）でローカルファイル読み込みに変更

**2-C: Garden を WP からローカルファイルに完全統一**
- 既存の `content/garden/*.md` を正として確定
- WP Garden API 参照を削除（`src/lib/garden/wordpress.ts`）
- `src/lib/garden/reader.ts` でローカルファイルのみ読み込みに統一

**完了条件:** `WP_BASE_URL` を設定しなくてもビルドが通ること

---

### Phase 3 — PHP+SQLite CMS 構築（1〜2週間）

**やること:** Xserver 上に管理画面（PHP+SQLite）を構築

**設置場所:** `admin.hayatokano.com`（別サブドメイン）または `hayatokano.com/cms/`

#### 3-1. ディレクトリ構成（Xserver 上）

```
/home/hayatokano/hayatokano.com/public_html/
├── index.html             ← Next.js 生成静的ファイル
├── works/
├── ...（Next.js 静的ファイル）
└── _cms/                  ← PHP CMS（Next.js のルーティングと衝突しない場所）
    ├── index.php          ← ダッシュボード
    ├── auth.php           ← 認証（セッション管理）
    ├── api/               ← Next.js が読む REST API（JSON）
    │   ├── works.php
    │   ├── me-no-hoshi.php
    │   ├── news.php
    │   ├── timeline.php
    │   ├── text.php
    │   └── about.php
    ├── admin/             ← 管理画面 HTML
    │   ├── works/
    │   ├── me-no-hoshi/
    │   ├── news/
    │   ├── timeline/
    │   ├── text/
    │   └── garden/
    ├── uploads/           ← アップロード画像の一時置き場
    │   └── YYYY-MM/
    ├── db/
    │   └── cms.sqlite3    ← SQLite データベース（.htaccess で直接アクセス禁止）
    ├── lib/
    │   ├── db.php         ← PDO 接続・マイグレーション
    │   ├── auth.php       ← 認証ヘルパー
    │   ├── upload.php     ← 画像アップロード処理
    │   └── deploy.php     ← GitHub Actions API 呼び出し
    └── .htaccess          ← db/ 直接アクセス禁止・認証設定
```

**Xserver のメディア置き場:**
```
/home/hayatokano/hayatokano.com/public_html/media/
├── works/{slug}/
├── me-no-hoshi/{slug}/
├── news/{slug}/
├── timeline/YYYY-MM/
└── garden/
```
→ Next.js ビルド時に rsync でコピーせず、Xserver のパスを直接参照する設計にする

#### 3-2. SQLite テーブル設計

```sql
-- Works
CREATE TABLE works (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL UNIQUE,
    title    TEXT NOT NULL,
    date     TEXT NOT NULL,          -- "2024/05/01"
    year     TEXT NOT NULL,
    tags     TEXT NOT NULL DEFAULT '[]',  -- JSON 配列
    excerpt  TEXT NOT NULL DEFAULT '',
    pinned   INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
    data     TEXT NOT NULL DEFAULT '{}',  -- 残りの frontmatter を JSON で保持
    body     TEXT NOT NULL DEFAULT '',    -- Markdown 本文
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 目の星（MeNoHoshi）
CREATE TABLE me_no_hoshi (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL UNIQUE,
    title    TEXT NOT NULL,
    date     TEXT NOT NULL,
    year     TEXT NOT NULL,
    tags     TEXT NOT NULL DEFAULT '[]',
    excerpt  TEXT NOT NULL DEFAULT '',
    data     TEXT NOT NULL DEFAULT '{}',  -- thumbnail, media, details, bio, etc. を JSON で
    body     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- News
CREATE TABLE news (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL UNIQUE,
    title    TEXT NOT NULL,
    date     TEXT NOT NULL,
    data     TEXT NOT NULL DEFAULT '{}',  -- image を JSON で
    body     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Timeline
CREATE TABLE timeline (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL UNIQUE,        -- YYYY-MM-DD-HHmm
    date     TEXT NOT NULL,              -- "2024-05-01"
    time     TEXT NOT NULL DEFAULT '',   -- "14:30"
    type     TEXT NOT NULL DEFAULT 'text',  -- "photo" | "text"
    images   TEXT NOT NULL DEFAULT '[]',   -- JSON 配列
    body     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Text（テキスト記事）
CREATE TABLE texts (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL UNIQUE,
    title    TEXT NOT NULL,
    date     TEXT NOT NULL,
    data     TEXT NOT NULL DEFAULT '{}',
    body     TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- About（単一レコード）
CREATE TABLE about (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    data     TEXT NOT NULL DEFAULT '{}',  -- photos, cv を JSON で
    body     TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Garden（メタデータのみ、本文はファイルから読む）
CREATE TABLE garden (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug     TEXT NOT NULL UNIQUE,        -- YYYY-MM-DD
    date     TEXT NOT NULL,
    title    TEXT NOT NULL DEFAULT '',
    tags     TEXT NOT NULL DEFAULT '[]',
    type     TEXT NOT NULL DEFAULT 'text',  -- "photo" | "text"
    body     TEXT NOT NULL DEFAULT '',    -- content/garden/ ファイルのパスまたは本文
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- メディア（アップロードファイル管理）
CREATE TABLE media (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,     -- /media/works/w001/image.jpg
    section     TEXT NOT NULL,            -- works, me-no-hoshi, timeline, etc.
    slug        TEXT NOT NULL DEFAULT '', -- 関連するコンテンツの slug
    width       INTEGER DEFAULT NULL,
    height      INTEGER DEFAULT NULL,
    size_bytes  INTEGER DEFAULT NULL,
    mime_type   TEXT DEFAULT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**設計方針:**
- 複雑な frontmatter（works の details, me-no-hoshi の keyVisuals 等）は JSON 文字列で `data` カラムに格納
- これにより Schema の変更なしにフィールド追加が可能
- Next.js 側は JSON をパースして既存の型に変換

#### 3-3. PHP REST API 仕様

**エンドポイント一覧（WordPress API との互換性）:**

```
GET /_cms/api/works.php              → Works 全件（JSON）
GET /_cms/api/works.php?slug=w001   → Works 1件
GET /_cms/api/me-no-hoshi.php        → 目の星 全件
GET /_cms/api/me-no-hoshi.php?slug=m001
GET /_cms/api/news.php               → News 全件
GET /_cms/api/timeline.php           → Timeline 全件
GET /_cms/api/text.php               → Text 全件
GET /_cms/api/text.php?slug=slug
GET /_cms/api/about.php              → About
```

**レスポンス形式:** 既存の WordPress API レスポンス形式と互換性を持たせる（`src/lib/wp/types.ts` に合わせる）か、Next.js 側の正規化層を一緒に書き換える（推奨）

**認証:** GET（閲覧）は認証不要、POST/PUT/DELETE は管理者セッション必須

#### 3-4. 管理画面の機能一覧

| 機能 | URL | 備考 |
|---|---|---|
| ログイン | `/_cms/` | パスワード認証（bcrypt ハッシュ） |
| ダッシュボード | `/_cms/admin/` | 件数表示・デプロイボタン |
| Works 一覧 | `/_cms/admin/works/` | |
| Works 新規追加 | `/_cms/admin/works/new.php` | 画像アップロード付き |
| Works 編集 | `/_cms/admin/works/edit.php?slug=xxx` | |
| Works 削除 | POST | |
| 目の星 一覧・追加・編集・削除 | `/_cms/admin/me-no-hoshi/` | 同上 |
| News 一覧・追加・編集・削除 | `/_cms/admin/news/` | 同上 |
| Timeline 一覧・追加・編集・削除 | `/_cms/admin/timeline/` | 写真アップロード対応 |
| Text 一覧・追加・編集・削除 | `/_cms/admin/text/` | |
| Garden 一覧 | `/_cms/admin/garden/` | 読み取り専用 |
| About 編集 | `/_cms/admin/about/` | 単一レコード |
| デプロイ | `/_cms/admin/deploy.php` | GitHub Actions API 呼び出し |
| メディア一覧 | `/_cms/admin/media/` | アップロード画像管理 |

**スマホ対応:** 全管理画面はレスポンシブ（320px〜）。フォームはシンプルな HTML+CSS で実装。

#### 3-5. デプロイフロー（Phase 3 完了後）

```
[スマホ: /_cms/admin/deploy.php を開く]
    ↓ 「デプロイ」ボタン押下
[PHP: GitHub Actions API に POST リクエスト]
    Authorization: Bearer <GITHUB_PAT>
    POST /repos/{owner}/{repo}/actions/workflows/deploy.yml/dispatches
    body: { "ref": "main" }
    ↓
[GitHub Actions: workflow_dispatch トリガー]
    1. git checkout main
    2. npm ci
    3. PHP CMS API から全コンテンツ取得（JSON）
       → scripts/fetch-cms-content.ts で JSON を content/ に書き出し
    4. STATIC_EXPORT=true npx next build
    5. rsync out/ → Xserver
    ↓
[Xserver: 静的 HTML 更新完了]
```

**GitHub Personal Access Token (PAT):**
- Scope: `repo`, `workflow`
- PHP CMS の環境変数または `.env` ファイルに保存
- `db/` 同様、`.htaccess` で外部アクセス禁止

---

### Phase 4 — Next.js ビルドの接続先を PHP CMS API に変更（3〜5日）

**やること:**
- `src/lib/wp/client.ts` を `src/lib/cms/client.ts` に置き換え（Xserver PHP API を呼ぶ）
- 各 `lib/*.ts` の `fetchWpApi()` を `fetchCmsApi()` に変更
- Vercel ISR の `next: { revalidate }` を削除（静的エクスポートでは不要）
- `src/lib/wp/` を削除
- 環境変数を整理

**変更ファイル一覧:**
```
src/lib/cms/                ← 新規（既存 wp/ の代替）
  client.ts                 ← fetchCmsApi<T>()
  types.ts                  ← CMS API レスポンス型
src/lib/works.ts            ← fetchWpApi → fetchCmsApi に変更
src/lib/me-no-hoshi/api.ts  ← 同上
src/lib/news.ts             ← 同上
src/lib/timeline.ts         ← 同上（またはローカルファイル読み込みに変更）
src/lib/siteSettings.ts     ← 廃止または定数化
```

**新しい環境変数（`.env.local`）:**
```bash
# PHP CMS API
CMS_BASE_URL=https://hayatokano.com/_cms/api
# （認証なしの GET API、ビルド時のみ使用）

# GitHub Actions デプロイ用（PHP CMS 側に設定するため、Next.js 側は不要）
```

---

### Phase 5 — 最終クリーンアップ（1〜2日）

**やること:**
- WP 依存コードを完全削除（`src/lib/wp/`、`scripts/sync-env-to-vercel.sh` 等）
- `src/app/api/timeline/route.ts`（WP 写真アップロード）を削除
- `src/app/post/page.tsx` を削除（PHP CMS 管理画面に機能統合済み）
- Next.js の `/admin` ルートを廃止
  - `src/app/admin/` を削除
  - `src/components/admin/` を削除
  - PHP CMS に完全移行済みであることを確認してから実施
- WordPress サーバー（wp.hayatokano.com）を停止・削除
- Vercel プロジェクトを削除

---

## コード構造の方針（デバッグしやすさ重視）

### PHP CMS の設計原則

**1. 1ファイル1責務**
```
lib/db.php      ← データベース接続のみ
lib/auth.php    ← 認証チェックのみ
lib/upload.php  ← ファイルアップロード処理のみ
lib/deploy.php  ← GitHub Actions API 呼び出しのみ
api/works.php   ← Works API レスポンスのみ
```

**2. エラーは必ずログに出す**
```php
// すべての API は JSON エラーレスポンスを返す
function api_error(string $message, int $code = 500): never {
    http_response_code($code);
    header('Content-Type: application/json');
    error_log("CMS API Error: $message");
    echo json_encode(['error' => $message]);
    exit;
}
```

**3. SQL は PDO プリペアドステートメントのみ**
```php
// 直接文字列結合は禁止（SQLインジェクション対策）
$stmt = $db->prepare('SELECT * FROM works WHERE slug = :slug');
$stmt->execute([':slug' => $slug]);
```

**4. 画像アップロードのバリデーション**
```php
// MIME タイプを GD ライブラリで検証（拡張子は信用しない）
$info = getimagesize($tmp_path);
if (!$info || !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'])) {
    api_error('Invalid image file');
}
```

**5. 認証は毎リクエストで確認**
```php
// admin/ 配下のすべてのページで冒頭に呼ぶ
require_once __DIR__ . '/../../lib/auth.php';
require_auth(); // 未認証なら /\_cms/ にリダイレクト
```

**6. トランザクションを使う**
```php
// コンテンツ保存 + メディアレコード更新は必ずトランザクション内で
$db->beginTransaction();
try {
    $db->prepare(...)->execute(...);
    $db->commit();
} catch (PDOException $e) {
    $db->rollBack();
    error_log("DB Error: " . $e->getMessage());
    api_error('保存に失敗しました');
}
```

### Next.js 側の設計原則

**1. CMS API 取得は `src/lib/cms/client.ts` に集約**
```typescript
// タイムアウト・エラーハンドリングを一箇所に
export async function fetchCmsApi<T>(endpoint: string): Promise<T | null>
```

**2. フォールバックは明示的に**
```typescript
// null を返したら呼び出し元でモックを使う（サイレントフォールバックは禁止）
const data = await fetchCmsApi<WorksResponse>('works');
if (!data) {
  console.error('[CMS] works fetch failed, using mock data');
  return MOCK_WORKS;
}
```

**3. 型定義は CMS と Next.js で共有しない**
```
src/lib/cms/types.ts   ← CMS API レスポンス型（PHP が返す JSON の形）
src/lib/types.ts       ← フロントエンド表示用型（正規化後）
```

---

## 依存関係の変化まとめ

| サービス | 現在 | 移行後 |
|---|---|---|
| WordPress | CMS（全コンテンツ） | ✅ 廃止 |
| Vercel | ホスティング + ISR | ✅ 廃止 |
| Xserver | WP + 静的ファイル | 静的ファイル + PHP CMS（継続） |
| GitHub | コード管理 | コード管理 + CI/CD（継続） |
| Resend | メール送信（Contact） | 要検討（現状維持 or 廃止） |

---

## リスクと対策

| リスク | 対策 |
|---|---|
| SQLite の破損 | `db/` を毎日 rsync でバックアップ（cron） |
| GitHub PAT の漏洩 | `.htaccess` で `db/` と設定ファイルを外部アクセス禁止にする |
| PHP CMS が落ちても公開サイトに影響しない | 静的 HTML は完全独立（PHP は管理と API 専用） |
| Next.js ビルドの失敗 | GitHub Actions で失敗時は既存 HTML をそのまま維持 |
| 画像の消失 | Xserver `/home/` 配下に定期バックアップ（Xserver の自動バックアップ機能） |
| 認証ブルートフォース | レートリミット（X 回失敗でアカウントロック）または IP 制限 |

---

## 実装優先順位と作業量

| フェーズ | 難易度 | 日数 | ブロッカー |
|---|---|---|---|
| Phase 1: Vercel 廃止 | 低 | 2〜3日 | なし（deploy.sh が既存） |
| Phase 2: WP 残存コンテンツ移行 | 中 | 3〜5日 | WP エクスポートスクリプト作成 |
| Phase 3: PHP CMS 構築 | 高 | 1〜2週間 | PHP スキルと Xserver 環境 |
| Phase 4: Next.js 接続先変更 | 中 | 3〜5日 | Phase 3 完了後 |
| Phase 5: クリーンアップ | 低 | 1〜2日 | Phase 4 完了後 |

**合計:** 3〜5週間（並行作業なし、1人の場合）

---

## 未決定事項

1. **PHP CMS の設置 URL:** `admin.hayatokano.com`（新サブドメイン）か `hayatokano.com/_cms/`（サブディレクトリ）か
   - サブドメインの場合: Xserver で DNS レコード + バーチャルホスト設定が必要
   - サブディレクトリの場合: 静的 HTML と同居するため `.htaccess` の管理に注意

2. ~~**Garden の編集フロー:** Ulysses → MD ファイル を維持するか、PHP CMS の編集画面に統合するか~~
   **✅ 決定（2026-04-04）: Garden の 1,079件も SQLite に格納する。**
   PHP CMS の `garden` テーブルで管理し、管理画面から編集・追加・削除できるようにする。
   `content/garden/*.md` は移行スクリプトで一括インポート後、削除する。

3. **Timeline の今後:** WP から移行後、PHP CMS の管理画面から追加するか、`/post` 的な専用ページを PHP で作るか

4. **Contact フォームのメール送信:** Resend（要 API キー）をそのまま使うか、Xserver の `mail()` 関数に切り替えるか

5. **画像の最適化:** 現在 `unoptimized: true` のまま。PHP CMS にアップロード時に WebP 変換・リサイズを入れるか否か
