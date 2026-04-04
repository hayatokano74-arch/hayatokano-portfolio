#!/bin/bash
# deploy.sh — hayatokano.com を Xserver へ静的デプロイ
# 使い方: ./deploy.sh
# 前提: ssh xserver が ~/.ssh/config で設定済み

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_USER_HOST="xserver"
REMOTE_DIR="~/hayatokano.com/public_html"
DB_PATH="_cms/db/hayatokano.sqlite3"

# ─── デプロイ前: サーバーDBの件数を記録 ───
echo "=== [0/4] デプロイ前DBチェック ==="
BEFORE_COUNTS=$(ssh "$REMOTE_USER_HOST" "sqlite3 ~/${REMOTE_DIR#~/}/${DB_PATH} \
  'SELECT \"works:\" || COUNT(*) FROM works; \
   SELECT \"news:\" || COUNT(*) FROM news; \
   SELECT \"me_no_hoshi:\" || COUNT(*) FROM me_no_hoshi; \
   SELECT \"garden:\" || COUNT(*) FROM garden;'" 2>/dev/null || echo "接続失敗")
echo "$BEFORE_COUNTS"

echo ""
echo "=== [1/4] 静的ビルド ==="
cd "$PROJECT_DIR"
STATIC_EXPORT=true npx next build

echo ""
echo "=== [2/4] Xserver へ rsync ==="
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
  --exclude="_cms/" \
  out/ "${REMOTE_USER_HOST}:${REMOTE_DIR}/"

echo ""
echo "=== [3/4] .htaccess を配置 ==="
rsync -avz \
  deploy/.htaccess \
  "${REMOTE_USER_HOST}:${REMOTE_DIR}/.htaccess"

echo ""
echo "=== [4/4] PHP CMS を Xserver へ転送 ==="
# db/ と uploads/ はディレクトリごと除外（サーバー側のデータを絶対に上書きしない）
rsync -avz \
  --exclude="db/" \
  --exclude="uploads/" \
  --exclude=".env.php" \
  cms/ "${REMOTE_USER_HOST}:${REMOTE_DIR}/_cms/"

# ─── デプロイ後: サーバーDBの件数を検証 ───
echo ""
echo "=== デプロイ後DBチェック ==="
AFTER_COUNTS=$(ssh "$REMOTE_USER_HOST" "sqlite3 ~/${REMOTE_DIR#~/}/${DB_PATH} \
  'SELECT \"works:\" || COUNT(*) FROM works; \
   SELECT \"news:\" || COUNT(*) FROM news; \
   SELECT \"me_no_hoshi:\" || COUNT(*) FROM me_no_hoshi; \
   SELECT \"garden:\" || COUNT(*) FROM garden;'" 2>/dev/null || echo "接続失敗")
echo "$AFTER_COUNTS"

# 件数比較: デプロイ後にデータが減っていたら警告
if [ "$BEFORE_COUNTS" != "$AFTER_COUNTS" ]; then
  echo ""
  echo "⚠️  警告: デプロイ前後でDB件数が変わっています！"
  echo "BEFORE:"
  echo "$BEFORE_COUNTS"
  echo "AFTER:"
  echo "$AFTER_COUNTS"
  echo ""
  echo "データが消失した場合: ローカルDBからリストアしてください"
  echo "  rsync -avz cms/db/hayatokano.sqlite3 xserver:~/hayatokano.com/public_html/_cms/db/"
  exit 1
fi

echo ""
echo "=== デプロイ完了（DB件数変化なし ✓） ==="
echo "本番サイト: https://hayatokano.com"
echo "CMS: https://hayatokano.com/_cms/"
