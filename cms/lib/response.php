<?php
/** JSON レスポンスヘルパー */

/* CORS: フロントエンドからのクライアントサイドフェッチを許可 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_ok(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    error_log('[CMS API] ' . $status . ': ' . $message);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_not_found(string $message = 'Not found'): never {
    json_error($message, 404);
}

function require_method(string ...$methods): void {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        json_error('Method not allowed', 405);
    }
}

/** API 認証チェック（セッションまたは Bearer トークン） */
function api_require_auth(): void {
    require_once __DIR__ . '/auth.php';
    // セッション認証
    if (is_authenticated()) return;
    // Bearer トークン（GitHub Actions のような内部呼び出し用）
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($token, 'Bearer ') && hash_equals(GITHUB_TOKEN, substr($token, 7))) return;
    json_error('Unauthorized', 401);
}
