<?php
/**
 * Photo Roll CRUD API
 *
 * GET    /api/photo-roll.php              → 全件（新しい順）
 * GET    /api/photo-roll.php?slug=xxx     → 1件
 * POST   /api/photo-roll.php             → 新規作成（画像アップロード）
 * DELETE /api/photo-roll.php?slug=xxx    → 削除
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/upload.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') api_require_auth();

switch ($method) {
    case 'GET':    handle_get(); break;
    case 'POST':   handle_post(); break;
    case 'DELETE': handle_delete(); break;
    default:       json_error('Method not allowed', 405);
}

function handle_get(): never {
    $db   = get_db();
    $slug = $_GET['slug'] ?? '';

    if ($slug !== '') {
        $row = db_find_by_slug('photo_roll', $slug);
        if (!$row) json_not_found();
        json_ok($row);
    }

    // 公開済みのみ（?all=1で全件）
    if (isset($_GET['all'])) {
        $rows = $db->query("SELECT * FROM photo_roll ORDER BY date DESC, time DESC, id DESC")->fetchAll();
    } else {
        $rows = $db->query("SELECT * FROM photo_roll WHERE published = 1 ORDER BY date DESC, time DESC, id DESC")->fetchAll();
    }
    json_ok($rows);
}

function handle_post(): never {
    $db = get_db();

    // 画像アップロード
    if (!empty($_FILES['file'])) {
        // Exifから撮影日時を取得（アップロード前のtmpファイルから読む）
        $taken = null;
        $exif = @exif_read_data($_FILES['file']['tmp_name']);
        if ($exif) {
            $taken = $exif['DateTimeOriginal'] ?? $exif['DateTime'] ?? null;
        }

        $result = upload_image($_FILES['file'], 'photo-roll', '');

        if ($taken) {
            // Exif日時: "2026:04:05 14:30:00" → DateTime
            $dt = DateTime::createFromFormat('Y:m:d H:i:s', $taken);
            if (!$dt) $dt = new DateTime(); // パース失敗時は現在時刻
        } else {
            $dt = new DateTime();
        }

        $date = $dt->format('Y-m-d');
        $time = $dt->format('H:i:s');
        $title = $dt->format('Y.m.d H:i');
        $slug = $dt->format('Ymd-His') . '-' . bin2hex(random_bytes(2));

        $stmt = $db->prepare('INSERT INTO photo_roll (slug, title, date, time, src, width, height) VALUES (?,?,?,?,?,?,?)');
        $stmt->execute([$slug, $title, $date, $time, $result['url'], $result['width'], $result['height']]);

        $row = db_find_by_slug('photo_roll', $slug);
        json_ok($row, 201);
    }

    // JSON body
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) json_error('リクエストが不正です');

    $slug = trim($body['slug'] ?? '');
    if (!$slug) json_error('slug は必須です');

    $existing = db_find_by_slug('photo_roll', $slug);
    if ($existing) {
        $stmt = $db->prepare("UPDATE photo_roll SET title=?, date=?, time=?, src=?, width=?, height=?, published=?, updated_at=datetime('now') WHERE slug=?");
        $stmt->execute([
            $body['title'] ?? $existing['title'],
            $body['date'] ?? $existing['date'],
            $body['time'] ?? $existing['time'],
            $body['src'] ?? $existing['src'],
            (int)($body['width'] ?? $existing['width']),
            (int)($body['height'] ?? $existing['height']),
            (int)($body['published'] ?? $existing['published']),
            $slug,
        ]);
    } else {
        $stmt = $db->prepare('INSERT INTO photo_roll (slug, title, date, time, src, width, height) VALUES (?,?,?,?,?,?,?)');
        $stmt->execute([
            $slug,
            $body['title'] ?? '',
            $body['date'] ?? '',
            $body['time'] ?? '',
            $body['src'] ?? '',
            (int)($body['width'] ?? 0),
            (int)($body['height'] ?? 0),
        ]);
    }

    $row = db_find_by_slug('photo_roll', $slug);
    json_ok($row);
}

function handle_delete(): never {
    $slug = $_GET['slug'] ?? '';
    if (!$slug) json_error('slug が必要です');

    $row = db_find_by_slug('photo_roll', $slug);
    if (!$row) json_not_found();

    get_db()->prepare('DELETE FROM photo_roll WHERE slug = ?')->execute([$slug]);
    json_ok(['deleted' => $slug]);
}
