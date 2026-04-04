<?php
/**
 * メディア完全移行スクリプト
 *
 * WordPressサーバー上の全画像をダウンロードし、
 * CMS uploadsディレクトリに保存、DB内のURLを差し替える。
 *
 * 設計方針:
 *   1. 全てのWP URLを収集（壊れたUnicodeも正しいURLに変換）
 *   2. 重複排除して一覧を作成
 *   3. 1ファイルずつ: ダウンロード → 保存 → DB更新（アトミック）
 *   4. 失敗ログを出力
 *
 * 実行: cd _cms && php scripts/migrate-media.php
 */

ini_set('max_execution_time', 0);
ini_set('memory_limit', '512M');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';

$db = get_db();

echo "=== メディア完全移行 ===\n";
echo "UPLOAD_DIR: " . UPLOAD_DIR . "\n";
echo "UPLOAD_URL_PREFIX: " . UPLOAD_URL_PREFIX . "\n\n";

$stats = ['ok' => 0, 'skip' => 0, 'fail' => 0];
$fail_log = [];

// ─── ステップ1: Works / MeNoHoshi のdata JSONからWP URLを差し替え ───
foreach (['works', 'me_no_hoshi'] as $table) {
    echo "=== $table ===\n";
    $rows = $db->query("SELECT id, slug, data FROM $table WHERE data LIKE '%wp.hayatokano%'")->fetchAll();

    foreach ($rows as $row) {
        $data_json = $row['data'];
        $slug = $row['slug'];
        $section = str_replace('_', '-', $table);

        // JSON内の全WP URLを一括変換
        $new_json = preg_replace_callback(
            '|https?://wp\.hayatokano\.com/[^"]+|',
            function($m) use ($section, $slug, &$stats, &$fail_log) {
                return migrate_one_url($m[0], $section, $slug, $stats, $fail_log);
            },
            $data_json
        );

        if ($new_json !== $data_json) {
            $db->prepare("UPDATE $table SET data = ? WHERE id = ?")->execute([$new_json, $row['id']]);
            echo "  ✓ $table/$slug updated\n";
        }
    }
}

// ─── ステップ2: About ───
echo "=== about ===\n";
$about = $db->query("SELECT id, data FROM about WHERE data LIKE '%wp.hayatokano%'")->fetch();
if ($about) {
    $new_json = preg_replace_callback(
        '|https?://wp\.hayatokano\.com/[^"]+|',
        function($m) use (&$stats, &$fail_log) {
            return migrate_one_url($m[0], 'about', 'about', $stats, $fail_log);
        },
        $about['data']
    );
    if ($new_json !== $about['data']) {
        $db->prepare("UPDATE about SET data = ? WHERE id = ?")->execute([$new_json, $about['id']]);
        echo "  ✓ about updated\n";
    }
}

// ─── ステップ3: Garden の body からWP URLを差し替え ───
echo "=== garden ===\n";
$gardens = $db->query("SELECT id, slug, body FROM garden WHERE body LIKE '%wp.hayatokano%'")->fetchAll();
$g_count = 0;
foreach ($gardens as $row) {
    $new_body = preg_replace_callback(
        '|https?://wp\.hayatokano\.com/[^")\s]+|',
        function($m) use ($row, &$stats, &$fail_log) {
            return migrate_one_url($m[0], 'garden', $row['slug'], $stats, $fail_log);
        },
        $row['body']
    );
    if ($new_body !== $row['body']) {
        $db->prepare("UPDATE garden SET body = ? WHERE id = ?")->execute([$new_body, $row['id']]);
        $g_count++;
    }
}
echo "  ✓ $g_count entries updated\n";

// ─── 結果 ───
echo "\n=== 結果 ===\n";
echo "成功: {$stats['ok']}\n";
echo "スキップ（既存）: {$stats['skip']}\n";
echo "失敗: {$stats['fail']}\n";

if ($fail_log) {
    echo "\n=== 失敗リスト ===\n";
    foreach ($fail_log as $f) echo "  $f\n";
}

// メディアテーブルの件数
$media_count = $db->query("SELECT COUNT(*) FROM media")->fetchColumn();
echo "\nmedia テーブル: $media_count 件\n";

// ===========================================================================
// ユーティリティ関数
// ===========================================================================

/**
 * 1つのWP URLを処理:
 *   壊れたUnicode復元 → URLエンコード → ダウンロード → DB登録 → 新URL返却
 */
function migrate_one_url(
    string $wp_url,
    string $section,
    string $slug,
    array &$stats,
    array &$fail_log
): string {
    global $db;

    // YouTube等の動画URLはスキップ
    if (str_contains($wp_url, 'youtube.com') || str_contains($wp_url, 'vimeo.com')) {
        return $wp_url;
    }

    // 1. 壊れたUnicode復元: u65e5 → 日
    $decoded = preg_replace_callback('/u([0-9a-fA-F]{4})/', function($m) {
        $cp = hexdec($m[1]);
        if (($cp >= 0x3000 && $cp <= 0x9fff) || ($cp >= 0xf900 && $cp <= 0xfaff) || ($cp >= 0xff00 && $cp <= 0xffef)) {
            return mb_chr($cp, 'UTF-8');
        }
        return $m[0];
    }, $wp_url);

    // 2. URLデコード（%E6%97%A5 → 日）
    $decoded = rawurldecode($decoded);

    // 3. ファイル名を取得して安全な名前にする
    $basename = basename(parse_url($decoded, PHP_URL_PATH));
    $safe_name = preg_replace('/[^\w.\-]/', '_', $basename);
    if (strlen($safe_name) > 120) {
        $ext = pathinfo($safe_name, PATHINFO_EXTENSION);
        $safe_name = md5($basename) . '.' . ($ext ?: 'jpg');
    }

    // 4. 保存先パス
    $dest_dir  = UPLOAD_DIR . "/$section/$slug";
    $dest_file = "$dest_dir/$safe_name";
    $new_url   = UPLOAD_URL_PREFIX . "/$section/$slug/$safe_name";

    // 5. 既にダウンロード済みならスキップ
    if (file_exists($dest_file) && filesize($dest_file) > 100) {
        $stats['skip']++;
        register_media($db, $safe_name, "/$section/$slug/$safe_name", $section, $slug, $dest_file);
        return $new_url;
    }

    // 6. ダウンロード用のエンコード済みURLを生成
    $download_url = encode_url($decoded);

    // 7. ダウンロード
    if (!is_dir($dest_dir)) mkdir($dest_dir, 0755, true);

    $data = download($download_url);
    if ($data === null) {
        $stats['fail']++;
        $fail_log[] = "$download_url (from: $wp_url)";
        return $wp_url; // 失敗時は元のURLを維持
    }

    file_put_contents($dest_file, $data);
    register_media($db, $safe_name, "/$section/$slug/$safe_name", $section, $slug, $dest_file);

    $stats['ok']++;
    return $new_url;
}

/** URLのパス部分を正しくエンコード */
function encode_url(string $url): string {
    $p = parse_url($url);
    if (!isset($p['path'])) return $url;
    $segments = explode('/', $p['path']);
    $encoded = array_map(fn($s) => rawurlencode($s), $segments);
    return ($p['scheme'] ?? 'https') . '://' . ($p['host'] ?? '') . implode('/', $encoded);
}

/** HTTPダウンロード（リトライ1回） */
function download(string $url, int $retry = 1): ?string {
    for ($i = 0; $i <= $retry; $i++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $data = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code === 200 && $data && strlen($data) > 100) return $data;
        if ($i < $retry) usleep(500000); // 0.5秒待ってリトライ
    }
    return null;
}

/** mediaテーブルに登録（重複チェック付き） */
function register_media(PDO $db, string $filename, string $path, string $section, string $slug, string $filepath): void {
    $check = $db->prepare("SELECT id FROM media WHERE path = ?");
    $check->execute([$path]);
    if ($check->fetchColumn()) return;

    $size = @getimagesize($filepath);
    $db->prepare("INSERT INTO media (filename, path, section, slug, width, height, size_bytes, mime_type) VALUES (?,?,?,?,?,?,?,?)")
       ->execute([$filename, $path, $section, $slug, $size[0] ?? 0, $size[1] ?? 0, filesize($filepath), $size['mime'] ?? 'image/jpeg']);
}
