<?php
/**
 * Works CRUD API
 *
 * GET    /api/works.php          → 全件 JSON
 * GET    /api/works.php?slug=xxx → 1件 JSON
 * POST   /api/works.php          → 新規作成/更新（JSON body）
 * DELETE /api/works.php?slug=xxx → 削除
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
        $row = db_find_by_slug('works', $slug);
        if (!$row) json_not_found('Works が見つかりません: ' . $slug);
        json_ok(decode_json_fields($row));
    }

    // タグ一覧
    if (isset($_GET['tags'])) {
        $db = get_db();
        $rows = $db->query("SELECT tags FROM works")->fetchAll();
        $all = [];
        foreach ($rows as $r) {
            $tags = json_decode($r['tags'], true);
            if (is_array($tags)) foreach ($tags as $t) $all[trim($t)] = true;
        }
        json_ok(array_keys($all));
    }

    // published切替
    if (isset($_GET['toggle_publish'])) {
        api_require_auth();
        $pub_slug = $_GET['toggle_publish'];
        $db = get_db();
        $row = db_find_by_slug('works', $pub_slug);
        if (!$row) json_not_found();
        $new_pub = ($row['published'] ?? 1) ? 0 : 1;
        $db->prepare("UPDATE works SET published = ?, updated_at = datetime('now') WHERE slug = ?")->execute([$new_pub, $pub_slug]);
        json_ok(['slug' => $pub_slug, 'published' => $new_pub]);
    }

    // pinned切替
    if (isset($_GET['toggle_pin'])) {
        api_require_auth();
        $pin_slug = $_GET['toggle_pin'];
        $db = get_db();
        $row = db_find_by_slug('works', $pin_slug);
        if (!$row) json_not_found();
        $new_pinned = $row['pinned'] ? 0 : 1;
        $db->prepare("UPDATE works SET pinned = ?, updated_at = datetime('now') WHERE slug = ?")->execute([$new_pinned, $pin_slug]);
        json_ok(['slug' => $pin_slug, 'pinned' => $new_pinned]);
    }

    // フロント向け: 公開済みのみ（デフォルト）。CMS管理画面: ?all=1 で全件
    $db = get_db();
    if (isset($_GET['all'])) {
        $rows = $db->query("SELECT * FROM works ORDER BY pinned DESC, date DESC, id DESC")->fetchAll();
    } else {
        $rows = $db->query("SELECT * FROM works WHERE published = 1 ORDER BY pinned DESC, date DESC, id DESC")->fetchAll();
    }
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
    $tags  = encode_json_field($body['tags']  ?? []);
    $data  = encode_json_field($body['data']  ?? []);
    $media = encode_json_field($body['media'] ?? []);

    // スラッグ変更: _original_slug があればそれで既存レコードを特定
    $original_slug = trim($body['_original_slug'] ?? '');
    $existing = $original_slug ? db_find_by_slug('works', $original_slug) : db_find_by_slug('works', $slug);

    // スラッグ変更のみ（他のフィールドなし）の場合
    if ($original_slug && $existing && count($body) <= 2) {
        $db->prepare("UPDATE works SET slug = ?, updated_at = datetime('now') WHERE slug = ?")
           ->execute([$slug, $original_slug]);
        $row = db_find_by_slug('works', $slug);
        json_ok(decode_json_fields($row));
    }

    if ($existing) {
        // UPDATE
        $stmt = $db->prepare('
            UPDATE works SET
                title      = ?,
                date       = ?,
                year       = ?,
                tags       = ?,
                excerpt    = ?,
                pinned     = ?,
                data       = ?,
                body       = ?,
                updated_at = datetime("now")
            WHERE slug = ?
        ');
        $stmt->execute([
            $body['title']   ?? $existing['title'],
            $body['date']    ?? $existing['date'],
            $body['year']    ?? $existing['year'],
            $tags,
            $body['excerpt'] ?? $existing['excerpt'],
            isset($body['pinned']) ? (int)(bool)$body['pinned'] : $existing['pinned'],
            $data,
            $body['body']    ?? $existing['body'],
            $slug,
        ]);
        $row = db_find_by_slug('works', $slug);
        json_ok(decode_json_fields($row));
    } else {
        // INSERT
        $stmt = $db->prepare('
            INSERT INTO works (slug, title, date, year, tags, excerpt, pinned, data, body)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $slug,
            $body['title']   ?? '',
            $body['date']    ?? '',
            $body['year']    ?? '',
            $tags,
            $body['excerpt'] ?? '',
            isset($body['pinned']) ? (int)(bool)$body['pinned'] : 0,
            $data,
            $body['body']    ?? '',
        ]);
        $id  = (int)$db->lastInsertId();
        $row = db_find_by_id('works', $id);
        json_ok(decode_json_fields($row), 201);
    }
}

/** 削除処理 */
function handle_delete(): never {
    $slug = $_GET['slug'] ?? '';
    if ($slug === '') json_error('slug が必要です');

    $row = db_find_by_slug('works', $slug);
    if (!$row) json_not_found('Works が見つかりません: ' . $slug);

    get_db()->prepare('DELETE FROM works WHERE slug = ?')->execute([$slug]);
    json_ok(['deleted' => $slug]);
}

/** JSON 文字列フィールドをデコードして返す */
function decode_json_fields(array $row): array {
    foreach (['tags', 'data', 'media'] as $field) {
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
        // すでに JSON 文字列の場合はそのまま
        json_decode($value);
        if (json_last_error() === JSON_ERROR_NONE) return $value;
    }
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
