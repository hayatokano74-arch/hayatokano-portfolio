# アーキテクチャ概要

## システム構成

```
ブラウザ
  │
  ▼
Vercel (hayatokano.com)
  │  Next.js 15 App Router + TypeScript
  │  SSR + ISR
  │
  ▼  REST API (wp-json/hayato/v1/*)
Xserver (wp.hayatokano.com)
     WordPress (ヘッドレスCMS)
```

## 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript | Vercel でホスティング |
| スタイリング | CSS カスタムプロパティ + globals.css | 12カラムグリッド、clamp()ベースのFluidスペーシング |
| CMS | WordPress (ヘッドレス) | Xserver、カスタム REST API |
| API | `wp-json/hayato/v1/*` | Works, Timeline, MeNoHoshi 等 |
| ドメイン | Squarespace (登録) / Xserver (DNS) | ネームサーバーは ns1-5.xserver.jp |

## データフロー

1. Next.js がサーバーサイドで WP REST API を呼び出す (`lib/wp/client.ts` の `fetchWpApi`)
2. レスポンスを正規化して React コンポーネントに渡す (`lib/works.ts`, `lib/timeline.ts` 等)
3. ISR でキャッシュし、再検証時に WP から最新データを取得

## 主要ディレクトリ

```
src/
├── app/           # ページルーティング (App Router)
├── components/    # 共有UIコンポーネント
└── lib/
    └── wp/        # WP REST API クライアント・型定義
scripts/           # 運用スクリプト (env同期等)
```

## デザインシステム

- **グリッド**: 12カラム (`repeat(12, 1fr)`)、2カラム配置は左 `1/span 4` + 右 `6/-1`
- **テーマ**: `[data-theme="dark"]` セレクタによるライト/ダーク切替
- **スペーシング**: `--space-1` ~ `--space-14` (clamp()ベース、8pxグリッド基準)
- **タイポグラフィ**: `--font-meta`(12px) / `--font-body`(15px) / `--font-heading`(18px) / `--font-brand`(22px)
