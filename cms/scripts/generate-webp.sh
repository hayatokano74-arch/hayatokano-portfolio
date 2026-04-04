#!/bin/bash
# 全画像のWebP版を事前生成する
#
# 元画像（.jpg/.jpeg/.png）の横に .webp ファイルを生成する。
# 例: photo.jpg → photo.jpg.webp
#
# 元画像は一切変更しない。WebP版が既に存在する場合はスキップする。
#
# 使い方: bash scripts/generate-webp.sh [ディレクトリ]
# デフォルト: $HOME/hayatokano.com/public_html/media

set -e

TARGET_DIR="${1:-$HOME/hayatokano.com/public_html/media}"
QUALITY=80
TOTAL=0
CREATED=0
SKIPPED=0
FAILED=0

echo "=== WebP 一括変換 ==="
echo "対象: $TARGET_DIR"
echo "品質: $QUALITY"
echo ""

# jpg, jpeg, JPG, png を対象
find "$TARGET_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r src; do
    TOTAL=$((TOTAL + 1))
    webp="${src}.webp"

    # 既にWebP版があればスキップ
    if [ -f "$webp" ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # cwebp で変換（元画像は読み取りのみ）
    if cwebp -q "$QUALITY" -quiet "$src" -o "$webp" 2>/dev/null; then
        CREATED=$((CREATED + 1))
    else
        FAILED=$((FAILED + 1))
        echo "  ✗ $src"
    fi
done

echo ""
echo "=== 完了 ==="
echo "変換: $CREATED"
echo "スキップ: $SKIPPED"
echo "失敗: $FAILED"
