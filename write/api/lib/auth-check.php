<?php
/**
 * Garden Write — 認証 + CSRF検証 共通チェック
 *
 * 各APIファイルの先頭で require するだけで、
 * セッション認証 + CSRF トークン検証が完了する。
 * 不正な場合は 401/403 レスポンスを返して exit。
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

/* セッション認証チェック */
if (!isset($_SESSION['garden_auth']) || $_SESSION['garden_auth'] !== true) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => '認証が必要です']);
    exit;
}

/* CSRF トークン検証（GET以外の全リクエスト） */
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($token) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'CSRFトークンが無効です']);
        exit;
    }
}
