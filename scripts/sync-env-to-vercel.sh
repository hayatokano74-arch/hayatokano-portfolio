#!/bin/bash
#
# .env.local の環境変数を Vercel に同期するスクリプト
# 使い方: ./scripts/sync-env-to-vercel.sh [変数名...]
#   引数なし → 全変数を同期
#   引数あり → 指定した変数のみ同期
#

set -euo pipefail

SCOPE="team_s8LqVICziJw8ChEtAA3SKQ7c"
ENV_FILE=".env.local"
ENVS=("production" "preview" "development")

if [ ! -f "$ENV_FILE" ]; then
  echo "エラー: $ENV_FILE が見つかりません"
  exit 1
fi

# 同期対象の変数名リスト
if [ $# -gt 0 ]; then
  TARGETS=("$@")
else
  TARGETS=()
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    key="${line%%=*}"
    TARGETS+=("$key")
  done < "$ENV_FILE"
fi

echo "=== Vercel 環境変数同期 ==="
echo "対象: ${TARGETS[*]}"
echo ""

for key in "${TARGETS[@]}"; do
  value=$(grep "^${key}=" "$ENV_FILE" | cut -d= -f2-)
  if [ -z "$value" ]; then
    echo "スキップ: $key （.env.local に値がありません）"
    continue
  fi

  echo "同期中: $key"

  # 既存の変数を削除（エラーは無視）
  for env in "${ENVS[@]}"; do
    echo "$value" | npx vercel env rm "$key" "$env" --yes --scope "$SCOPE" 2>/dev/null || true
  done

  # 新しい値を追加
  for env in "${ENVS[@]}"; do
    echo "$value" | npx vercel env add "$key" "$env" --scope "$SCOPE" 2>/dev/null
  done

  echo "  → 完了"
done

echo ""
echo "=== 同期完了 ==="
echo "反映にはデプロイが必要です: npx vercel --prod --scope $SCOPE"
