#!/bin/bash
# 既存画像にレスポンシブ用の中間サイズ WebP を追加生成する（w640_ / w1080_ / w1920_）
#
# upload.php の新規アップロード時と同じロジックを、過去にアップロード済みの
# 画像に対してバックフィルするための一括処理。
# 元画像・既存の配信用WebP（長辺2560px）・サムネイルには一切触れない。
# 全ブレークポイントを必ず生成する（元画像がブレークポイントより小さい場合は原寸のまま書き出す）。
#
# 使い方: bash scripts/generate-responsive-webp.sh [ディレクトリ]

set -e

TARGET_DIR="${1:-$HOME/hayatokano.com/public_html/media}"
QUALITY=80
BREAKPOINTS=(640 1080 1920)

echo "=== レスポンシブ WebP 一括生成 ==="
echo "対象: $TARGET_DIR"
echo "ブレークポイント: ${BREAKPOINTS[*]}px（品質${QUALITY}）"
echo ""

CREATED=0
SKIPPED=0
FAILED=0

find "$TARGET_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) \
  -not -name "thumb_*" -not -name "w[0-9]*_*" -not -name "*.jpg.webp" -not -name "*.jpeg.webp" -not -name "*.png.webp" | while read -r src; do

    dims=$(identify -format "%w %h" "$src" 2>/dev/null || echo "0 0")
    w=$(echo "$dims" | awk '{print $1}')
    h=$(echo "$dims" | awk '{print $2}')
    max_dim=$((w > h ? w : h))
    if [ "$max_dim" -eq 0 ]; then
        FAILED=$((FAILED + 1))
        continue
    fi

    dir=$(dirname "$src")
    base=$(basename "$src")

    for bp in "${BREAKPOINTS[@]}"; do
        out="$dir/w${bp}_${base}.webp"
        if [ -f "$out" ]; then
            SKIPPED=$((SKIPPED + 1))
            continue
        fi
        target=$bp
        resize_flag="-resize $bp 0"
        if [ "$max_dim" -le "$bp" ]; then
            resize_flag=""
        fi
        if cwebp -q "$QUALITY" -quiet $resize_flag "$src" -o "$out" 2>/dev/null; then
            CREATED=$((CREATED + 1))
        else
            FAILED=$((FAILED + 1))
        fi
    done
done

echo ""
echo "=== 完了 ==="
echo "生成: $CREATED  スキップ: $SKIPPED  失敗: $FAILED"
