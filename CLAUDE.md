# CLAUDE.md — Hayato Kano ポートフォリオ

## プロジェクト概要

写真家・映像作家 Hayato Kano のポートフォリオサイト。
WordPress をヘッドレス CMS として使い、Next.js App Router でフロントエンドを構築。

- **本番URL**: https://hayatokano.com（Vercel）
- **WP管理**: https://wp.hayatokano.com/wp-admin/
- **GitHub**: `hayatokano74-arch/hayatokano-portfolio`
- **dev サーバー**: `npx next dev -p 3000`
- **ビルド**: `npx next build`
- **リント**: `npx next lint`

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript + React 19 |
| スタイリング | CSS カスタムプロパティ + globals.css（Tailwind も使用可） |
| フォント | Inter（欧文）+ Noto Sans JP（和文）— Google Fonts |
| CMS | WordPress（ヘッドレス、カスタム REST API） |
| API | `wp-json/hayato/v1/*`（Works, Timeline, MeNoHoshi, Text, News, About, Site Settings） |
| サニタイズ | DOMPurify（HTMLコンテンツの安全な表示） |
| ホスティング | Vercel（フロント）+ Xserver（WP） |
| ドメイン管理 | Squarespace |

## ディレクトリ構成（主要ファイル）

```
src/
├── app/
│   ├── page.tsx                      # トップページ（TopHero — フルスクリーンヒーロー）
│   ├── layout.tsx                    # ルートレイアウト（フォント・メタ・ThemeScript・GridDebugOverlay）
│   ├── globals.css                   # 全グローバルCSS（変数・グリッド・テーマ・全コンポーネントスタイル）
│   ├── works/
│   │   ├── page.tsx                  # 作品一覧
│   │   └── [slug]/page.tsx           # 作品詳細
│   ├── me-no-hoshi/
│   │   ├── page.tsx                  # 目の星プロジェクト一覧
│   │   └── [slug]/page.tsx           # 目の星 詳細
│   ├── text/
│   │   ├── page.tsx                  # テキスト一覧
│   │   └── [slug]/
│   │       ├── page.tsx              # テキスト詳細
│   │       └── reading/page.tsx      # テキスト読書モード（3カラムレイアウト + 目次）
│   ├── timeline/page.tsx             # タイムライン
│   ├── news/page.tsx                 # ニュース（アコーディオン形式）
│   ├── about/page.tsx                # アバウト（スライドショー + CV）
│   ├── contact/page.tsx              # コンタクトフォーム
│   ├── post/page.tsx                 # Timeline 投稿管理ページ（PIN認証 + CRUD）
│   └── api/
│       └── timeline/route.ts         # Timeline API（GET/POST/PUT/DELETE）
├── components/
│   ├── Header.tsx                    # 共通ヘッダー（ナビ・タイトル行・カテゴリ行・titleRight prop）
│   ├── CanvasShell.tsx               # ページシェル（余白・テーマ切替配置）
│   ├── TopHero.tsx                   # トップページヒーロー（背景画像・ホバー切替・最新Works表示）
│   ├── WorksClient.tsx               # Works 一覧（Grid/List 表示切替・カテゴリフィルタ）
│   ├── WorkDetailClient.tsx          # Works 詳細ページ（ギャラリー・メディア表示）
│   ├── WorkDetailsTable.tsx          # Works 詳細情報テーブル（展示・作品・出版・クレジット情報）
│   ├── TimelineView.tsx              # タイムライン表示 + TimelinePageContent + MobileArchiveDrawer
│   ├── MeNoHoshiDetail.tsx           # 目の星 詳細
│   ├── NewsView.tsx                  # ニュースアコーディオン表示
│   ├── TextToc.tsx                   # テキスト目次（読書モード用）
│   ├── AboutSlideshow.tsx            # アバウトページ写真スライドショー（自動再生 + インジケータ）
│   ├── ContactForm.tsx               # コンタクトフォーム（TODO: 実際のAPI送信未実装）
│   ├── ThemeToggle.tsx               # ダーク/ライトテーマ切替（ThemeDot + ThemeScript）
│   └── GridDebugOverlay.tsx          # Ctrl+G でグリッド線表示（開発環境のみ）
├── lib/
│   ├── works.ts                      # Works データ取得・正規化
│   ├── timeline.ts                   # Timeline データ取得
│   ├── meNoHoshi.ts                  # 目の星データ取得
│   ├── text.ts                       # Text データ取得（React.cache でリクエスト重複排除）
│   ├── news.ts                       # News データ取得
│   ├── about.ts                      # About データ取得
│   ├── siteSettings.ts               # サイト設定取得（トップヒーロー画像URL等）
│   ├── categories.ts                 # カテゴリ定義（All/Photography/Video/Personal/Portrait/Exhibition）
│   ├── nav.ts                        # ナビゲーション項目定義（Header/TopHero で共有）
│   ├── mock.ts                       # フォールバック用モックデータ・型定義
│   ├── blur.ts                       # blurDataURL 生成（プレースホルダー画像）
│   └── wp/
│       ├── client.ts                 # WP REST API クライアント（fetchWpApi — ISR 300秒）
│       └── types.ts                  # WP レスポンス型定義（全フィールド optional）
next.config.mjs                       # Next.js 設定（WP メディアホスト許可）
tailwind.config.ts                    # Tailwind CSS 設定
postcss.config.mjs                    # PostCSS 設定
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `WP_BASE_URL` | WordPress ベースURL（例: `https://wp.hayatokano.com/wp`） |
| `NEXT_PUBLIC_WP_BASE_URL` | 同上（クライアント側フォールバック） |
| `WP_MEDIA_HOST` | WP メディアホスト名（`next/image` の remotePatterns 用） |
| `WP_APP_USER` | WP Application Passwords ユーザー名 |
| `WP_APP_PASSWORD` | WP Application Passwords パスワード |
| `TIMELINE_POST_PIN` | Timeline 投稿用 PIN コード |
| `TOP_HERO_IMAGE_URL` | トップヒーロー画像URL（WP設定のフォールバック） |
| `NEXT_PUBLIC_TOP_HERO_IMAGE_URL` | 同上（クライアント側） |

## WP REST API エンドポイント

| エンドポイント | 説明 |
|---|---|
| `hayato/v1/works` | 作品一覧 |
| `hayato/v1/text` | テキスト一覧 |
| `hayato/v1/news` | ニュース一覧 |
| `hayato/v1/timeline` | タイムライン一覧 / 投稿作成 |
| `hayato/v1/timeline/drafts` | タイムライン下書き一覧（認証必須） |
| `hayato/v1/timeline/{id}` | タイムライン個別操作（PUT/DELETE、認証必須） |
| `hayato/v1/about` | アバウト情報 |
| `hayato/v1/me-no-hoshi` | 目の星プロジェクト |
| `hayato/v1/site-settings` | サイト設定（トップヒーロー画像URL等） |
| `wp/v2/media` | WP メディアアップロード（認証必須） |

## データ取得パターン

- **Server Component** で `lib/*.ts` の `get*()` 関数を `await` して WP API からデータ取得
- `fetchWpApi()` が共通ヘルパー：ISR 300秒キャッシュ、失敗時は `null` を返す
- 各 `get*()` 関数は WP API 失敗時に `mock.ts` のフォールバックデータを返す
- WP レスポンス型は全フィールド optional → `normalize*()` 関数で安全にデフォルト値へ変換
- `React.cache` でリクエスト単位の重複排除（`text.ts` 等）
- Timeline 投稿 API（`/api/timeline/route.ts`）は PIN 認証でアクセス制御、WP 認証情報はサーバーサイドに隠蔽

## インフラ構成

```
hayatokano.com → Vercel (76.76.21.21)
  └─ Next.js App（SSR + ISR）

wp.hayatokano.com → Xserver
  └─ WordPress (REST API 専用)
  └─ パス: /home/hayatokano/hayatokano.com/public_html/wp/

ドメイン管理: Squarespace
Xserver SSH: ssh xserver（鍵認証、ポート10022）
Vercel scope: team_s8LqVICziJw8ChEtAA3SKQ7c
```

## 実装済み機能

### 投稿管理機能（CRUD）
- **概要**: `/post` ページから Timeline 投稿の作成・編集・削除・下書き管理が可能
- **認証**: PIN コードによるアクセス制御（`timingSafeEqual` でタイミング攻撃対策）
- **機能**: テキスト/写真投稿、任意タイトル、タグ付け（`#タグ` 記法 + 過去タグ選択）、複数画像アップロード、下書き保存/公開、投稿編集/削除
- **API**: `route.ts` で GET/POST/PUT/DELETE の全 CRUD を実装
- **バリデーション**: タイトル200文字、テキスト10000文字、タグ20個/50文字、画像10枚/20MB、MIME タイプ制限

### タグフィルタリング
- Works、Text、目の星ページで実際の投稿に存在するタグのみをフィルターに表示
- タグの大文字小文字を正規化して統一

### グリッド表示の投稿数ベースレスポンシブ
- Works 等のグリッド表示で投稿数に応じてカラム数を自動調整

### Timeline モバイルアーカイブ ドロワー
- インラインの `MobileArchive` を、年→月→日の階層ツリーを持つボトムドロワーに置換
- `TimelinePageContent`（Client Component）が Header と TimelineView をラップし、ドロワーの開閉状態を共有

### 日本語ファイル名の画像404修正
- WP から取得する日本語ファイル名の画像URLを正しくエンコードして404を防止

### セキュリティ・アクセシビリティ修正
- ハードコード色をCSS変数に統一
- `@media` ブロックの統合
- セキュリティ・アクセシビリティ・コード品質の包括的修正（React Best Practices 準拠）

### WP 認証修正（Xserver）
- **問題**: Xserver FastCGI が HTTP Authorization ヘッダーを PHP に渡さず、WP Application Passwords が機能しない
- **修正**: `.htaccess` に `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` を追加 + `mu-plugins/fix-rest-auth.php` を設置
- **WP テーマ修正**: `convert_to_webp()` にエラーガード追加（不正画像による Fatal error 防止）

## 既知の問題と解決策

| 問題 | 解決策 |
|---|---|
| 白い画面 / CSS 404 | `rm -rf .next && npx next dev`（キャッシュ破損） |
| Cannot find module './331.js' | 同上 |
| WP 認証 401 (rest_not_logged_in) | `.htaccess` の Authorization ヘッダー転送を確認 |
| WP 画像アップ 500 | `convert_to_webp()` のエラーガードを確認 |
| 本番で API エラー | Vercel 環境変数の同期を確認 |
| ビルド失敗 | プロジェクトディレクトリから実行しているか確認 |
| 日本語ファイル名の画像 404 | `works.ts` の URL エンコード処理を確認 |
| ContactForm 送信不可 | TODO: 実際の API 送信が未実装 |

## デザインシステム

### グリッド
- 12カラム: `repeat(12, 1fr)` + `column-gap: var(--grid-gutter)`
- 2カラム: 左 `1 / span 4`, 右 `6 / -1`（列5がgap）
- モバイル(≤900px): `1fr` + `grid-column: 1 / -1`
- 全セルに `min-width: 0`（はみ出し防止）
- デバッグ: `Ctrl+G` でオーバーレイ表示（開発環境のみ）

### テーマ
- ライト: `bg: #ececec`, `fg: #141414`
- ダーク: `bg: #1a1a1a`, `fg: #e8e8e8`
- セレクタ: `[data-theme="dark"]`（`prefers-color-scheme` ではない）
- SSRフリッカー防止: `ThemeScript` が inline script で localStorage から復元
- 切替UI: `ThemeDot` コンポーネント（ヘッダー内ドット表示）

### スペーシング
- 全て `clamp()` ベース（8pxグリッド基準）
- CSS カスタムプロパティ: `--space-1` 〜 `--space-14`

### タイポグラフィ
- `--font-meta`: 12px（メタ情報）
- `--font-body`: 15px（本文）
- `--font-heading`: 18px（見出し）
- `--font-brand`: 22px（ブランド）
- CJK: `line-height: 1.7-2.0`, `letter-spacing: 0.04em`
- 欧文フォント: `--font-inter`（Inter）
- 和文フォント: `--font-noto`（Noto Sans JP — weight: 400/500/600/700/900）

### ナビゲーション
- 7セクション: Works / Text / 目の星 / Time Line / News / About / Contact
- `lib/nav.ts` で定義、Header と TopHero で共有
- モバイル: ハンバーガーメニュー → フルスクリーンオーバーレイ

### カテゴリ
- Works: All / Photography / Video / Personal / Portrait / Exhibition
- `lib/categories.ts` で定義

## 開発時の注意事項

- `.env.local` を変更したら Vercel 環境変数も手動で同期する
- 新しい CSS クラスを追加したらモバイルオーバーライド（`@media (max-width: 900px)`）も同時に追加する
- `grid-column` の中央配置は `4 / span 6`（`3 / span 6` は左寄り）
- インラインスタイルでレイアウト指定せず CSS クラスを使う
- 固定 px 幅 + `margin-left: auto` → 使わない（grid-column で配置）
- WP レスポンス型は全フィールド optional にし、normalize 関数で安全に変換する
- WP API 失敗時は必ず `mock.ts` のフォールバックデータを返すようにする
- `next/image` で外部画像を使う場合は `next.config.mjs` の `remotePatterns` に追加が必要（`WP_MEDIA_HOST` 環境変数で設定）
