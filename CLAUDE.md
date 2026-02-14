# CLAUDE.md — Hayato Kano ポートフォリオ

## プロジェクト概要

写真家・映像作家 Hayato Kano のポートフォリオサイト。
WordPress をヘッドレス CMS として使い、Next.js App Router でフロントエンドを構築。

- **本番URL**: https://hayatokano.com（Vercel）
- **WP管理**: https://wp.hayatokano.com/wp-admin/
- **GitHub**: `hayatokano74-arch/hayatokano-portfolio`
- **dev サーバー**: `npx next dev -p 3000`

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript |
| スタイリング | CSS カスタムプロパティ + globals.css（Tailwind も使用可） |
| CMS | WordPress（ヘッドレス、カスタム REST API） |
| API | `wp-json/hayato/v1/*`（Works, Timeline, MeNoHoshi 等） |
| ホスティング | Vercel（フロント）+ Xserver（WP） |
| ドメイン管理 | Squarespace |

## ディレクトリ構成（主要ファイル）

```
src/
├── app/
│   ├── page.tsx              # トップページ（TopHero）
│   ├── layout.tsx            # ルートレイアウト
│   ├── globals.css           # 全グローバルCSS（変数・グリッド・テーマ）
│   ├── works/                # 作品一覧・詳細
│   ├── me-no-hoshi/          # 目の星プロジェクト
│   ├── timeline/             # タイムライン
│   ├── text/                 # テキスト
│   ├── news/                 # ニュース
│   ├── about/                # アバウト
│   ├── contact/              # コンタクトフォーム
│   ├── post/                 # 投稿専用ページ（Timeline Post）
│   └── api/timeline/         # Timeline 投稿 API（route.ts）
├── components/
│   ├── Header.tsx            # 共通ヘッダー（ナビ・タイトル行・カテゴリ行）
│   ├── CanvasShell.tsx       # ページシェル（余白・テーマ切替配置）
│   ├── WorksClient.tsx       # Works 一覧（Grid/List 表示）
│   ├── WorkDetailClient.tsx  # Works 詳細ページ
│   ├── TimelineView.tsx      # タイムライン表示 + MobileArchiveDrawer
│   ├── MeNoHoshiDetail.tsx   # 目の星 詳細
│   ├── ThemeToggle.tsx       # ダーク/ライトテーマ切替
│   ├── GridDebugOverlay.tsx  # Ctrl+G でグリッド線表示
│   └── ...
├── lib/
│   ├── works.ts              # Works データ取得・正規化
│   ├── timeline.ts           # Timeline データ取得
│   ├── meNoHoshi.ts          # 目の星データ取得
│   ├── mock.ts               # フォールバック用モックデータ・型定義
│   ├── blur.ts               # blurDataURL 生成
│   └── wp/
│       ├── client.ts         # WP REST API クライアント（fetchWpApi）
│       └── types.ts          # WP レスポンス型定義
scripts/
└── sync-env-to-vercel.sh     # 環境変数を Vercel に同期
```

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

### Timeline モバイルアーカイブ ドロワー（2026-02-14）
- **変更**: インラインの `MobileArchive` を、年→月→日の階層ツリーを持つボトムドロワーに置換
- **アーキテクチャ**: `TimelinePageContent`（Client Component）が Header と TimelineView をラップし、ドロワーの開閉状態を共有
- **変更ファイル**: `Header.tsx`（`titleRight` prop追加）, `TimelineView.tsx`（`TimelinePageContent` + `MobileArchiveDrawer` 追加、`MobileArchive` 削除）, `timeline/page.tsx`, `globals.css`

### 写真アップロード（Timeline Post）（2026-02-14）
- **変更**: `/post` ページから WP に写真をアップロードする機能を実装・修正
- **複数写真対応**: `FormData.getAll("image")` で複数ファイルを受け取り、各画像を WP Media API にアップロード
- **写真のみ投稿**: `type === "photo"` の場合、テキストは任意
- **変更ファイル**: `src/app/api/timeline/route.ts`, `src/app/post/page.tsx`

### WP 認証修正（Xserver）（2026-02-14）
- **問題**: Xserver FastCGI が HTTP Authorization ヘッダーを PHP に渡さず、WP Application Passwords が機能しない
- **修正**: `.htaccess` に `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` を追加 + `mu-plugins/fix-rest-auth.php` を設置
- **WP テーマ修正**: `convert_to_webp()` にエラーガード追加（不正画像による Fatal error 防止）

### 環境変数同期対策（2026-02-14）
- **問題**: `.env.local` のみ更新して Vercel に同期忘れ → 本番が壊れた
- **対策**: `scripts/sync-env-to-vercel.sh` 作成、CLAUDE.md にルール明記

## 既知の問題と解決策

| 問題 | 解決策 |
|---|---|
| 白い画面 / CSS 404 | `rm -rf .next && npx next dev`（キャッシュ破損） |
| Cannot find module './331.js' | 同上 |
| WP 認証 401 (rest_not_logged_in) | `.htaccess` の Authorization ヘッダー転送を確認 |
| WP 画像アップ 500 | `convert_to_webp()` のエラーガードを確認 |
| 本番で API エラー | Vercel 環境変数の同期を確認 |
| ビルド失敗 | プロジェクトディレクトリから実行しているか確認 |

## デザインシステム

### グリッド
- 12カラム: `repeat(12, 1fr)` + `column-gap: var(--grid-gutter)`
- 2カラム: 左 `1 / span 4`, 右 `6 / -1`（列5がgap）
- モバイル(≤900px): `1fr` + `grid-column: 1 / -1`
- 全セルに `min-width: 0`（はみ出し防止）
- デバッグ: `Ctrl+G` でオーバーレイ表示

### テーマ
- ライト: `bg: #ececec`, `fg: #141414`
- ダーク: `bg: #1a1a1a`, `fg: #e8e8e8`
- セレクタ: `[data-theme="dark"]`（`prefers-color-scheme` ではない）
- SSRフリッカー防止: inline script で localStorage から復元

### スペーシング
- 全て `clamp()` ベース（8pxグリッド基準）
- CSS カスタムプロパティ: `--space-1` 〜 `--space-14`

### タイポグラフィ
- `--font-meta`: 12px（メタ情報）
- `--font-body`: 15px（本文）
- `--font-heading`: 18px（見出し）
- `--font-brand`: 22px（ブランド）
- CJK: `line-height: 1.7-2.0`, `letter-spacing: 0.04em`

## 開発時の注意事項

- `.env.local` を変更したら `./scripts/sync-env-to-vercel.sh` で Vercel に同期する
- 新しい CSS クラスを追加したらモバイルオーバーライドも同時に追加する
- `grid-column` の中央配置は `4 / span 6`（`3 / span 6` は左寄り）
- インラインスタイルでレイアウト指定せず CSS クラスを使う
- 固定 px 幅 + `margin-left: auto` → 使わない（grid-column で配置）
