# プロジェクト構造図

## ページ → コンポーネント依存関係

```mermaid
graph LR
  subgraph Pages["ページ (src/app/)"]
    Home["/ (TopHero)"]
    Works["/works"]
    WorkSlug["/works/[slug]"]
    Text["/text"]
    TextSlug["/text/[slug]"]
    TextRead["/text/[slug]/reading"]
    MeNo["/me-no-hoshi"]
    MeNoSlug["/me-no-hoshi/[slug]"]
    Timeline["/timeline"]
    TimeSlug["/timeline/[id]"]
    News["/news"]
    About["/about"]
    Contact["/contact"]
  end

  subgraph Components["コンポーネント (src/components/)"]
    CS[CanvasShell]
    HD[Header]
    TH[TopHero]
    WC[WorksClient]
    WDC[WorkDetailClient]
    WDT[WorkDetailsTable]
    MND[MeNoHoshiDetail]
    TV[TimelineView]
    NV[NewsView]
    TT[TextToc]
    CF[ContactForm]
  end

  Home --> TH
  Works --> CS & HD & WC & WDT
  WorkSlug --> CS & WDC
  Text --> CS & HD
  TextSlug --> CS & HD & TT
  TextRead --> CS & TT
  MeNo --> CS & HD & WC
  MeNoSlug --> CS & HD & MND
  Timeline --> CS & HD & TV
  TimeSlug --> CS & HD
  News --> CS & HD & NV
  About --> CS & HD
  Contact --> CS & HD & CF
```

## コンポーネント間の依存

```mermaid
graph TD
  WDC[WorkDetailClient] --> WDT[WorkDetailsTable]

  subgraph Shared["共有コンポーネント"]
    CS[CanvasShell]
    HD[Header]
  end

  subgraph Lib["データ層 (src/lib/)"]
    mock["mock.ts<br/>works, texts, timeline,<br/>news, about"]
    cat["categories.ts<br/>CATEGORY_MENU"]
    blur["blur.ts<br/>blurDataURL()"]
    site["siteSettings.ts<br/>getTopHeroImage()"]
    mnh["meNoHoshi.ts<br/>getMeNoHoshiPosts()"]
  end

  HD --> cat
  WC[WorksClient] --> mock & blur
  WDC --> mock & blur
  WDT --> mock
  MND[MeNoHoshiDetail] --> mnh & blur
  TV[TimelineView] --> mock & blur
  NV[NewsView] --> mock & blur
  TH[TopHero] --> site
```

## レイアウト構造ツリー

```
RootLayout (layout.tsx)
├── ThemeScript        … SSRフリッカー防止
├── ThemeToggle        … ダーク/ライト切替（固定位置）
└── GridDebugOverlay   … Ctrl+G でグリッド表示（dev用）

各ページ共通:
CanvasShell (<main class="page-shell">)
└── Header
    ├── ブランド名 (HAYATO KANO)
    ├── デスクトップナビ (Works / Text / 目の星 / ...)
    ├── カテゴリ行 (All / Photography / Video / ...)
    ├── 検索
    └── モバイルメニュー
```

## ページ別レイアウト

```
/ (トップ)
└── TopHero (全画面ヒーロー)
    ├── 背景画像 + ホバー切替
    ├── 左下: 最新Works一覧 (列1-4)
    └── 右下: ナビメニュー (列5-12)

/works (一覧)
└── WorksClient
    ├── グリッド表示 (auto-fit, minmax 190px)
    └── リスト表示 (12カラム subgrid)
        └── WorkDetailsTable

/works/[slug] (詳細)
└── WorkDetailClient
    ├── ギャラリーモード (全画面スライドショー)
    ├── インデックスモード (グリッド一覧)
    └── ディテールオーバーレイ
        └── WorkDetailsTable (subgrid)

/me-no-hoshi/[slug] (詳細)
└── MeNoHoshiDetail (2カラム)
    ├── 左: タイトル + DETAILS テーブル + BIO + ステートメント
    └── 右: KEY VISUAL + PAST WORKS + ARCHIVE

/timeline
└── TimelineView (12カラムグリッド)
    ├── フィルタタブ (すべて / 写真 / テキスト)
    ├── 日付グルーピング + 投稿一覧
    └── アーカイブサイドバー (列10-12)

/text/[slug]
├── 本文 (左)
└── TextToc 目次 (右サイドバー)

/news
└── NewsView (アコーディオン)
    └── 各記事: summary行 + detail展開

/about (2カラム)
├── 左: ステートメント + CV
└── 右: 写真一覧

/contact
└── ContactForm
```

## データフロー

```mermaid
graph TB
  subgraph External["外部データソース"]
    WP["WordPress<br/>(WPGraphQL)"]
    ENV["環境変数<br/>(.env.local)"]
  end

  subgraph Lib["データ層"]
    site["siteSettings.ts"]
    mnh["meNoHoshi.ts"]
    mock["mock.ts<br/>(フォールバック)"]
  end

  subgraph RSC["サーバーコンポーネント (page.tsx)"]
    P["各ページ"]
  end

  subgraph Client["クライアントコンポーネント"]
    C["インタラクティブUI"]
  end

  WP -->|API| site & mnh
  ENV -->|設定| site
  mock -->|フォールバック| mnh
  mock -->|直接参照| P
  site & mnh -->|async| P
  P -->|props| C
```

## ファイル一覧と影響度

| ファイル | 依存先の数 | 影響度 |
|---------|-----------|--------|
| `lib/mock.ts` | 8+ | **高** |
| `lib/blur.ts` | 6+ | **高** |
| `components/CanvasShell.tsx` | 10+ | **高** |
| `components/Header.tsx` | 10+ | **高** |
| `lib/categories.ts` | 3 | 中 |
| `components/WorksClient.tsx` | 2 | 中 |
| `lib/meNoHoshi.ts` | 2 | 中 |
| `lib/siteSettings.ts` | 1 | 低 |
