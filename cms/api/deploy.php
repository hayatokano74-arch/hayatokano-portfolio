<?php
/**
 * GitHub Actions デプロイトリガー API
 *
 * POST /api/deploy.php → GitHub Actions の workflow_dispatch をトリガー
 * GET  /api/deploy.php → 最新のデプロイステータスを返す
 */

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/deploy.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET・POST ともに認証必須
api_require_auth();

switch ($method) {
    case 'GET':
        handle_get();
        break;
    case 'POST':
        handle_post();
        break;
    default:
        json_error('Method not allowed', 405);
}

/** 最新デプロイステータスを返す */
function handle_get(): never {
    $status = get_latest_deploy_status();

    if ($status === null) {
        json_error('デプロイステータスの取得に失敗しました', 502);
    }

    json_ok($status);
}

/** デプロイをトリガーする */
function handle_post(): never {
    $result = trigger_deploy();

    if (!$result['success']) {
        error_log('[CMS] デプロイトリガー失敗: ' . $result['message']);
        json_error($result['message'], 502);
    }

    json_ok([
        'triggered' => true,
        'message'   => $result['message'],
    ]);
}
