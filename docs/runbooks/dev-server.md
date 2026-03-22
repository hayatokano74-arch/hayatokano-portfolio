# 開発サーバー起動手順

## 通常の起動

```bash
cd ~/Projects/hayatokano-portfolio
npx next dev -p 3000
```

ブラウザで http://localhost:3000 を開く。

## キャッシュクリア付き起動

白い画面、CSS 404、`__webpack_modules__` エラーが出た場合：

```bash
cd ~/Projects/hayatokano-portfolio
lsof -ti:3000 | xargs kill -9   # 既存プロセスを停止
rm -rf .next                      # キャッシュを削除
npx next dev -p 3000
```

## 動作確認チェック

CSS/TSX を変更したら、以下の主要ページが 200 を返すか確認する：

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/works
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/about
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/timeline
```

## よくある問題

| 症状 | 原因 | 対処 |
|---|---|---|
| 白い画面 / CSS 404 | `.next` キャッシュ破損 | `rm -rf .next && npx next dev` |
| Cannot find module './331.js' | 同上 | 同上 |
| ビルド失敗 | ホームディレクトリから実行 | プロジェクトディレクトリに `cd` してから実行 |
| ポート3000が使用中 | 前のプロセスが残っている | `lsof -ti:3000 \| xargs kill -9` |
