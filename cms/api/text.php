<?php
/**
 * Text CRUD API
 *
 * GET    /api/text.php          → 全件 JSON
 * GET    /api/text.php?slug=xxx → 1件 JSON
 * POST   /api/text.php          → 新規作成/更新（JSON body）
 * DELETE /api/text.php?slug=xxx → 削除
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

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
    $slug = $_GET['slug'] ?? '';

    if ($slug !== '') {
        // 1件取得
        $row = db_find_by_slug('texts', $slug);
        if (!$row) json_not_found('Text が見つかりません: ' . $slug);
        json_ok(decode_json_fields($row));
    }

    // 全件取得
    $rows = db_all('texts', 'date DESC, id DESC');
    json_ok(array_map('decode_json_fields', $rows));
}

/** 新規作成/更新処理（UPSERT） */
function handle_post(): never {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        json_error('リクエストボディが不正です（JSON が必要）');
    }

    // slug バリデーション
    $slug = trim($body['slug'] ?? '');
    if ($slug === '') {
        json_error('slug は必須です');
    }
    if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $slug)) {
        json_error('slug は英数字・ハイフン・アンダースコアのみ使用できます');
    }

    $db = get_db();

    // JSON 文字列に変換するフィールド
    $categories = encode_json_field($body['categories'] ?? []);
    $data       = encode_json_field($body['data']       ?? []);

    // 既存レコードの確認
    $existing = db_find_by_slug('texts', $slug);

    if ($existing) {
        // UPDATE
        $stmt = $db->prepare('
            UPDATE texts SET
                title      = ?,
                date       = ?,
                year       = ?,
                categories = ?,
                data       = ?,
                body       = ?,
                updated_at = datetime("now")
            WHERE slug = ?
        ');
        $stmt->execute([
            $body['title']  ?? $existing['title'],
            $body['date']   ?? $existing['date'],
            $body['year']   ?? $existing['year'],
            $categories,
            $data,
            $body['body']   ?? $existing['body'],
            $slug,
        ]);
        $row = db_find_by_slug('texts', $slug);
        json_ok(decode_json_fields($row));
    } else {
        // INSERT
        $stmt = $db->prepare('
            INSERT INTO texts (slug, title, date, year, categories, data, body)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $slug,
            $body['title']  ?? '',
            $body['date']   ?? '',
            $body['year']   ?? '',
            $categories,
            $data,
            $body['body']   ?? '',
        ]);
        $id  = (int)$db->lastInsertId();
        $row = db_find_by_id('texts', $id);
        json_ok(decode_json_fields($row), 201);
    }
}

/** 削除処理 */
function handle_delete(): never {
    $slug = $_GET['slug'] ?? '';
    if ($slug === '') json_error('slug が必要です');

    $row = db_find_by_slug('texts', $slug);
    if (!$row) json_not_found('Text が見つかりません: ' . $slug);

    get_db()->prepare('DELETE FROM texts WHERE slug = ?')->execute([$slug]);
    json_ok(['deleted' => $slug]);
}

/** JSON 文字列フィールドをデコードして返す */
function decode_json_fields(array $row): array {
    foreach (['categories', 'data'] as $field) {
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
