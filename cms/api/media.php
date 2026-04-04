<?php
/**
 * メディア API
 *
 * GET    /api/media.php              → 一覧 JSON（?section=xxx / ?limit=xx&offset=xx）
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
    // CSRF 検証（POST / DELETE）
    $csrf_header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $csrf_post   = $_POST['_csrf'] ?? '';
    $token       = $csrf_header ?: $csrf_post;
    if (!hash_equals(csrf_token(), $token)) {
        json_error('CSRFトークンが不正です', 403);
    }
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

/** 取得処理（section フィルタ + ページネーション対応） */
function handle_get(): never {
    $db      = get_db();
    $section = $_GET['section'] ?? '';
    $limit   = max(1, min(200, (int)($_GET['limit']  ?? 60)));
    $offset  = max(0, (int)($_GET['offset'] ?? 0));

    if ($section !== '') {
        $stmt = $db->prepare('SELECT * FROM media WHERE section = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
        $stmt->execute([$section, $limit, $offset]);
        $rows = $stmt->fetchAll();

        $cnt_stmt = $db->prepare('SELECT COUNT(*) FROM media WHERE section = ?');
        $cnt_stmt->execute([$section]);
        $total = (int)$cnt_stmt->fetchColumn();
    } else {
        $stmt = $db->prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT ? OFFSET ?');
        $stmt->execute([$limit, $offset]);
        $rows = $stmt->fetchAll();

        $total = (int)$db->query('SELECT COUNT(*) FROM media')->fetchColumn();
    }

    // セクション一覧も返す（フィルタUI用）
    $sections = $db->query(
        'SELECT section, COUNT(*) AS cnt FROM media GROUP BY section ORDER BY cnt DESC'
    )->fetchAll();

    json_ok([
        'items'    => $rows,
        'total'    => $total,
        'limit'    => $limit,
        'offset'   => $offset,
        'sections' => $sections,
    ]);
}

/** 画像アップロード処理 */
function handle_post(): never {
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

    // 実ファイルを先に削除（失敗したらDB削除もしない）
    $file_path = UPLOAD_DIR . $path;
    if (file_exists($file_path)) {
        if (!unlink($file_path)) {
            error_log('[CMS] ファイル削除失敗: ' . $file_path);
            json_error('ファイルの削除に失敗しました', 500);
        }
    }

    // ファイル削除成功後にDBレコードを削除
    $db->prepare('DELETE FROM media WHERE path = ?')->execute([$path]);

    json_ok(['deleted' => $path]);
}
