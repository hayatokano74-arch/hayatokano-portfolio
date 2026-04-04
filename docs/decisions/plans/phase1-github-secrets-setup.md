# Phase 1 — GitHub Secrets 設定手順

GitHub Actions でのデプロイに必要な Secrets を設定する手順。

**設定場所:**
`https://github.com/hayatokano74-arch/hayatokano-portfolio/settings/secrets/actions`

---

## 必要な Secrets 一覧

### Xserver 接続（SSH）

| Secret 名 | 値の内容 | 取得方法 |
|---|---|---|
| `XSERVER_SSH_KEY` | Xserver に登録済みの SSH 秘密鍵（`~/.ssh/` 内の `id_rsa` など） | `cat ~/.ssh/id_rsa` の出力をそのまま貼る |
| `XSERVER_HOST` | Xserver のホスト名（SSH 設定の `HostName`） | `~/.ssh/config` の `xserver` エントリの `HostName` を確認 |
| `XSERVER_USER` | Xserver の SSH ユーザー名 | `~/.ssh/config` の `xserver` エントリの `User` を確認 |

**確認方法:**
```bash
cat ~/.ssh/config | grep -A 5 "Host xserver"
# 例:
# Host xserver
#   HostName sv****.xserver.jp
#   User hayatokano
#   Port 10022
#   IdentityFile ~/.ssh/id_rsa
```

`XSERVER_HOST` に設定する値 = `HostName` の値
`XSERVER_USER` に設定する値 = `User` の値
`XSERVER_SSH_KEY` に設定する値 = `IdentityFile` で指定した秘密鍵ファイルの中身

### WordPress API（Phase 2 で削除予定）

| Secret 名 | 値の内容 |
|---|---|
| `WP_BASE_URL` | `https://wp.hayatokano.com` |
| `WP_APP_USER` | WordPress Application Password のユーザー名 |
| `WP_APP_PASSWORD` | WordPress Application Password のパスワード |
| `NEXT_PUBLIC_WP_BASE_URL` | `https://wp.hayatokano.com` |
| `WP_MEDIA_HOST` | `wp.hayatokano.com`（ドメインのみ、https:// なし） |
| `REVALIDATE_SECRET` | `.env.local` の `REVALIDATE_SECRET` と同じ値 |

---

## 設定手順

1. GitHub のリポジトリページを開く
2. **Settings → Secrets and variables → Actions** を開く
3. **New repository secret** ボタンをクリック
4. 上記テーブルの Secret を1つずつ追加する

---

## 動作確認手順

Secrets を設定後、以下の手順でワークフローを手動実行してテストする:

1. GitHub の **Actions タブ** を開く
2. **「Xserver へデプロイ」** ワークフローを選択
3. **「Run workflow」** ボタンをクリック → **「Run workflow」** で実行
4. ログを確認し、全ステップが ✅ になることを確認

---

## トラブルシューティング

| エラー | 原因 | 対処 |
|---|---|---|
| `Permission denied (publickey)` | SSH 鍵の設定ミス | `XSERVER_SSH_KEY` の値を確認（改行が正しく含まれているか） |
| `ssh-keyscan: getaddrinfo for host ... failed` | `XSERVER_HOST` が不正 | ホスト名を確認（`sv****.xserver.jp` 形式） |
| `rsync: connection unexpectedly closed` | SSH ポート 10022 への接続失敗 | Xserver の SSH 設定を確認 |
| `next build` が失敗 | WP API に繋がらない | `WP_BASE_URL` 等の Secrets を確認 |

---

## Vercel の削除タイミング

GitHub Actions でのデプロイが**3回以上安定して成功**したことを確認してから削除する。

1. Vercel ダッシュボードで `hayatokano-portfolio` プロジェクトを開く
2. **Settings → General → Delete Project** から削除
3. DNS を Xserver の IP（確認方法: `dig hayatokano.com A`）に変更
   - `A レコード: @ → <Xserver の IP>`
   - 管理画面: Squarespace DNS 設定

**注意:** DNS 変更後は TTL 分（最大 48 時間）の伝播時間がある。変更前に TTL を 300 秒（5分）に下げておくと切り替えが速くなる。
