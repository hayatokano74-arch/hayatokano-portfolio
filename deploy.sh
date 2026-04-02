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
ssh "$REMOTE_USER_HOST" "cat > ${REMOTE_DIR}/.htaccess" << 'HTACCESS'
# hayatokano.com — Next.js 静的エクスポート用 .htaccess
Options -Indexes
RewriteEngine On

# HTTPS リダイレクト
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# www なし正規化
RewriteCond %{HTTP_HOST} ^www\.hayatokano\.com [NC]
RewriteRule ^(.*)$ https://hayatokano.com/$1 [L,R=301]

# trailingSlash 対応: /about → /about/ → /about/index.html
# Next.js の output: 'export' + trailingSlash: true はディレクトリ構造で生成
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\.
RewriteRule ^(.+[^/])$ /$1/ [L,R=301]

# ディレクトリのリクエストを index.html に
DirectoryIndex index.html

# 404 エラー
ErrorDocument 404 /404.html
HTACCESS

echo ""
echo "=== デプロイ完了 ==="
echo "本番サイト: https://hayatokano.com"
