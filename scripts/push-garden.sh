#!/bin/bash
#
# Garden コンテンツを git push するスクリプト
# iCloud 上の Obsidian Vault → git リポジトリにコピーして push
#
# 使い方: ./scripts/push-garden.sh
#

set -e

cd "$(dirname "$0")/.."

ICLOUD_GARDEN="$HOME/Library/Mobile Documents/iCloud~md~obsidian/Documents/garden"
LOCAL_GARDEN="content/garden"

# iCloud にファイルがあるか確認
if [ ! -d "$ICLOUD_GARDEN" ]; then
  echo "エラー: iCloud の Garden フォルダが見つかりません: $ICLOUD_GARDEN"
  exit 1
fi

# シンボリックリンクを削除
if [ -L "$LOCAL_GARDEN" ]; then
  rm "$LOCAL_GARDEN"
elif [ -d "$LOCAL_GARDEN" ]; then
  rm -rf "$LOCAL_GARDEN"
fi

# iCloud から実ファイルをコピー（.obsidian は除外）
mkdir -p "$LOCAL_GARDEN"
rsync -av --exclude='.obsidian' --exclude='.DS_Store' "$ICLOUD_GARDEN/" "$LOCAL_GARDEN/"

# git add, commit, push
git add "$LOCAL_GARDEN/"
if git diff --cached --quiet "$LOCAL_GARDEN/"; then
  echo "Garden に変更はありません"
else
  git commit -m "Garden 更新"
  git push
  echo "Garden を push しました"
fi

# 実ファイルを削除してシンボリックリンクを復元
rm -rf "$LOCAL_GARDEN"
ln -s "$ICLOUD_GARDEN" "$LOCAL_GARDEN"

echo "シンボリックリンクを復元しました"
