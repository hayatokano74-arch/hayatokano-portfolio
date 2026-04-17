<?php
/**
 * Vercel On-Demand ISR ヘルパー
 *
 * CMS保存時にこの関数を呼ぶと、Vercel上の該当ページのキャッシュを破棄する。
 * 次のリクエスト時にVercelがページを再生成し、最新のCMSデータが反映される。
 *
 * 設定: cms/.env.php に以下を追加
 *   define('REVALIDATE_SECRET', 'your-secret');
 *   define('NEXT_APP_URL', 'https://hayatokano.com');
 */

/**
 * 指定パスのVercelキャッシュを破棄する（fire-and-forget）
 *
 * @param string[] $paths 再生成するパスの配列（例: ['/works', '/works/w001']）
 */
function revalidate_paths(array $paths): void {
    $secret = defined('REVALIDATE_SECRET') ? REVALIDATE_SECRET : '';
    $base   = defined('NEXT_APP_URL')       ? NEXT_APP_URL       : 'https://hayatokano.com';

    // シークレット未設定の場合はスキップ（ローカル開発環境）
    if ($secret === '') return;

    $url  = rtrim($base, '/') . '/api/revalidate';
    $body = json_encode(['paths' => $paths]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            "x-revalidate-secret: {$secret}",
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    curl_exec($ch);
    curl_close($ch);
}
