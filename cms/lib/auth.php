<?php
/**
 * 認証ヘルパー
 * bcrypt パスワードハッシュ + セッション管理 + レートリミット
 */

require_once dirname(__DIR__) . '/config.php';
require_once __DIR__ . '/db.php';

/** セッションを安全に開始する */
function session_start_safe(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path'     => '/',
        'secure'   => isset($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();

    // セッション固定化攻撃対策: ログイン後に再生成する（login() 内で実施）
}

/** 現在のユーザーが認証済みかどうかを返す */
function is_authenticated(): bool {
    session_start_safe();
    return !empty($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
}

/** 未認証の場合はログインページにリダイレクト */
function require_auth(): void {
    if (!is_authenticated()) {
        $redirect = urlencode($_SERVER['REQUEST_URI'] ?? '');
        header('Location: ' . cms_url('/') . ($redirect ? '?redirect=' . $redirect : ''));
        exit;
    }
}

/** CMS のベース URL を返す */
function cms_url(string $path = ''): string {
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
    // admin/ 配下から呼ばれた場合は1段上へ
    if (str_ends_with($base, '/admin')) {
        $base = dirname($base);
    }
    return $base . '/' . ltrim($path, '/');
}

/** ログイン処理 */
function login(string $password): bool {
    if (is_locked_out()) return false;

    $stored_hash = get_password_hash();
    if (!$stored_hash) return false;  // パスワード未設定

    if (!password_verify($password, $stored_hash)) {
        record_failed_attempt();
        return false;
    }

    // 認証成功: セッション再生成してフラグをセット
    session_regenerate_id(true);
    $_SESSION['authenticated'] = true;
    $_SESSION['auth_time'] = time();
    clear_failed_attempts();
    return true;
}

/** ログアウト処理 */
function logout(): void {
    session_start_safe();
    $_SESSION = [];
    session_destroy();
    setcookie(SESSION_NAME, '', time() - 3600, '/');
}

/** ハッシュ化されたパスワードをファイルから取得 */
function get_password_hash(): ?string {
    $path = CMS_ROOT . '/db/password.hash';
    if (!file_exists($path)) return null;
    $hash = trim(file_get_contents($path));
    return $hash ?: null;
}

/** パスワードを設定（初期セットアップ時に使用） */
function set_password(string $plain_password): void {
    $dir = CMS_ROOT . '/db';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    $hash = password_hash($plain_password, PASSWORD_BCRYPT, ['cost' => 12]);
    file_put_contents($dir . '/password.hash', $hash, LOCK_EX);
    chmod($dir . '/password.hash', 0600);
}

// ─── レートリミット ──────────────────────────────────────────

function get_client_ip(): string {
    return $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
}

function is_locked_out(): bool {
    $db = get_db();
    $ip = get_client_ip();
    $since = date('Y-m-d H:i:s', time() - LOGIN_LOCKOUT_SECONDS);
    $count = (int)$db->prepare(
        'SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > ?'
    )->execute([$ip, $since]) ? $db->prepare(
        'SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > ?'
    )->execute([$ip, $since]) : 0;

    // シンプルな実装: prepare/execute を分離
    $stmt = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > ?');
    $stmt->execute([$ip, $since]);
    return (int)$stmt->fetchColumn() >= LOGIN_MAX_ATTEMPTS;
}

function record_failed_attempt(): void {
    $db = get_db();
    $db->prepare('INSERT INTO login_attempts (ip) VALUES (?)')->execute([get_client_ip()]);
}

function clear_failed_attempts(): void {
    $db = get_db();
    $db->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([get_client_ip()]);
}

/** CSRF トークンを生成して返す（セッションに保存） */
function csrf_token(): string {
    session_start_safe();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/** CSRF トークンを検証する */
function verify_csrf(): bool {
    session_start_safe();
    $token = $_POST['_csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

/** CSRF 検証失敗時に 403 を返す */
function require_csrf(): void {
    if (!verify_csrf()) {
        http_response_code(403);
        die(json_encode(['error' => 'CSRF token mismatch']));
    }
}
