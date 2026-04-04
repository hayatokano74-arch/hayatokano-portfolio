<?php
/**
 * GitHub Actions デプロイトリガー
 * workflow_dispatch イベントを GitHub API 経由で発火させる
 */

require_once dirname(__DIR__) . '/config.php';

/**
 * GitHub Actions ワークフローをトリガーする
 * @return array { success: bool, message: string, http_status: int }
 */
function trigger_deploy(): array {
    if (!GITHUB_TOKEN) {
        return ['success' => false, 'message' => 'GITHUB_TOKEN が設定されていません', 'http_status' => 0];
    }

    $url = sprintf(
        'https://api.github.com/repos/%s/actions/workflows/%s/dispatches',
        GITHUB_REPO,
        GITHUB_WORKFLOW
    );

    $payload = json_encode([
        'ref'    => GITHUB_DEPLOY_BRANCH,
        'inputs' => [],
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . GITHUB_TOKEN,
            'Content-Type: application/json',
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: hayatokano-cms/1.0',
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);

    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error  = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log('[Deploy] cURL エラー: ' . $error);
        return ['success' => false, 'message' => 'ネットワークエラー: ' . $error, 'http_status' => 0];
    }

    // GitHub は成功時 204 No Content を返す
    if ($status === 204) {
        return ['success' => true, 'message' => 'デプロイを開始しました', 'http_status' => 204];
    }

    $detail = '';
    if ($body) {
        $json = json_decode($body, true);
        $detail = $json['message'] ?? $body;
    }
    error_log('[Deploy] GitHub API エラー: ' . $status . ' ' . $detail);
    return ['success' => false, 'message' => 'GitHub API エラー (' . $status . '): ' . $detail, 'http_status' => $status];
}

/**
 * 最新のデプロイ実行ステータスを取得する
 * @return array|null 最新ワークフロー実行情報、取得失敗時は null
 */
function get_latest_deploy_status(): ?array {
    if (!GITHUB_TOKEN) return null;

    $url = sprintf(
        'https://api.github.com/repos/%s/actions/workflows/%s/runs?per_page=1&branch=%s',
        GITHUB_REPO,
        GITHUB_WORKFLOW,
        GITHUB_DEPLOY_BRANCH
    );

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . GITHUB_TOKEN,
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: hayatokano-cms/1.0',
        ],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200 || !$body) return null;
    $data = json_decode($body, true);
    $runs = $data['workflow_runs'] ?? [];
    if (empty($runs)) return null;

    $run = $runs[0];
    return [
        'id'         => $run['id'],
        'status'     => $run['status'],      // queued, in_progress, completed
        'conclusion' => $run['conclusion'],  // success, failure, cancelled, null
        'started_at' => $run['run_started_at'] ?? $run['created_at'],
        'html_url'   => $run['html_url'],
    ];
}
