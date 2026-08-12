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
 * 指定パスのVercelキャッシュを破棄する。
 *
 * 失敗時は最大3回リトライし、それでも失敗したらログに記録する
 * （fetchCms側のキャッシュ期間内は本番に反映されないままになるため、
 *  「なぜ反映されなかったか」を後から追えるようにしておく）。
 *
 * @param string[] $paths 再生成するパスの配列（例: ['/works', '/works/w001']）
 */
function revalidate_paths(array $paths): void {
    $secret = defined('REVALIDATE_SECRET') ? REVALIDATE_SECRET : '';
    $base   = defined('NEXT_APP_URL')       ? NEXT_APP_URL       : 'https://hayatokano.com';

    // シークレット未設定の場合はスキップ（ローカル開発環境）
    if ($secret === '') return;

    // Next.js側は trailingSlash: true のため /api/revalidate は /api/revalidate/ へ
    // 308リダイレクトされる。末尾スラッシュを付けてリダイレクトを回避しつつ、
    // 念のためリダイレクトが発生してもPOSTのまま追従するよう設定しておく。
    $url  = rtrim($base, '/') . '/api/revalidate/';
    $body = json_encode(['paths' => $paths]);

    $lastError  = '';
    $lastStatus = 0;
    $maxAttempts = 3;

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
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
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_POSTREDIR      => 3, // 301/302/303でもPOSTメソッド・ボディを維持
            CURLOPT_MAXREDIRS      => 3,
        ]);
        $res    = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error  = curl_error($ch);
        curl_close($ch);

        if ($error === '' && $status >= 200 && $status < 300) {
            return; // 成功
        }

        $lastError  = $error;
        $lastStatus = $status;

        // 最終試行でなければ少し待ってリトライ（ネットワーク瞬断・一時的なタイムアウト対策）
        if ($attempt < $maxAttempts) {
            usleep(300000 * $attempt); // 0.3s, 0.6s
        }
    }

    revalidate_log_failure($paths, $lastStatus, $lastError);
}

/** 再検証に失敗したことをログファイルに記録する */
function revalidate_log_failure(array $paths, int $status, string $error): void {
    $logDir = dirname(__DIR__) . '/logs';
    if (!is_dir($logDir)) mkdir($logDir, 0755, true);

    $line = sprintf(
        "[%s] revalidate失敗: paths=%s status=%d error=%s\n",
        date('Y-m-d H:i:s'),
        implode(',', $paths),
        $status,
        $error !== '' ? $error : '(HTTPエラー)'
    );
    file_put_contents($logDir . '/revalidate-failures.log', $line, FILE_APPEND | LOCK_EX);
}
