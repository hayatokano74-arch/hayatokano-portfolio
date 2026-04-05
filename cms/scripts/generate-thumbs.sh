#!/bin/bash
# 全画像のサムネイル（thumb_*.webp）を生成する
# 長辺400pxのWebPサムネイル。メディア管理画面のグリッド表示用。
#
# 使い方: bash scripts/generate-thumbs.sh [ディレクトリ]

set -e

TARGET_DIR="${1:-$HOME/hayatokano.com/public_html/media}"
CREATED=0
SKIPPED=0

echo "=== サムネイル一括生成 ==="
echo "対象: $TARGET_DIR"

find "$TARGET_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) \
  -not -name "thumb_*" -not -name "*.webp" | while read -r src; do
    dir=$(dirname "$src")
    base=$(basename "$src")
    thumb="$dir/thumb_${base}.webp"

    if [ -f "$thumb" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if cwebp -q 60 -quiet -resize 400 0 "$src" -o "$thumb" 2>/dev/null; then
        CREATED=$((CREATED + 1))
    fi
done

echo "完了"
