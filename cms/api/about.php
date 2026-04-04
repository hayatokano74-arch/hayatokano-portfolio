<?php
/**
 * About GET/PUT API（単一レコード）
 *
 * GET /api/about.php → id=1 のレコードを返す
 * PUT /api/about.php → id=1 を更新
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET は認証不要、PUT は認証必須
if ($method !== 'GET') {
    api_require_auth();
}

switch ($method) {
    case 'GET':
        handle_get();
        break;
    case 'PUT':
        handle_put();
        break;
    default:
        json_error('Method not allowed', 405);
}

/** 取得処理（id=1 固定） */
function handle_get(): never {
    $row = db_find_by_id('about', 1);
    if (!$row) {
        // レコードが存在しない場合は空のデータを返す
        json_ok(['id' => 1, 'data' => [], 'body' => '', 'updated_at' => null]);
    }
    json_ok(decode_json_fields($row));
}

/** 更新処理（id=1 固定） */
function handle_put(): never {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        json_error('リクエストボディが不正です（JSON が必要）');
    }

    $db = get_db();

    // JSON 文字列に変換するフィールド
    $data = encode_json_field($body['data'] ?? []);

    // id=1 のレコードを更新（存在しない場合は INSERT）
    $existing = db_find_by_id('about', 1);

    if ($existing) {
        $stmt = $db->prepare('
            UPDATE about SET
                data       = ?,
                body       = ?,
                updated_at = datetime("now")
            WHERE id = 1
        ');
        $stmt->execute([
            $data,
            $body['body'] ?? $existing['body'],
        ]);
    } else {
        $stmt = $db->prepare('
            INSERT INTO about (id, data, body)
            VALUES (1, ?, ?)
        ');
        $stmt->execute([
            $data,
            $body['body'] ?? '',
        ]);
    }

    $row = db_find_by_id('about', 1);
    json_ok(decode_json_fields($row));
}

/** JSON 文字列フィールドをデコードして返す */
function decode_json_fields(array $row): array {
    foreach (['data'] as $field) {
        if (isset($row[$field]) && is_string($row[$field])) {
            $decoded = json_decode($row[$field], true);
            if ($decoded !== null) {
                $row[$field] = $decoded;
            }
        }
    }
    return $row;
}

/** 値を JSON 文字列にエンコードする */
function encode_json_field(mixed $value): string {
    if (is_string($value)) {
        json_decode($value);
        if (json_last_error() === JSON_ERROR_NONE) return $value;
    }
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
