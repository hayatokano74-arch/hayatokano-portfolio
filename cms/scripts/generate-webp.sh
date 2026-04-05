#!/bin/bash
# 全画像の配信用WebP + サムネイルを生成する
#
# 配信用WebP: 長辺2560px、品質80（.jpg.webp）
# サムネイル: 長辺400px、品質60（thumb_*.webp）
# 元画像は一切変更しない。
#
# 使い方: bash scripts/generate-webp.sh [ディレクトリ]

set -e

TARGET_DIR="${1:-$HOME/hayatokano.com/public_html/media}"
QUALITY=80
THUMB_QUALITY=60
MAX_DIM=2560
THUMB_DIM=400

echo "=== WebP + サムネイル 一括生成 ==="
echo "対象: $TARGET_DIR"
echo "配信用: 長辺${MAX_DIM}px 品質${QUALITY}"
echo "サムネ: 長辺${THUMB_DIM}px 品質${THUMB_QUALITY}"
echo ""

CREATED=0
SKIPPED=0
FAILED=0

find "$TARGET_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) \
  -not -name "thumb_*" | while read -r src; do

    # 配信用WebP
    webp="${src}.webp"
    if [ ! -f "$webp" ]; then
        # 画像サイズを取得してリサイズが必要か判定
        dims=$(identify -format "%w %h" "$src" 2>/dev/null || echo "0 0")
        w=$(echo "$dims" | awk '{print $1}')
        h=$(echo "$dims" | awk '{print $2}')
        resize_flag=""
        if [ "$w" -gt "$MAX_DIM" ] || [ "$h" -gt "$MAX_DIM" ]; then
            resize_flag="-resize $MAX_DIM 0"
        fi
        if cwebp -q "$QUALITY" -quiet $resize_flag "$src" -o "$webp" 2>/dev/null; then
            CREATED=$((CREATED + 1))
        else
            FAILED=$((FAILED + 1))
        fi
    else
        SKIPPED=$((SKIPPED + 1))
    fi

    # サムネイル
    dir=$(dirname "$src")
    base=$(basename "$src")
    thumb="$dir/thumb_${base}.webp"
    if [ ! -f "$thumb" ]; then
        cwebp -q "$THUMB_QUALITY" -quiet -resize "$THUMB_DIM" 0 "$src" -o "$thumb" 2>/dev/null
    fi
done

echo ""
echo "=== 完了 ==="
