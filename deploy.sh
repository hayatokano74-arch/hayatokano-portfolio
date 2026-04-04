#!/bin/bash
# deploy.sh — hayatokano.com を Xserver へ静的デプロイ
# 使い方: ./deploy.sh
# 前提: ssh xserver が ~/.ssh/config で設定済み
#
# 安全設計:
#   - デプロイ前にサーバーDBを自動バックアップ（3世代保持）
#   - db/ uploads/ .env.php はサーバーに絶対に送信しない
#   - デプロイ後にDB件数を比較、減少時は自動ロールバック

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_USER_HOST="xserver"
REMOTE_DIR="~/hayatokano.com/public_html"
DB_PATH="_cms/db/hayatokano.sqlite3"
DB_FULL_PATH="\$HOME/hayatokano.com/public_html/_cms/db/hayatokano.sqlite3"
BACKUP_DIR="\$HOME/hayatokano.com/backups"

# ─── ステップ 0: デプロイ前DBバックアップ＋件数記録 ───
echo "=== [0/4] デプロイ前: DBバックアップ＋件数チェック ==="

# サーバー上でバックアップ作成（3世代保持）
ssh "$REMOTE_USER_HOST" bash -s <<'REMOTE_BACKUP'
  DB="$HOME/hayatokano.com/public_html/_cms/db/hayatokano.sqlite3"
  BACKUP_DIR="$HOME/hayatokano.com/backups"
  mkdir -p "$BACKUP_DIR"

  if [ ! -f "$DB" ]; then
    echo "エラー: DB が見つかりません: $DB"
    exit 1
  fi

  # WALをDBに統合してからバックアップ
  sqlite3 "$DB" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true

  STAMP=$(date '+%Y%m%d-%H%M%S')
  cp "$DB" "$BACKUP_DIR/hayatokano.sqlite3.bak-${STAMP}"
  echo "バックアップ作成: hayatokano.sqlite3.bak-${STAMP}"

  # 古いバックアップを削除（3世代保持）
  ls -1t "$BACKUP_DIR"/hayatokano.sqlite3.bak-* 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null
  echo "現在のバックアップ:"
  ls -1t "$BACKUP_DIR"/hayatokano.sqlite3.bak-* 2>/dev/null | head -3
REMOTE_BACKUP

# デプロイ前の件数を記録
BEFORE_COUNTS=$(ssh "$REMOTE_USER_HOST" "sqlite3 ~/hayatokano.com/public_html/_cms/db/hayatokano.sqlite3 \
  'SELECT \"works:\" || COUNT(*) FROM works; \
   SELECT \"news:\" || COUNT(*) FROM news; \
   SELECT \"me_no_hoshi:\" || COUNT(*) FROM me_no_hoshi; \
   SELECT \"garden:\" || COUNT(*) FROM garden;'" 2>/dev/null || echo "接続失敗")
echo "デプロイ前件数:"
echo "$BEFORE_COUNTS"

echo ""
echo "=== [1/4] 静的ビルド ==="
cd "$PROJECT_DIR"
STATIC_EXPORT=true npx next build

# フォールバックページを生成（CMS経由で追加された新しいスラッグ用）
echo ""
echo "=== フォールバックページ生成 ==="
for section in garden works me-no-hoshi text; do
  fallback_dir="out/${section}/_fallback"
  mkdir -p "$fallback_dir"
  # 既存の[slug]ページのHTMLを1つコピー（クライアントJSが動けばよい）
  src=$(find "out/${section}" -mindepth 2 -name "index.html" -not -path "*_fallback*" -not -path "*opengraph*" | head -1)
  if [ -n "$src" ]; then
    cp "$src" "$fallback_dir/index.html"
    echo "  ${section}/_fallback/index.html ← $(basename $(dirname $src))"
  fi
done

echo ""
echo "=== [2/4] フロントエンド → Xserver ==="
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
echo "=== [4/4] PHP CMS → Xserver ==="
# db/ uploads/ .env.php はサーバーに絶対に送信しない
rsync -avz \
  --exclude="db/" \
  --exclude="uploads/" \
  --exclude=".env.php" \
  cms/ "${REMOTE_USER_HOST}:${REMOTE_DIR}/_cms/"

# ─── デプロイ後: DB件数検証 ───
echo ""
echo "=== デプロイ後DBチェック ==="
AFTER_COUNTS=$(ssh "$REMOTE_USER_HOST" "sqlite3 ~/hayatokano.com/public_html/_cms/db/hayatokano.sqlite3 \
  'SELECT \"works:\" || COUNT(*) FROM works; \
   SELECT \"news:\" || COUNT(*) FROM news; \
   SELECT \"me_no_hoshi:\" || COUNT(*) FROM me_no_hoshi; \
   SELECT \"garden:\" || COUNT(*) FROM garden;'" 2>/dev/null || echo "接続失敗")
echo "$AFTER_COUNTS"

# 件数が減っていたら自動ロールバック
if [ "$BEFORE_COUNTS" != "$AFTER_COUNTS" ]; then
  echo ""
  echo "🚨 DB件数が変化！自動ロールバックを実行します..."
  echo "BEFORE: $BEFORE_COUNTS"
  echo "AFTER:  $AFTER_COUNTS"

  # 最新バックアップからロールバック
  ssh "$REMOTE_USER_HOST" bash -s <<'REMOTE_ROLLBACK'
    BACKUP_DIR="$HOME/hayatokano.com/backups"
    DB="$HOME/hayatokano.com/public_html/_cms/db/hayatokano.sqlite3"
    LATEST=$(ls -1t "$BACKUP_DIR"/hayatokano.sqlite3.bak-* 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      cp "$LATEST" "$DB"
      echo "ロールバック完了: $LATEST → $DB"
      sqlite3 "$DB" "SELECT 'works:' || COUNT(*) FROM works; SELECT 'garden:' || COUNT(*) FROM garden;"
    else
      echo "エラー: バックアップが見つかりません"
      exit 1
    fi
REMOTE_ROLLBACK

  echo ""
  echo "⚠️  DBはロールバックされました。デプロイ内容を確認してください。"
  exit 1
fi

echo ""
echo "=== デプロイ完了 ✓ ==="
echo "  DB件数: 変化なし"
echo "  本番: https://hayatokano.com"
echo "  CMS:  https://hayatokano.com/_cms/"
