#!/usr/bin/env bash
# ============================================================
# Garden 画像最適化スクリプト（Xserver 実行用）
#
# 元画像（garden-images/）に一切触れず、
# garden-images-opt/ に最適化コピーを生成する。
#
# 生成ファイル（1枚あたり4ファイル）:
#   filename_1920.webp  デスクトップ用 (max 1920px, q=82)
#   filename_640.webp   モバイル用     (max 640px,  q=78)
#   filename_lqip.webp  ぼかしプレースホルダー (40px, q=30)
#   filename_1920.jpg   WebP非対応フォールバック (q=82)
#
# 使い方:
#   bash optimize-images.sh              # 全画像を処理
#   bash optimize-images.sh --dry-run    # 実行せず件数だけ表示
#
# 冪等: 生成済みファイルはスキップする
# ============================================================

set -euo pipefail

# --- 設定 ---
SRC_DIR="/home/hayatokano/hayatokano.com/public_html/wp/garden-images"
DST_DIR="/home/hayatokano/hayatokano.com/public_html/wp/garden-images-opt"
DRY_RUN=false
TOTAL=0
SKIPPED=0
CONVERTED=0
ERRORS=0
LOG_INTERVAL=100

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "[DRY-RUN] 実際の変換は行いません"
fi

# --- 前提チェック ---
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "エラー: $1 が見つかりません。インストールしてください。"
    exit 1
  fi
}

check_command convert   # ImageMagick
check_command cwebp     # libwebp

if [[ ! -d "$SRC_DIR" ]]; then
  echo "エラー: ソースディレクトリが存在しません: $SRC_DIR"
  exit 1
fi

echo "====================================="
echo " Garden 画像最適化スクリプト"
echo "====================================="
echo "ソース: $SRC_DIR"
echo "出力先: $DST_DIR"
echo ""

# --- メイン処理 ---
process_image() {
  local src_path="$1"
  local relative="${src_path#$SRC_DIR/}"
  local dir_part
  dir_part="$(dirname "$relative")"
  local filename
  filename="$(basename "$relative")"
  local name_noext="${filename%.*}"
  local dst_subdir="$DST_DIR/$dir_part"

  # 出力先パス
  local webp_1920="$dst_subdir/${name_noext}_1920.webp"
  local webp_640="$dst_subdir/${name_noext}_640.webp"
  local webp_lqip="$dst_subdir/${name_noext}_lqip.webp"
  local jpg_1920="$dst_subdir/${name_noext}_1920.jpg"

  TOTAL=$((TOTAL + 1))

  # 冪等チェック: 4ファイル全て存在すればスキップ
  if [[ -f "$webp_1920" && -f "$webp_640" && -f "$webp_lqip" && -f "$jpg_1920" ]]; then
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  if $DRY_RUN; then
    echo "  [変換予定] $relative"
    CONVERTED=$((CONVERTED + 1))
    return
  fi

  # 出力ディレクトリ作成
  mkdir -p "$dst_subdir"

  # 一時ファイル用
  local tmp_1920="/tmp/opt_1920_$$.jpg"
  local tmp_640="/tmp/opt_640_$$.jpg"
  local tmp_lqip="/tmp/opt_lqip_$$.jpg"

  # ImageMagick でリサイズ（元画像は読み取り専用）
  # -auto-orient: EXIF回転を適用
  # -strip: メタデータ除去（ファイルサイズ削減）
  if ! nice -n 19 convert "$src_path" -auto-orient -strip -resize "1920x1920>" -quality 82 "$tmp_1920" 2>/dev/null; then
    echo "  [エラー] リサイズ失敗: $relative"
    ERRORS=$((ERRORS + 1))
    rm -f "$tmp_1920" "$tmp_640" "$tmp_lqip"
    return
  fi

  nice -n 19 convert "$src_path" -auto-orient -strip -resize "640x640>"  -quality 78 "$tmp_640"  2>/dev/null || true
  nice -n 19 convert "$src_path" -auto-orient -strip -resize "40x40>"    -quality 30 -blur 0x2 "$tmp_lqip" 2>/dev/null || true

  # WebP 変換（cwebp）
  nice -n 19 cwebp -q 82 -m 4 "$tmp_1920" -o "$webp_1920" 2>/dev/null || true
  nice -n 19 cwebp -q 78 -m 4 "$tmp_640"  -o "$webp_640"  2>/dev/null || true
  nice -n 19 cwebp -q 30 -m 4 "$tmp_lqip" -o "$webp_lqip" 2>/dev/null || true

  # JPG フォールバック（1920px版をそのままコピー）
  cp "$tmp_1920" "$jpg_1920"

  # 一時ファイル削除
  rm -f "$tmp_1920" "$tmp_640" "$tmp_lqip"

  CONVERTED=$((CONVERTED + 1))

  # 進捗表示
  if (( CONVERTED % LOG_INTERVAL == 0 )); then
    echo "  [進捗] $CONVERTED 枚変換完了（スキップ: $SKIPPED, エラー: $ERRORS）"
  fi
}

# 画像ファイルを再帰検索して処理
echo "画像をスキャン中..."
while IFS= read -r -d '' img; do
  process_image "$img"
done < <(find "$SRC_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" \) -print0 | sort -z)

# --- 結果サマリー ---
echo ""
echo "====================================="
echo " 完了サマリー"
echo "====================================="
echo "  対象ファイル数: $TOTAL"
echo "  変換済み:       $CONVERTED"
echo "  スキップ:       $SKIPPED"
echo "  エラー:         $ERRORS"

if $DRY_RUN; then
  echo ""
  echo "[DRY-RUN] 実際の変換は行われていません"
fi

echo ""
echo "次のステップ:"
echo "  1. .htaccess を garden-images-opt/ に配置"
echo "  2. curl -I で WebP + Cache-Control ヘッダーを確認"
