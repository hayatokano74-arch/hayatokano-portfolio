# CMS設計ドキュメント

## 基本方針

WordPressとVercelを廃止し、自前のMac＋Xserverだけで完結する構成にする。
外部サービスへの依存をなくすことが最優先。

---

## システム構成（移行後）

```
Mac（ローカル）
├── コンテンツ編集（管理画面 or Ulysses）
├── ビルド（next build → 静的HTML生成）
└── deploy.sh（rsync → Xserver）

Xserver
└── 静的HTMLを配信（WordPressは削除）

外部サービス
└── GitHub（コードとコンテンツの保管のみ）
```

Vercelは不使用。Xserverはすでに契約済みなので追加コストなし。

---

## コンテンツごとの更新フロー

### Garden（毎日〜頻繁）

```
Ulysses で書く
    ↓
Markdownファイルとしてエクスポート
    ↓
content/garden/ フォルダに保存
    ↓
./deploy.sh
```

Ulyssesのエクスポート先を `content/garden/` に設定すれば、
保存するだけで自動的にフォルダに入る。

### Works（頻繁）→ 管理画面（優先度：高）

```
ブラウザで localhost:3000/admin/works を開く
    ↓
タイトル・説明文・カテゴリ・画像を入力
    ↓
「保存」→ content/works/ にMDXファイルが生成される
    ↓
「デプロイ」ボタン → deploy.sh が走る
```

### 目の星（頻繁）→ 管理画面（優先度：高）

```
ブラウザで localhost:3000/admin/me-no-hoshi を開く
    ↓
タイトル・KEY VISUAL・詳細情報・画像を入力
    ↓
「保存」→ content/me-no-hoshi/ にMDXファイルが生成される
    ↓
「デプロイ」ボタン → deploy.sh が走る
```

### News（ときどき）→ 管理画面

```
localhost:3000/admin/news で追加・編集
```

### About（年1回程度）→ 直接ファイル編集

```
content/about/index.mdx を直接編集 → ./deploy.sh
```

---

## 管理画面の設計

### アクセス方法

- `npx next dev` でローカルサーバーを起動
- `localhost:3000/admin` にブラウザでアクセス
- 外部には公開しない（Mac上でのみ動く）
- シンプルなパスワード認証で保護

### ページ構成

```
/admin                  トップ（各セクションへのリンク＋デプロイボタン）
/admin/works            Works 一覧・追加・編集・削除
/admin/works/new        新規作成
/admin/works/[slug]     編集
/admin/me-no-hoshi      目の星 一覧・追加・編集・削除
/admin/me-no-hoshi/new  新規作成
/admin/me-no-hoshi/[slug] 編集
/admin/news             News 一覧・追加・編集
/admin/garden           Garden 一覧（確認・削除のみ）
```

### 技術仕様

- 管理画面は `next dev` 時のみ動作（静的ビルド時は除外）
- 「保存」→ API Route がMDXファイルをファイルシステムに書き込む
- 画像アップロード → `public/media/[section]/` に保存
- 「デプロイ」ボタン → API Route が `deploy.sh` を実行

---

## コンテンツのファイル構造

```
content/
├── works/
│   ├── _template.mdx     ← 新規作成時のテンプレート
│   ├── w001.mdx
│   ├── w002.mdx
│   └── ...
├── me-no-hoshi/
│   ├── _template.mdx
│   ├── m001.mdx
│   └── ...
├── news/
│   ├── news-001.mdx
│   └── ...
├── garden/
│   ├── 2024-01-01.md     ← Ulyssesからエクスポート
│   └── ...
└── about/
    └── index.mdx

public/
└── media/
    ├── works/
    │   ├── w001/         ← 作品ごとにフォルダ
    │   └── ...
    ├── me-no-hoshi/
    └── garden/
```

---

## デプロイの仕組み

```bash
# deploy.sh の処理内容
npm run build          # next build（静的HTML生成）
rsync -av out/ xserver:/path/to/public_html/
```

livgreen-kanriの deploy.sh と同じ方式。

---

## 移行手順

### Phase 1 — コンテンツをファイルに移行
- Works を content/works/*.mdx に変換（すでに一部完了）
- 目の星 を content/me-no-hoshi/*.mdx に変換（すでに一部完了）
- News・About を変換
- lib/ のデータ取得関数をWP APIからローカルファイル読み込みに変更

### Phase 2 — 画像をXserverから移行
- WP上の画像をダウンロード
- public/media/ に配置
- MDXファイル内の画像URLを更新

### Phase 3 — 管理画面を作成（優先度：高）
- /admin ルートを実装
- Works・目の星・News の CRUD
- 画像アップロード
- デプロイボタン

### Phase 4 — deploy.sh を整備
- next build（静的エクスポート）
- Xserver への rsync

### Phase 5 — 切り替え・WP廃止
- DNSをXserverの静的ファイルに向け直す
- WordPressを削除
- Vercelのプロジェクトを削除

---

## 未確認事項（作業開始前に確認が必要）

- Ulyssesのエクスポート形式（frontmatterが含まれるか）
- Gardenの過去1,079件をファイルに変換するか、それとも切り捨てるか
- XserverのNode.js対応状況（deploy.shの実行環境）
