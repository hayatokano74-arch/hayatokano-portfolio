<?php
/**
 * 画像アップロード処理
 *
 * 1. 元画像をそのまま保存（GDを通さず原本保護）
 * 2. cwebp コマンドでWebP版を横に生成（.jpg → .jpg.webp）
 * 3. .htaccess でブラウザがWebP対応なら .webp を自動配信
 *
 * GDは画像情報取得（サイズ・MIME）のみに使用。
 * 巨大ファイルでもメモリ不足にならない。
 */

require_once dirname(__DIR__) . '/config.php';
require_once __DIR__ . '/db.php';

/**
 * アップロードされた画像を処理して保存する
 *
 * @param array  $file     $_FILES['field'] の値
 * @param string $section  保存先セクション（works, garden 等）
 * @param string $slug     紐付ける slug（任意）
 * @return array { path: string, url: string, width: int, height: int }
 */
function upload_image(array $file, string $section = 'misc', string $slug = ''): array {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('アップロードエラー: ' . upload_error_message($file['error']));
    }

    // MIME タイプを確認（GDのgetimagesizeは軽量でメモリ問題なし）
    $info = @getimagesize($file['tmp_name']);
    if (!$info || !in_array($info['mime'], ALLOWED_MIME_TYPES, true)) {
        throw new RuntimeException('許可されていない画像形式です');
    }
    $mime   = $info['mime'];
    $width  = $info[0];
    $height = $info[1];

    // 保存ディレクトリを確保
    $dest_dir = UPLOAD_DIR . '/' . $section;
    if ($slug) $dest_dir .= '/' . preg_replace('/[^a-z0-9_\-]/', '', $slug);
    if (!is_dir($dest_dir)) mkdir($dest_dir, 0755, true);

    // ファイル名
    $basename = date('YmdHis') . '_' . bin2hex(random_bytes(4));
    $ext = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
        default      => 'jpg',
    };
    $filename    = $basename . '.' . $ext;
    $dest_path   = $dest_dir . '/' . $filename;
    $public_path = '/' . $section . ($slug ? '/' . $slug : '') . '/' . $filename;

    // 1. 元画像を保存
    if (!move_uploaded_file($file['tmp_name'], $dest_path)) {
        throw new RuntimeException('ファイルの保存に失敗しました');
    }

    // 1.5. Exif Orientationに基づいて自動回転（ImageMagick）
    // 縦写真が横になる問題を根本解決
    if ($mime === 'image/jpeg') {
        exec(sprintf('convert %s -auto-orient %s 2>/dev/null',
            escapeshellarg($dest_path), escapeshellarg($dest_path)));
        // 回転後のサイズを再取得
        $rotated = @getimagesize($dest_path);
        if ($rotated) {
            $width  = $rotated[0];
            $height = $rotated[1];
        }
    }

    // 2. 配信用WebP（長辺2560px、品質80）
    if ($mime !== 'image/webp') {
        $webp_path = $dest_path . '.webp';
        $resize = max($width, $height) > 2560 ? '-resize 2560 0' : '';
        exec(sprintf('cwebp -q 80 -quiet %s %s -o %s 2>/dev/null',
            $resize, escapeshellarg($dest_path), escapeshellarg($webp_path)));
    }

    // 3. サムネイル（長辺400px、品質60、Exif保持）
    $thumb_path = $dest_dir . '/thumb_' . $filename . '.webp';
    exec(sprintf('cwebp -q 60 -quiet -resize 400 0 %s -o %s 2>/dev/null',
        escapeshellarg($dest_path), escapeshellarg($thumb_path)));

    // DB にメディアレコードを保存
    $db = get_db();
    $db->prepare('
        INSERT INTO media (filename, path, section, slug, width, height, size_bytes, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $filename,
        $public_path,
        $section,
        $slug,
        $width,
        $height,
        filesize($dest_path),
        $mime,
    ]);

    return [
        'path'   => $public_path,
        'url'    => UPLOAD_URL_PREFIX . $public_path,
        'width'  => $width,
        'height' => $height,
    ];
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
