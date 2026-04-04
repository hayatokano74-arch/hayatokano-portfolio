<?php
/**
 * メディア API
 *
 * GET    /api/media.php              → 全件 JSON（?section=xxx でフィルター）
 * POST   /api/media.php              → 画像アップロード（multipart/form-data）
 * DELETE /api/media.php?path=xxx     → メディアレコード削除（ファイルも削除）
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/upload.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET は認証不要、それ以外は認証必須
if ($method !== 'GET') {
    api_require_auth();
}

switch ($method) {
    case 'GET':
        handle_get();
        break;
    case 'POST':
        handle_post();
        break;
    case 'DELETE':
        handle_delete();
        break;
    default:
        json_error('Method not allowed', 405);
}

/** 取得処理 */
function handle_get(): never {
    $db      = get_db();
    $section = $_GET['section'] ?? '';

    if ($section !== '') {
        // セクションでフィルター
        $stmt = $db->prepare('SELECT * FROM media WHERE section = ? ORDER BY created_at DESC');
        $stmt->execute([$section]);
        $rows = $stmt->fetchAll();
    } else {
        // 全件取得
        $rows = db_all('media', 'created_at DESC');
    }

    json_ok($rows);
}

/** 画像アップロード処理 */
function handle_post(): never {
    // ファイルの存在確認
    if (empty($_FILES['file'])) {
        json_error('ファイルが必要です（フィールド名: file）');
    }

    $section = $_POST['section'] ?? 'misc';
    $slug    = $_POST['slug']    ?? '';

    // section バリデーション（英数字・ハイフン・アンダースコアのみ）
    if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $section)) {
        json_error('section は英数字・ハイフン・アンダースコアのみ使用できます');
    }

    try {
        $result = upload_image($_FILES['file'], $section, $slug);
        json_ok($result, 201);
    } catch (RuntimeException $e) {
        error_log('[CMS] メディアアップロードエラー: ' . $e->getMessage());
        json_error($e->getMessage(), 422);
    }
}

/** メディア削除処理 */
function handle_delete(): never {
    $path = $_GET['path'] ?? '';
    if ($path === '') json_error('path が必要です');

    $db = get_db();

    // DB からレコードを検索
    $stmt = $db->prepare('SELECT * FROM media WHERE path = ?');
    $stmt->execute([$path]);
    $row = $stmt->fetch();

    if (!$row) {
        json_not_found('メディアが見つかりません: ' . $path);
    }

    // 実ファイルを削除
    $file_path = UPLOAD_DIR . $path;
    if (file_exists($file_path)) {
        if (!unlink($file_path)) {
            error_log('[CMS] ファイル削除失敗: ' . $file_path);
            // ファイル削除に失敗してもDBレコードは削除する（孤立ファイルより孤立DBの方がマシ）
        }
    }

    // DB レコードを削除
    $db->prepare('DELETE FROM media WHERE path = ?')->execute([$path]);

    json_ok(['deleted' => $path]);
}
