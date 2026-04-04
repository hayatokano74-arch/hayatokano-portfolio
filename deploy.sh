#!/bin/bash
# deploy.sh — hayatokano.com を Xserver へ静的デプロイ
# 使い方: ./deploy.sh
# 前提: ssh xserver が ~/.ssh/config で設定済み

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_USER_HOST="xserver"
REMOTE_DIR="~/hayatokano.com/public_html"

echo "=== [1/3] 静的ビルド ==="
cd "$PROJECT_DIR"
STATIC_EXPORT=true npx next build

echo ""
echo "=== [2/3] Xserver へ rsync ==="
# --delete で不要ファイルを削除するが、サーバー固有のディレクトリは除外
rsync -avz --delete \
  --exclude="wp/" \
  --exclude="wp-*" \
  --exclude="kiwamarisou.hayatokano.com/" \
  --exclude="media.hayatokano.com/" \
  --exclude="media/" \
  --exclude="uploads/" \
  --exclude=".htaccess" \
  --exclude="*.php" \
  --exclude="license.txt" \
  --exclude="readme.html" \
  --exclude="default_page.png" \
  out/ "${REMOTE_USER_HOST}:${REMOTE_DIR}/"

echo ""
echo "=== [3/3] .htaccess を配置 ==="
# deploy/.htaccess をサーバーに転送（GitHub Actions でも同じファイルを使用）
rsync -avz \
  deploy/.htaccess \
  "${REMOTE_USER_HOST}:${REMOTE_DIR}/.htaccess"

echo ""
echo "=== [4/4] PHP CMS を Xserver へ転送 ==="
# cms/ を _cms/ として転送
# --delete は使わない（db/hayatokano.sqlite3 と uploads/ を保護するため）
# db/ と uploads/ は除外（サーバー側のデータを上書きしない）
rsync -avz \
  --exclude="db/*.sqlite3" \
  --exclude="db/password.hash" \
  --exclude="uploads/" \
  --exclude=".env.php" \
  cms/ "${REMOTE_USER_HOST}:${REMOTE_DIR}/_cms/"

echo ""
echo "=== デプロイ完了 ==="
echo "本番サイト: https://hayatokano.com"
echo "CMS: https://hayatokano.com/_cms/"
