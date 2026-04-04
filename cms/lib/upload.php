<?php
/**
 * 画像アップロード処理
 * MIME 検証 → GD でリサイズ → WebP 変換して保存
 */

require_once dirname(__DIR__) . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * アップロードされた画像を処理して保存する
 *
 * @param array  $file     $_FILES['field'] の値
 * @param string $section  保存先セクション（works, garden, timeline 等）
 * @param string $slug     紐付ける slug（任意）
 * @return array { path: string, url: string, width: int, height: int }
 */
function upload_image(array $file, string $section = 'misc', string $slug = ''): array {
    // アップロードエラー確認
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('アップロードエラー: ' . upload_error_message($file['error']));
    }

    // ファイルサイズ確認
    if ($file['size'] > UPLOAD_MAX_BYTES) {
        throw new RuntimeException('ファイルサイズが大きすぎます（最大 ' . (UPLOAD_MAX_BYTES / 1024 / 1024) . 'MB）');
    }

    // MIME タイプを GD で確認（拡張子は信用しない）
    $info = @getimagesize($file['tmp_name']);
    if (!$info || !in_array($info['mime'], ALLOWED_MIME_TYPES, true)) {
        throw new RuntimeException('許可されていない画像形式です');
    }
    $mime = $info['mime'];
    $orig_w = $info[0];
    $orig_h = $info[1];

    // 保存ディレクトリを確保
    $dest_dir = UPLOAD_DIR . '/' . $section;
    if ($slug) $dest_dir .= '/' . preg_replace('/[^a-z0-9_\-]/', '', $slug);
    if (!is_dir($dest_dir)) mkdir($dest_dir, 0755, true);

    // ファイル名（タイムスタンプ + ランダム8文字、重複を避ける）
    $basename = date('YmdHis') . '_' . bin2hex(random_bytes(4));
    $webp_filename = $basename . '.webp';
    $dest_path = $dest_dir . '/' . $webp_filename;
    $public_path = '/' . $section . ($slug ? '/' . $slug : '') . '/' . $webp_filename;

    // GD で読み込み
    $src = image_create_from_mime($file['tmp_name'], $mime);
    if (!$src) throw new RuntimeException('画像の読み込みに失敗しました');

    // 長辺がリサイズ閾値を超える場合はリサイズ
    [$new_w, $new_h] = calc_resize($orig_w, $orig_h, IMAGE_MAX_DIMENSION);
    if ($new_w !== $orig_w || $new_h !== $orig_h) {
        $dst = imagecreatetruecolor($new_w, $new_h);
        // PNG/WebP の透明処理
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $new_w, $new_h, $orig_w, $orig_h);
        imagedestroy($src);
        $src = $dst;
    } else {
        $new_w = $orig_w;
        $new_h = $orig_h;
    }

    // WebP として保存（品質 85）
    if (!imagewebp($src, $dest_path, 85)) {
        imagedestroy($src);
        throw new RuntimeException('WebP 変換に失敗しました');
    }
    imagedestroy($src);

    // DB にメディアレコードを保存
    $db = get_db();
    $db->prepare('
        INSERT INTO media (filename, path, section, slug, width, height, size_bytes, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $webp_filename,
        $public_path,
        $section,
        $slug,
        $new_w,
        $new_h,
        filesize($dest_path),
        'image/webp',
    ]);

    return [
        'path'   => $public_path,
        'url'    => UPLOAD_URL_PREFIX . $public_path,
        'width'  => $new_w,
        'height' => $new_h,
    ];
}

/** MIME タイプに応じた GD リソースを生成 */
function image_create_from_mime(string $path, string $mime): \GdImage|false {
    return match ($mime) {
        'image/jpeg' => imagecreatefromjpeg($path),
        'image/png'  => imagecreatefrompng($path),
        'image/webp' => imagecreatefromwebp($path),
        'image/gif'  => imagecreatefromgif($path),
        default      => false,
    };
}

/** アスペクト比を保ちながら最大長辺を制限した新サイズを計算 */
function calc_resize(int $w, int $h, int $max): array {
    if ($w <= $max && $h <= $max) return [$w, $h];
    if ($w >= $h) {
        return [$max, (int)round($h * $max / $w)];
    }
    return [(int)round($w * $max / $h), $max];
}

function upload_error_message(int $code): string {
    return match ($code) {
        UPLOAD_ERR_INI_SIZE   => 'php.ini の upload_max_filesize を超えています',
        UPLOAD_ERR_FORM_SIZE  => 'フォームの MAX_FILE_SIZE を超えています',
        UPLOAD_ERR_PARTIAL    => 'ファイルが部分的にしかアップロードされませんでした',
        UPLOAD_ERR_NO_FILE    => 'ファイルが選択されていません',
        UPLOAD_ERR_NO_TMP_DIR => '一時フォルダが見つかりません',
        UPLOAD_ERR_CANT_WRITE => 'ディスクへの書き込みに失敗しました',
        UPLOAD_ERR_EXTENSION  => 'PHP 拡張機能がアップロードを停止しました',
        default               => '不明なエラー',
    };
}
