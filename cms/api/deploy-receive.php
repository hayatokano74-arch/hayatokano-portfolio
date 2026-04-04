<?php
/**
 * デプロイ受信 Webhook
 *
 * GitHub Actions がビルド完了後に呼び出す。
 * GitHub Release から tar.gz をダウンロードし、サーバー上に展開する。
 *
 * POST /api/deploy-receive.php
 * Authorization: Bearer <DEPLOY_WEBHOOK_SECRET>
 */

// エラーをログに出力（画面には出さない）
ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(300);

require_once dirname(__DIR__) . '/config.php';

// ── 認証 ──
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = '';
if (preg_match('/^Bearer\s+(.+)$/i', $auth_header, $m)) {
    $token = $m[1];
}

if (!defined('DEPLOY_WEBHOOK_SECRET') || DEPLOY_WEBHOOK_SECRET === '' || !hash_equals(DEPLOY_WEBHOOK_SECRET, $token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => '認証失敗']);
    exit;
}

// ── メイン処理 ──
header('Content-Type: application/json');

try {
    $log = [];
    $public_html = realpath(dirname(__DIR__, 2));
    $db_path     = $public_html . '/_cms/db/hayatokano.sqlite3';
    $backup_dir  = dirname($public_html) . '/backups';
    $tmp_dir     = sys_get_temp_dir() . '/hayatokano-deploy-' . time();
    $tar_path    = $tmp_dir . '/deploy.tar.gz';

    // 1. DB バックアップ
    if (!is_dir($backup_dir)) mkdir($backup_dir, 0755, true);
    if (file_exists($db_path)) {
        // WAL を統合
        shell_exec("sqlite3 " . escapeshellarg($db_path) . " 'PRAGMA wal_checkpoint(TRUNCATE);' 2>/dev/null");
        $stamp = date('Ymd-His');
        copy($db_path, "$backup_dir/hayatokano.sqlite3.bak-$stamp");
        $log[] = "DB バックアップ: bak-$stamp";

        // 古いバックアップを削除（3世代保持）
        $backups = glob("$backup_dir/hayatokano.sqlite3.bak-*");
        rsort($backups);
        foreach (array_slice($backups, 3) as $old) {
            unlink($old);
        }
    }

    // DB 件数を記録
    $before = shell_exec("sqlite3 " . escapeshellarg($db_path) . " \"SELECT COUNT(*) FROM works;\" 2>/dev/null");
    $before_count = (int)trim($before ?: '0');
    $log[] = "デプロイ前 works: $before_count";

    // 2. GitHub Release から tar.gz をダウンロード
    mkdir($tmp_dir, 0755, true);

    $release_url = sprintf(
        'https://api.github.com/repos/%s/releases/tags/latest-deploy',
        GITHUB_REPO
    );

    // Release 情報を取得
    $release_json = github_get($release_url);
    if (!$release_json) throw new \RuntimeException('Release 情報の取得に失敗');

    $release = json_decode($release_json, true);
    $assets = $release['assets'] ?? [];
    $asset = null;
    foreach ($assets as $a) {
        if (str_ends_with($a['name'], '.tar.gz')) {
            $asset = $a;
            break;
        }
    }
    if (!$asset) throw new \RuntimeException('tar.gz アセットが見つかりません');

    $download_url = $asset['url'];
    $log[] = "ダウンロード: " . $asset['name'] . " (" . round($asset['size'] / 1024 / 1024, 1) . "MB)";

    // ダウンロード
    $ch = curl_init($download_url);
    $fp = fopen($tar_path, 'wb');
    curl_setopt_array($ch, [
        CURLOPT_FILE           => $fp,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/octet-stream',
            'Authorization: Bearer ' . GITHUB_TOKEN,
            'User-Agent: hayatokano-cms/1.0',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_TIMEOUT        => 120,
    ]);
    curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_err  = curl_error($ch);
    curl_close($ch);
    fclose($fp);

    if ($http_code !== 200 || !file_exists($tar_path) || filesize($tar_path) < 1000) {
        throw new \RuntimeException("ダウンロード失敗: HTTP $http_code $curl_err");
    }
    $log[] = "ダウンロード完了: " . round(filesize($tar_path) / 1024 / 1024, 1) . "MB";

    // 3. 展開
    $extract_dir = $tmp_dir . '/extracted';
    mkdir($extract_dir, 0755, true);
    $tar_result = shell_exec("cd " . escapeshellarg($extract_dir) . " && tar xzf " . escapeshellarg($tar_path) . " 2>&1");
    if (!is_dir("$extract_dir/out")) {
        throw new \RuntimeException("tar 展開失敗: out/ が見つかりません. $tar_result");
    }
    $log[] = "tar 展開完了";

    // 4. フロントエンド展開（保護対象を除外して rsync 相当の処理）
    $protect = ['wp', 'wp-admin', 'wp-content', 'wp-includes', '_cms', 'kiwamarisou.hayatokano.com', 'media.hayatokano.com', 'media', '.htaccess'];
    deploy_directory("$extract_dir/out", $public_html, $protect);
    $log[] = "フロントエンド展開完了";

    // 5. .htaccess 配置
    if (file_exists("$extract_dir/deploy/.htaccess")) {
        copy("$extract_dir/deploy/.htaccess", "$public_html/.htaccess");
        $log[] = ".htaccess 配置完了";
    }

    // 6. CMS ファイル展開（db/ uploads/ .env.php を保護）
    $cms_protect = ['db', 'uploads', '.env.php'];
    if (is_dir("$extract_dir/cms")) {
        deploy_directory("$extract_dir/cms", "$public_html/_cms", $cms_protect);
        $log[] = "CMS ファイル展開完了";
    }

    // 7. DB 件数検証
    $after = shell_exec("sqlite3 " . escapeshellarg($db_path) . " \"SELECT COUNT(*) FROM works;\" 2>/dev/null");
    $after_count = (int)trim($after ?: '0');
    $log[] = "デプロイ後 works: $after_count";

    if ($after_count < $before_count) {
        // ロールバック
        $latest_bak = glob("$backup_dir/hayatokano.sqlite3.bak-*");
        rsort($latest_bak);
        if (!empty($latest_bak)) {
            copy($latest_bak[0], $db_path);
            $log[] = "⚠️ DB 件数減少を検出、ロールバック実行";
        }
    }

    // 8. クリーンアップ
    shell_exec("rm -rf " . escapeshellarg($tmp_dir));
    $log[] = "クリーンアップ完了";

    echo json_encode(['success' => true, 'log' => $log], JSON_UNESCAPED_UNICODE);

} catch (\Throwable $e) {
    error_log('[Deploy Receive] ' . $e->getMessage());
    // クリーンアップ
    if (isset($tmp_dir) && is_dir($tmp_dir)) {
        shell_exec("rm -rf " . escapeshellarg($tmp_dir));
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

// ── ヘルパー関数 ──

/** GitHub API GET リクエスト */
function github_get(string $url): string|false {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . GITHUB_TOKEN,
            'User-Agent: hayatokano-cms/1.0',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $code === 200 ? $body : false;
}

/**
 * ディレクトリを展開先にコピー（保護対象は除外）
 */
function deploy_directory(string $src, string $dst, array $protect): void {
    if (!is_dir($src)) return;
    if (!is_dir($dst)) mkdir($dst, 0755, true);

    $items = scandir($src);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        if (in_array($item, $protect, true)) continue;

        $s = "$src/$item";
        $d = "$dst/$item";

        if (is_dir($s)) {
            deploy_directory($s, $d, []);
        } else {
            copy($s, $d);
        }
    }
}
