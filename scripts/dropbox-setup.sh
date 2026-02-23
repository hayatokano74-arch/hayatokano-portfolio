#!/bin/bash
#
# Dropbox OAuth セットアップスクリプト
# App key / App secret を .env.local に保存し、refresh token を取得する
#

set -e

ENV_FILE="$(dirname "$0")/../.env.local"

echo ""
echo "=== Dropbox Garden セットアップ ==="
echo ""

# Step 1: App key と App secret を入力
read -p "Dropbox App key を入力: " APP_KEY
read -sp "Dropbox App secret を入力: " APP_SECRET
echo ""

if [ -z "$APP_KEY" ] || [ -z "$APP_SECRET" ]; then
  echo "エラー: App key と App secret は必須です"
  exit 1
fi

# Step 2: 認証 URL を開く
AUTH_URL="https://www.dropbox.com/oauth2/authorize?client_id=${APP_KEY}&response_type=code&token_access_type=offline"

echo ""
echo "ブラウザで以下の URL が開きます。"
echo "「許可」をクリックして、表示されるコードをコピーしてください。"
echo ""
open "$AUTH_URL" 2>/dev/null || echo "URL: $AUTH_URL"

echo ""
read -p "認証コードを入力: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
  echo "エラー: 認証コードは必須です"
  exit 1
fi

# Step 3: 認証コードを refresh token に交換
echo ""
echo "トークンを取得中..."

RESPONSE=$(curl -s -X POST "https://api.dropboxapi.com/oauth2/token" \
  -d "code=${AUTH_CODE}" \
  -d "grant_type=authorization_code" \
  -d "client_id=${APP_KEY}" \
  -d "client_secret=${APP_SECRET}")

# refresh_token を抽出
REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null)

if [ -z "$REFRESH_TOKEN" ]; then
  echo "エラー: トークン取得に失敗しました"
  echo "レスポンス: $RESPONSE"
  exit 1
fi

# Step 4: .env.local に追記
# 既存の DROPBOX_ 行を削除して再追加
if [ -f "$ENV_FILE" ]; then
  grep -v "^DROPBOX_" "$ENV_FILE" > "${ENV_FILE}.tmp" || true
  mv "${ENV_FILE}.tmp" "$ENV_FILE"
fi

cat >> "$ENV_FILE" <<EOF
DROPBOX_APP_KEY=${APP_KEY}
DROPBOX_APP_SECRET=${APP_SECRET}
DROPBOX_REFRESH_TOKEN=${REFRESH_TOKEN}
EOF

echo ""
echo "=== セットアップ完了 ==="
echo ".env.local に以下を保存しました:"
echo "  DROPBOX_APP_KEY"
echo "  DROPBOX_APP_SECRET"
echo "  DROPBOX_REFRESH_TOKEN"
echo ""
echo "次のステップ: Dropbox の「アプリ/GardenSync」フォルダに Garden の .md ファイルを配置してください"
