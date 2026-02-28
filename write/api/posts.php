<?php
/**
 * Garden Write — 投稿 CRUD API
 *
 * GET    /api/posts.php           → 一覧取得
 * GET    /api/posts.php?id=123    → 単体取得
 * POST   /api/posts.php           → 新規作成
 * PUT    /api/posts.php           → 更新
 * DELETE /api/posts.php?id=123    → 削除
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

$method = $_SERVER['REQUEST_METHOD'];

/* ============================================
 * WP REST API ヘルパー
 * ============================================ */
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

    switch ($method) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            break;
        case 'PUT':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            break;
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['error' => $error, 'status' => 0];
    }

    return [
        'data' => json_decode($response, true),
        'status' => $httpCode,
    ];
}

/**
 * WP投稿データを統一フォーマットに変換
 */
function normalize_post($wp_post) {
    $content = $wp_post['content']['raw'] ?? $wp_post['content']['rendered'] ?? '';
    $content = strip_wp_blocks($content);

    return [
        'id' => $wp_post['id'],
        'title' => $wp_post['title']['rendered'] ?? $wp_post['title'] ?? '',
        'content' => $content,
        'status' => $wp_post['status'] ?? 'draft',
        'date' => $wp_post['date'] ?? '',
        'modified' => $wp_post['modified'] ?? '',
        'categories' => $wp_post['categories'] ?? [],
    ];
}

/**
 * WordPress Gutenberg ブロックマークアップを除去
 */
function strip_wp_blocks($content) {
    /* ブロックコメント除去: <!-- wp:paragraph --> 等 */
    $content = preg_replace('/<!--\s*\/?wp:\w+[^>]*-->\n?/', '', $content);

    /* ブロックエディタ由来の <p> タグをプレーンテキストに変換 */
    if (strpos($content, '<p>') !== false) {
        $content = str_replace('</p>', "\n\n", $content);
        $content = preg_replace('/<p[^>]*>/', '', $content);
        $content = preg_replace('/<br\s*\/?>/', "\n", $content);
        $content = strip_tags($content);
    }

    return trim($content);
}

/* ============================================
 * ルーティング
 * ============================================ */
switch ($method) {

    /* --- 一覧取得 --- */
    case 'GET':
        /* 並び順（デフォルト: 更新日の新しい順） */
        $allowedOrderby = ['modified', 'date', 'title'];
        $allowedOrder = ['asc', 'desc'];
        $orderby = in_array($_GET['orderby'] ?? '', $allowedOrderby) ? $_GET['orderby'] : 'modified';
        $order = in_array($_GET['order'] ?? '', $allowedOrder) ? $_GET['order'] : 'desc';

        $params = [
            'per_page' => 100,
            'orderby' => $orderby,
            'order' => $order,
            'status' => 'draft,publish',
            'context' => 'edit',
        ];

        /* フォルダ（カテゴリ）でフィルター — Garden配下のみ */
        $folderId = isset($_GET['folder']) ? intval($_GET['folder']) : 0;
        if ($folderId > 0) {
            $params['categories'] = $folderId;
        } else {
            /* フォルダ未指定時は Garden カテゴリ全体 */
            $params['categories'] = WP_GARDEN_CATEGORY_ID;
        }

        /* 単体取得 */
        if (isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $result = wp_request("/wp/v2/posts/{$id}?context=edit");
            if ($result['status'] === 200) {
                echo json_encode(['ok' => true, 'post' => normalize_post($result['data'])]);
            } else {
                echo json_encode(['ok' => false, 'error' => '投稿が見つかりません']);
            }
            exit;
        }

        $query = http_build_query($params);
        $result = wp_request("/wp/v2/posts?{$query}");

        if ($result['status'] === 200) {
            $posts = array_map('normalize_post', $result['data']);
            echo json_encode(['ok' => true, 'posts' => $posts]);
        } else {
            echo json_encode([
                'ok' => false,
                'error' => 'WP APIエラー',
                'detail' => $result['data']['message'] ?? '',
            ]);
        }
        break;

    /* --- 新規作成 --- */
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            echo json_encode(['ok' => false, 'error' => '不正なリクエスト']);
            exit;
        }

        $body = [
            'title' => $input['title'] ?? '',
            'content' => $input['content'] ?? '',
            'status' => $input['status'] ?? 'draft',
        ];

        /* タイトルが空の場合は日付をタイトルに */
        if (empty($body['title'])) {
            $body['title'] = date('Y.m.d');
        }

        /* フォルダ（カテゴリ）設定 — Garden親カテゴリは常に付与 */
        $folderId = intval($input['folder'] ?? 0);
        $categories = [WP_GARDEN_CATEGORY_ID];
        if ($folderId > 0) {
            $categories[] = $folderId;
        }
        $body['categories'] = $categories;

        $result = wp_request('/wp/v2/posts', 'POST', $body);

        if ($result['status'] === 201) {
            echo json_encode([
                'ok' => true,
                'id' => $result['data']['id'],
                'post' => normalize_post($result['data']),
            ]);
        } else {
            echo json_encode([
                'ok' => false,
                'error' => '作成に失敗しました',
                'detail' => $result['data']['message'] ?? '',
            ]);
        }
        break;

    /* --- 更新 --- */
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['id'])) {
            echo json_encode(['ok' => false, 'error' => '投稿IDが必要です']);
            exit;
        }

        $id = intval($input['id']);
        $body = [];
        if (isset($input['title'])) $body['title'] = $input['title'];
        if (isset($input['content'])) $body['content'] = $input['content'];
        if (isset($input['status'])) $body['status'] = $input['status'];

        /* フォルダ（カテゴリ）更新 — Garden親カテゴリは常に付与 */
        if (isset($input['folder'])) {
            $folderId = intval($input['folder']);
            $categories = [WP_GARDEN_CATEGORY_ID];
            if ($folderId > 0) {
                $categories[] = $folderId;
            }
            $body['categories'] = $categories;
        }

        $result = wp_request("/wp/v2/posts/{$id}", 'PUT', $body);

        if ($result['status'] === 200) {
            echo json_encode([
                'ok' => true,
                'post' => normalize_post($result['data']),
            ]);
        } else {
            echo json_encode([
                'ok' => false,
                'error' => '更新に失敗しました',
                'detail' => $result['data']['message'] ?? '',
            ]);
        }
        break;

    /* --- 削除 --- */
    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id <= 0) {
            echo json_encode(['ok' => false, 'error' => '投稿IDが必要です']);
            exit;
        }

        /* ゴミ箱に移動（完全削除は force=true が必要） */
        $result = wp_request("/wp/v2/posts/{$id}", 'DELETE');

        if ($result['status'] === 200) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode([
                'ok' => false,
                'error' => '削除に失敗しました',
                'detail' => $result['data']['message'] ?? '',
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
}
