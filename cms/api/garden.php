<?php
/**
 * Garden CRUD API
 *
 * GET    /api/garden.php                      → ページネーション付き一覧
 * GET    /api/garden.php?all=1                → 全件 JSON
 * GET    /api/garden.php?slug=xxx             → 1件 JSON
 * GET    /api/garden.php?page=1&per_page=50   → ページ指定
 * GET    /api/garden.php?q=検索文字列          → 全文検索
 * POST   /api/garden.php                      → 新規作成/更新（JSON body）
 * DELETE /api/garden.php?slug=xxx             → 削除
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/markdown.php';
require_once dirname(__DIR__) . '/lib/revalidate.php';

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
    $db   = get_db();
    $slug = $_GET['slug'] ?? '';

    // 1件取得
    if ($slug !== '') {
        $row = db_find_by_slug('garden', $slug);
        if (!$row) json_not_found('Garden が見つかりません: ' . $slug);
        json_ok(decode_json_fields($row));
    }

    // 全件取得（?all=1）
    if (!empty($_GET['all'])) {
        $rows = db_all('garden', 'date DESC, id DESC');
        json_ok(array_map('decode_json_fields', $rows));
    }

    // 検索クエリ
    $q = trim($_GET['q'] ?? '');

    // ページネーション
    $page     = max(1, (int)($_GET['page'] ?? 1));
    $per_page = min(200, max(1, (int)($_GET['per_page'] ?? 50)));
    $offset   = ($page - 1) * $per_page;

    if ($q !== '') {
        // 全文検索（title, body, tags を対象）
        $like = '%' . $q . '%';

        $stmt_count = $db->prepare('SELECT COUNT(*) FROM garden WHERE title LIKE ? OR body LIKE ? OR tags LIKE ?');
        $stmt_count->execute([$like, $like, $like]);
        $total = (int)$stmt_count->fetchColumn();

        $stmt = $db->prepare(
            'SELECT * FROM garden WHERE title LIKE ? OR body LIKE ? OR tags LIKE ?
             ORDER BY date DESC, id DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$like, $like, $like, $per_page, $offset]);
        $rows = $stmt->fetchAll();
    } else {
        // 通常の一覧
        $stmt_count = $db->prepare('SELECT COUNT(*) FROM garden');
        $stmt_count->execute();
        $total = (int)$stmt_count->fetchColumn();

        $stmt = $db->prepare('SELECT * FROM garden ORDER BY date DESC, id DESC LIMIT ? OFFSET ?');
        $stmt->execute([$per_page, $offset]);
        $rows = $stmt->fetchAll();
    }

    json_ok([
        'items'      => array_map('decode_json_fields', $rows),
        'total'      => $total,
        'page'       => $page,
        'per_page'   => $per_page,
        'total_pages' => (int)ceil($total / $per_page),
    ]);
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
    $tags = encode_json_field($body['tags'] ?? []);

    // 既存レコードの確認
    $existing = db_find_by_slug('garden', $slug);

    if ($existing) {
        // UPDATE
        $stmt = $db->prepare('
            UPDATE garden SET
                date       = ?,
                title      = ?,
                tags       = ?,
                type       = ?,
                body       = ?,
                updated_at = datetime("now")
            WHERE slug = ?
        ');
        $stmt->execute([
            $body['date']  ?? $existing['date'],
            $body['title'] ?? $existing['title'],
            $tags,
            $body['type']  ?? $existing['type'],
            $body['body']  ?? $existing['body'],
            $slug,
        ]);
        $row = db_find_by_slug('garden', $slug);
        revalidate_paths(['/', '/garden', "/garden/{$slug}"]);
        json_ok(decode_json_fields($row));
    } else {
        // INSERT
        $stmt = $db->prepare('
            INSERT INTO garden (slug, date, title, tags, type, body)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $slug,
            $body['date']  ?? '',
            $body['title'] ?? '',
            $tags,
            $body['type']  ?? 'text',
            $body['body']  ?? '',
        ]);
        $id  = (int)$db->lastInsertId();
        $row = db_find_by_id('garden', $id);
        revalidate_paths(['/', '/garden', "/garden/{$slug}"]);
        json_ok(decode_json_fields($row), 201);
    }
}

/** 削除処理 */
function handle_delete(): never {
    $slug = $_GET['slug'] ?? '';
    if ($slug === '') json_error('slug が必要です');

    $row = db_find_by_slug('garden', $slug);
    if (!$row) json_not_found('Garden が見つかりません: ' . $slug);

    get_db()->prepare('DELETE FROM garden WHERE slug = ?')->execute([$slug]);
    revalidate_paths(['/', '/garden', "/garden/{$slug}"]);
    json_ok(['deleted' => $slug]);
}

/** JSON 文字列フィールドをデコードし、bodyをHTML変換して返す */
function decode_json_fields(array $row): array {
    foreach (['tags'] as $field) {
        if (isset($row[$field]) && is_string($row[$field])) {
            $decoded = json_decode($row[$field], true);
            if ($decoded !== null) {
                $row[$field] = $decoded;
            }
        }
    }
    // Markdown → HTML 変換（画像・ブラケットリンク・段落等）
    if (isset($row['body']) && is_string($row['body'])) {
        $row['body'] = markdown_to_html($row['body']);
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
