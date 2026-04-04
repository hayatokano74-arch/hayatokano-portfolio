<?php
/**
 * Settings API
 *
 * GET  /api/settings.php?key=xxx  → 設定値を取得（認証不要）
 * POST /api/settings.php          → 設定値を保存（認証必須）
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $key = $_GET['key'] ?? '';
    if ($key === '') json_error('key は必須です');

    $db = get_db();
    $stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();

    if (!$row) {
        json_ok(null);
    } else {
        $decoded = json_decode($row['value'], true);
        json_ok($decoded !== null ? $decoded : $row['value']);
    }
} elseif ($method === 'POST') {
    api_require_auth();

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || empty($body['key'])) {
        json_error('key と value が必要です');
    }

    $key   = $body['key'];
    $value = json_encode($body['value'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $db = get_db();
    $stmt = $db->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    $stmt->execute([$key, $value]);

    json_ok(['saved' => $key]);
} else {
    json_error('Method not allowed', 405);
}
