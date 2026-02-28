<?php
/**
 * Garden Write — 設定 API
 *
 * GET  /api/settings.php   → 設定取得
 * PUT  /api/settings.php   → 設定保存
 *
 * 設定は .settings.json に保存（PIN認証ユーザー共通）
 */
session_start();
require_once __DIR__ . '/config.php';

/* 認証チェック */
if (!isset($_SESSION['garden_auth']) || $_SESSION['garden_auth'] !== true) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => '認証が必要です']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

/* 設定ファイルパス */
define('SETTINGS_FILE', __DIR__ . '/../.settings.json');

/* デフォルト設定 */
$defaults = [
    'fontSize' => 16,
    'lineWidth' => 0,
    'sort' => 'modified-desc',
    'typewriter' => true,
];

/**
 * 設定読み込み
 */
function load_settings(array $defaults): array {
    if (!file_exists(SETTINGS_FILE)) return $defaults;
    $data = json_decode(file_get_contents(SETTINGS_FILE), true);
    if (!is_array($data)) return $defaults;
    /* デフォルト値をマージ（未設定キーを補完） */
    return array_merge($defaults, $data);
}

/**
 * 設定保存
 */
function save_settings(array $settings): void {
    file_put_contents(SETTINGS_FILE, json_encode($settings, JSON_PRETTY_PRINT), LOCK_EX);
    chmod(SETTINGS_FILE, 0600);
}

/**
 * 設定値のバリデーション
 */
function validate_settings(array $input, array $defaults): array {
    $settings = $defaults;

    /* フォントサイズ: 12-24の偶数 */
    if (isset($input['fontSize'])) {
        $v = intval($input['fontSize']);
        if ($v >= 12 && $v <= 24) $settings['fontSize'] = $v;
    }

    /* 行幅: 0（全幅）または 30-100 */
    if (isset($input['lineWidth'])) {
        $v = intval($input['lineWidth']);
        if ($v === 0 || ($v >= 30 && $v <= 100)) $settings['lineWidth'] = $v;
    }

    /* 並び順 */
    if (isset($input['sort'])) {
        $allowed = ['modified-desc', 'modified-asc', 'date-desc', 'date-asc', 'title-asc', 'title-desc'];
        if (in_array($input['sort'], $allowed, true)) $settings['sort'] = $input['sort'];
    }

    /* タイプライターモード */
    if (isset($input['typewriter'])) {
        $settings['typewriter'] = (bool) $input['typewriter'];
    }

    return $settings;
}

/* ============================================
 * ルーティング
 * ============================================ */
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $settings = load_settings($defaults);
        echo json_encode(['ok' => true, 'settings' => $settings]);
        break;

    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            echo json_encode(['ok' => false, 'error' => '不正なリクエスト']);
            exit;
        }

        /* 現在の設定を読み込んでマージ */
        $current = load_settings($defaults);
        $validated = validate_settings($input, $current);
        save_settings($validated);

        echo json_encode(['ok' => true, 'settings' => $validated]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
}
