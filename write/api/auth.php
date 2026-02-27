<?php
/**
 * Garden Write — 認証 API
 *
 * GET /api/auth.php?action=logout → ログアウト（トークンも削除）
 * GET /api/auth.php?action=check  → 認証状態確認
 *
 * このファイルは index.php からも require される。
 * 直接アクセス時のみルーティングを実行。
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/config.php';

/* ============================================
 * トークン管理関数
 * ============================================ */

/**
 * 新しいデバイストークンを生成・保存
 */
function token_create(): string {
    $token = bin2hex(random_bytes(32));
    $tokens = token_load();

    $tokens[$token] = [
        'created' => time(),
        'expires' => time() + TOKEN_LIFETIME,
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ];

    token_save($tokens);
    return $token;
}

/**
 * トークンが有効か検証
 */
function token_verify(string $token): bool {
    if (empty($token)) return false;

    $tokens = token_load();
    if (!isset($tokens[$token])) return false;

    /* 期限切れチェック */
    if (time() > $tokens[$token]['expires']) {
        unset($tokens[$token]);
        token_save($tokens);
        return false;
    }

    return true;
}

/**
 * トークンを無効化
 */
function token_revoke(string $token): void {
    $tokens = token_load();
    unset($tokens[$token]);
    token_save($tokens);
}

/**
 * トークンファイル読み込み
 */
function token_load(): array {
    if (!file_exists(TOKEN_FILE)) return [];
    $data = json_decode(file_get_contents(TOKEN_FILE), true);
    return is_array($data) ? $data : [];
}

/**
 * トークンファイル保存
 */
function token_save(array $tokens): void {
    /* 期限切れトークンを掃除 */
    $now = time();
    $tokens = array_filter($tokens, fn($t) => $t['expires'] > $now);

    file_put_contents(TOKEN_FILE, json_encode($tokens, JSON_PRETTY_PRINT), LOCK_EX);
    chmod(TOKEN_FILE, 0600);
}

/* ============================================
 * 直接アクセス時のみ API ルーティング実行
 * ============================================ */
if (basename($_SERVER['SCRIPT_FILENAME']) === 'auth.php') {
    header('Content-Type: application/json; charset=utf-8');

    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'logout':
            /* デバイストークンを削除 */
            if (isset($_COOKIE['garden_token'])) {
                token_revoke($_COOKIE['garden_token']);
                setcookie('garden_token', '', [
                    'expires' => time() - 3600,
                    'path' => '/',
                    'httponly' => true,
                    'secure' => true,
                    'samesite' => 'Strict',
                ]);
            }
            session_destroy();
            echo json_encode(['ok' => true]);
            break;

        case 'check':
            $authenticated = isset($_SESSION['garden_auth']) && $_SESSION['garden_auth'] === true;

            /* セッション有効期限チェック */
            if ($authenticated && isset($_SESSION['garden_auth_time'])) {
                if (time() - $_SESSION['garden_auth_time'] > SESSION_LIFETIME) {
                    session_destroy();
                    $authenticated = false;
                }
            }

            echo json_encode(['ok' => true, 'authenticated' => $authenticated]);
            break;

        default:
            echo json_encode(['ok' => false, 'error' => '不正なアクション']);
    }
}
