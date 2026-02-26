<?php
/**
 * Garden Write — フォルダ管理 API
 *
 * WP のカテゴリをフォルダとして使用。
 *
 * GET  /api/folders.php                → 一覧取得
 * POST /api/folders.php  action=create → 新規作成
 * POST /api/folders.php  action=rename → 名前変更
 * POST /api/folders.php  action=delete → 削除
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

/* WP APIリクエスト */
function wp_request($endpoint, $method = 'GET', $body = null) {
    $url = WP_API_BASE . $endpoint;
    $headers = [
        'Authorization: Basic ' . WP_AUTH_TOKEN,
        'Content-Type: application/json',
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'data' => json_decode($response, true),
        'status' => $httpCode,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    /* --- フォルダ一覧（Garden配下を再帰的に取得） --- */
    case 'GET':
        $gardenId = WP_GARDEN_CATEGORY_ID;
        /* Garden配下の全カテゴリを取得（子・孫すべて） */
        $result = wp_request("/wp/v2/categories?per_page=100&orderby=name&order=asc");

        if ($result['status'] === 200) {
            /* Garden配下のカテゴリだけ抽出（再帰的に） */
            $allCats = $result['data'];
            $gardenIds = [$gardenId]; /* Garden自身とその子孫のIDリスト */
            $folders = [];

            /* 子孫IDを収集 */
            $changed = true;
            while ($changed) {
                $changed = false;
                foreach ($allCats as $cat) {
                    if (in_array($cat['parent'], $gardenIds) && !in_array($cat['id'], $gardenIds)) {
                        $gardenIds[] = $cat['id'];
                        $changed = true;
                    }
                }
            }

            /* Garden配下のカテゴリをフォルダとして返す（Garden自身は除く） */
            foreach ($allCats as $cat) {
                if (in_array($cat['id'], $gardenIds) && $cat['id'] !== $gardenId) {
                    $folders[] = [
                        'id' => $cat['id'],
                        'name' => $cat['name'],
                        'slug' => $cat['slug'],
                        'count' => $cat['count'],
                        'parent' => $cat['parent'] === $gardenId ? 0 : $cat['parent'],
                    ];
                }
            }
            echo json_encode(['ok' => true, 'folders' => $folders]);
        } else {
            echo json_encode([
                'ok' => false,
                'error' => 'カテゴリ取得に失敗',
                'detail' => $result['data']['message'] ?? '',
            ]);
        }
        break;

    /* --- フォルダ操作 --- */
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';

        switch ($action) {

            /* 新規フォルダ作成 */
            case 'create':
                $name = trim($input['name'] ?? '');
                if (!$name) {
                    echo json_encode(['ok' => false, 'error' => 'フォルダ名を入力してください']);
                    exit;
                }

                /* 親フォルダ指定があればその配下、なければGarden直下 */
                $parentId = intval($input['parent'] ?? 0);
                if ($parentId <= 0) $parentId = WP_GARDEN_CATEGORY_ID;

                $result = wp_request('/wp/v2/categories', 'POST', [
                    'name' => $name,
                    'parent' => $parentId,
                ]);

                if ($result['status'] === 201) {
                    echo json_encode([
                        'ok' => true,
                        'folder' => [
                            'id' => $result['data']['id'],
                            'name' => $result['data']['name'],
                            'slug' => $result['data']['slug'],
                            'count' => 0,
                        ],
                    ]);
                } else {
                    echo json_encode([
                        'ok' => false,
                        'error' => $result['data']['message'] ?? 'フォルダ作成に失敗',
                    ]);
                }
                break;

            /* フォルダ名変更 */
            case 'rename':
                $id = intval($input['id'] ?? 0);
                $name = trim($input['name'] ?? '');
                if ($id <= 0 || !$name) {
                    echo json_encode(['ok' => false, 'error' => 'IDと名前が必要です']);
                    exit;
                }

                $result = wp_request("/wp/v2/categories/{$id}", 'POST', [
                    'name' => $name,
                ]);

                if ($result['status'] === 200) {
                    echo json_encode(['ok' => true]);
                } else {
                    echo json_encode([
                        'ok' => false,
                        'error' => $result['data']['message'] ?? '名前変更に失敗',
                    ]);
                }
                break;

            /* フォルダ移動（親カテゴリ変更） */
            case 'move':
                $id = intval($input['id'] ?? 0);
                $newParent = intval($input['parent'] ?? 0);
                if ($id <= 0) {
                    echo json_encode(['ok' => false, 'error' => 'IDが必要です']);
                    exit;
                }
                /* 親なし → Garden直下 */
                if ($newParent <= 0) $newParent = WP_GARDEN_CATEGORY_ID;

                $result = wp_request("/wp/v2/categories/{$id}", 'POST', [
                    'parent' => $newParent,
                ]);

                if ($result['status'] === 200) {
                    echo json_encode(['ok' => true]);
                } else {
                    echo json_encode([
                        'ok' => false,
                        'error' => $result['data']['message'] ?? 'フォルダの移動に失敗',
                    ]);
                }
                break;

            /* フォルダ削除 */
            case 'delete':
                $id = intval($input['id'] ?? 0);
                if ($id <= 0) {
                    echo json_encode(['ok' => false, 'error' => 'IDが必要です']);
                    exit;
                }

                /* force=true でカテゴリを完全削除（投稿は未分類に移動） */
                $result = wp_request("/wp/v2/categories/{$id}?force=true", 'DELETE');

                if ($result['status'] === 200) {
                    echo json_encode(['ok' => true]);
                } else {
                    echo json_encode([
                        'ok' => false,
                        'error' => $result['data']['message'] ?? '削除に失敗',
                    ]);
                }
                break;

            default:
                echo json_encode(['ok' => false, 'error' => '不正なアクション']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
}
