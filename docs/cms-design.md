# CMS設計ドキュメント

## 基本方針

- WordPress・Vercel・外部ストレージを全廃する
- 依存先はXserver（ホスティング）とGitHub（コードバックアップ）のみ
- コンテンツ・画像・コードは全て自分のMacとXserverに存在する

---

## システム全体像

```
Mac（ローカル）
├── 管理画面サーバー（バックグラウンドで常時起動）
│   └── ブラウザで localhost:3000/admin を開いて編集
├── content/         ← テキストコンテンツ（MDXファイル）
├── public/media/    ← 画像ファイル
└── deploy.sh        ← ビルド＋Xserverへ転送

Xserver
└── 静的HTMLを配信（WordPressは削除）

外部サービス
└── GitHub（コードとコンテンツのバックアップのみ）
```

---

## 管理画面

### アクセス方法

Macが起動したら自動でバックグラウンドに立ち上がる。
ブラウザのブックマークをクリックするだけで開ける。ターミナル操作は不要。

### ページ構成

```
/admin                    トップ＋デプロイボタン
/admin/works              Works 一覧
/admin/works/new          新規追加
/admin/works/[slug]       編集・削除
/admin/me-no-hoshi        目の星 一覧
/admin/me-no-hoshi/new    新規追加
/admin/me-no-hoshi/[slug] 編集・削除
/admin/news               News 一覧・追加・編集
/admin/garden             Garden 一覧（確認・削除のみ）
```

### 画像アップロード

編集画面にドラッグ＆ドロップエリアを設ける。
アップロードした画像は `public/media/[section]/[slug]/` に自動保存され、
本文にそのまま挿入される。

### デプロイボタン

管理画面トップの「デプロイ」ボタンを押すと以下が自動で走る：

```
next build（静的HTML生成）
    ↓
rsync → Xserver
    ↓
完了通知
```

---

## コンテンツごとの更新フロー

### Works・目の星・News（管理画面で更新）

```
管理画面を開く
    ↓
新規追加 or 既存を選んで編集
テキスト入力・画像アップロード
    ↓
「保存」
    ↓
「デプロイ」
```

### Garden（Ulyssesで更新）

```
Ulyssesで書く
    ↓
Markdownファイルとしてエクスポート
エクスポート先を content/garden/ に設定
    ↓
管理画面の「デプロイ」を押す
```

### About（直接ファイル編集）

```
content/about/index.mdx を VS Code 等で編集
    ↓
管理画面の「デプロイ」を押す
```

---

## ファイル構造

```
content/
├── works/
│   ├── _template.mdx
│   ├── w001.mdx
│   └── ...
├── me-no-hoshi/
│   ├── _template.mdx
│   ├── m001.mdx
│   └── ...
├── news/
│   └── ...
├── garden/
│   └── ...（Ulyssesからエクスポート）
└── about/
    └── index.mdx

public/
└── media/
    ├── works/
    │   └── w001/（作品ごとにフォルダ）
    ├── me-no-hoshi/
    └── garden/
```

---

## 依存関係まとめ

| サービス | 用途 | 廃止 |
|---|---|---|
| WordPress | CMS | ✅ 廃止 |
| Vercel | ホスティング | ✅ 廃止 |
| Xserver | 静的ファイル配信 | 継続（現在も契約中） |
| GitHub | コードバックアップ | 継続（無料） |
| 外部ストレージ | 画像 | ✅ 不使用（public/media/に保存） |

---

## 実装フェーズ

### Phase 1 — 管理画面の構築（優先度：高）
- /admin ルートの骨格を作成
- Works の一覧・追加・編集・削除
- 目の星の一覧・追加・編集・削除
- 画像アップロード機能
- デプロイボタン
- Mac起動時の自動起動設定

### Phase 2 — コンテンツをローカルファイルに移行
- WPからWorksデータをエクスポート → MDX変換
- WPから目の星データをエクスポート → MDX変換
- WPからNewsデータをエクスポート → MDX変換
- lib/ のデータ取得をWP APIからローカルファイル読み込みに変更

### Phase 3 — 画像の移行
- WP上の画像をダウンロード
- public/media/ に配置・最適化
- MDX内の画像パスを更新

### Phase 4 — deploy.sh の整備
- next build（静的エクスポート）
- Xserverへのrsync

### Phase 5 — 切り替え・WP廃止
- DNSをXserverの静的ファイルに向け直す
- WordPressを削除
- Vercelのプロジェクトを削除
- Xserver契約はそのまま継続

---

## 未確認事項

- Ulyssesのエクスポート形式（frontmatterが含まれるか確認が必要）
- Gardenの過去1,079件をMDXに変換するか否か
