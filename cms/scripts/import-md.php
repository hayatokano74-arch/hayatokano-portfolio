<?php
/**
 * Markdown → SQLite インポートスクリプト
 *
 * 使用方法:
 *   php scripts/import-md.php [section]
 *   section: works, me-no-hoshi, news, garden, about, all（省略時は all）
 *
 * 重要: content/ 配下のファイルは読み取り専用。削除・変更は一切しない。
 */

// CLIのみ許可
if (php_sapi_name() !== 'cli') {
    die("このスクリプトはコマンドラインから実行してください。\n");
}

// CMS ルートは scripts/ の1つ上
define('CMS_ROOT', dirname(__DIR__));

require_once CMS_ROOT . '/config.php';
require_once CMS_ROOT . '/lib/db.php';

// content/ は cms/ の1つ上（リポジトリルート直下）
$CONTENT_ROOT = dirname(CMS_ROOT) . '/content';

// コマンドライン引数でセクションを指定
$section = $argv[1] ?? 'all';
$force   = in_array('--force', $argv, true);  // 既存レコードを強制上書き

$valid_sections = ['works', 'me-no-hoshi', 'news', 'garden', 'about', 'all'];
if (!in_array($section, $valid_sections, true)) {
    die("不正なセクション: {$section}\n有効値: " . implode(', ', $valid_sections) . "\n");
}

// ─── エントリポイント ────────────────────────────────────────

if ($section === 'all' || $section === 'works') {
    import_works($CONTENT_ROOT . '/works', $force);
}
if ($section === 'all' || $section === 'me-no-hoshi') {
    import_me_no_hoshi($CONTENT_ROOT . '/me-no-hoshi', $force);
}
if ($section === 'all' || $section === 'news') {
    import_news($CONTENT_ROOT . '/news', $force);
}
if ($section === 'all' || $section === 'garden') {
    import_garden($CONTENT_ROOT . '/garden', $force);
}
if ($section === 'all' || $section === 'about') {
    import_about($CONTENT_ROOT . '/about/index.md', $force);
}

// ─── Works インポート ────────────────────────────────────────

function import_works(string $dir, bool $force): void {
    echo "\n=== Works のインポート ===\n";

    $files = glob($dir . '/*.md');
    if (!$files) {
        echo "ファイルが見つかりません: {$dir}\n";
        return;
    }

    // _template.md を除外
    $files = array_filter($files, fn($f) => basename($f) !== '_template.md');
    $files = array_values($files);

    $total   = count($files);
    $done    = 0;
    $skipped = 0;
    $db      = get_db();

    foreach ($files as $i => $file) {
        $num      = $i + 1;
        $content  = file_get_contents($file);
        $parsed   = parse_frontmatter($content);
        $fm       = $parsed['data'];
        $body     = $parsed['body'];
        $slug     = $fm['slug'] ?? pathinfo($file, PATHINFO_FILENAME);

        // slug が _template の場合もスキップ
        if ($slug === '_template') {
            continue;
        }

        // 既存レコード確認
        $stmt = $db->prepare('SELECT id FROM works WHERE slug = ?');
        $stmt->execute([$slug]);
        $existing = $stmt->fetchColumn();

        if ($existing && !$force) {
            echo "[{$num}/{$total}] {$slug}: スキップ（既存）\n";
            $skipped++;
            continue;
        }

        // tags, media, details/data を JSON 文字列に変換
        $tags  = json_encode($fm['tags']    ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $data  = json_encode(build_works_data($fm), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $media = json_encode($fm['media']   ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($existing) {
            $stmt = $db->prepare('
                UPDATE works SET
                    title = ?, date = ?, year = ?, tags = ?, excerpt = ?,
                    pinned = ?, data = ?, body = ?,
                    updated_at = datetime("now")
                WHERE slug = ?
            ');
            $stmt->execute([
                $fm['title']   ?? '',
                normalize_date($fm['date'] ?? ''),
                $fm['year']    ?? '',
                $tags,
                $fm['excerpt'] ?? '',
                isset($fm['pinned']) && $fm['pinned'] ? 1 : 0,
                $data,
                $body,
                $slug,
            ]);
        } else {
            $stmt = $db->prepare('
                INSERT INTO works (slug, title, date, year, tags, excerpt, pinned, data, body)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $slug,
                $fm['title']   ?? '',
                normalize_date($fm['date'] ?? ''),
                $fm['year']    ?? '',
                $tags,
                $fm['excerpt'] ?? '',
                isset($fm['pinned']) && $fm['pinned'] ? 1 : 0,
                $data,
                $body,
            ]);
        }

        echo "[{$num}/{$total}] {$slug}: 完了\n";
        $done++;
    }

    echo "完了: {$total}件中 {$done}件インポート、{$skipped}件スキップ\n";
}

/** Works の data フィールドを構築（media と details/その他を含める） */
function build_works_data(array $fm): array {
    $data = [];
    // media は data に含める
    if (isset($fm['media'])) $data['media'] = $fm['media'];
    // details があれば展開
    if (isset($fm['details'])) $data['details'] = $fm['details'];
    // その他の追加フィールド（known fields 以外）
    $known = ['slug', 'title', 'date', 'year', 'tags', 'excerpt', 'pinned', 'media', 'details', 'body'];
    foreach ($fm as $key => $val) {
        if (!in_array($key, $known, true)) {
            $data[$key] = $val;
        }
    }
    return $data;
}

// ─── 目の星インポート ────────────────────────────────────────

function import_me_no_hoshi(string $dir, bool $force): void {
    echo "\n=== 目の星のインポート ===\n";

    $files = glob($dir . '/*.md');
    if (!$files) {
        echo "ファイルが見つかりません: {$dir}\n";
        return;
    }

    $files = array_filter($files, fn($f) => basename($f) !== '_template.md');
    $files = array_values($files);

    $total   = count($files);
    $done    = 0;
    $skipped = 0;
    $db      = get_db();

    foreach ($files as $i => $file) {
        $num     = $i + 1;
        $content = file_get_contents($file);
        $parsed  = parse_frontmatter($content);
        $fm      = $parsed['data'];
        $body    = $parsed['body'];
        $slug    = $fm['slug'] ?? pathinfo($file, PATHINFO_FILENAME);

        if ($slug === '_template') continue;

        $stmt = $db->prepare('SELECT id FROM me_no_hoshi WHERE slug = ?');
        $stmt->execute([$slug]);
        $existing = $stmt->fetchColumn();

        if ($existing && !$force) {
            echo "[{$num}/{$total}] {$slug}: スキップ（既存）\n";
            $skipped++;
            continue;
        }

        $tags = json_encode($fm['tags'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $data = json_encode(build_extra_data($fm, ['slug', 'title', 'date', 'year', 'tags', 'excerpt']),
                            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($existing) {
            $stmt = $db->prepare('
                UPDATE me_no_hoshi SET
                    title = ?, date = ?, year = ?, tags = ?, excerpt = ?,
                    data = ?, body = ?,
                    updated_at = datetime("now")
                WHERE slug = ?
            ');
            $stmt->execute([
                $fm['title']   ?? '',
                normalize_date($fm['date'] ?? ''),
                $fm['year']    ?? '',
                $tags,
                $fm['excerpt'] ?? '',
                $data,
                $body,
                $slug,
            ]);
        } else {
            $stmt = $db->prepare('
                INSERT INTO me_no_hoshi (slug, title, date, year, tags, excerpt, data, body)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $slug,
                $fm['title']   ?? '',
                normalize_date($fm['date'] ?? ''),
                $fm['year']    ?? '',
                $tags,
                $fm['excerpt'] ?? '',
                $data,
                $body,
            ]);
        }

        echo "[{$num}/{$total}] {$slug}: 完了\n";
        $done++;
    }

    echo "完了: {$total}件中 {$done}件インポート、{$skipped}件スキップ\n";
}

// ─── News インポート ─────────────────────────────────────────

function import_news(string $dir, bool $force): void {
    echo "\n=== News のインポート ===\n";

    $files = glob($dir . '/*.md');
    if (!$files) {
        echo "ファイルが見つかりません: {$dir}\n";
        return;
    }

    $files = array_filter($files, fn($f) => basename($f) !== '_template.md');
    $files = array_values($files);

    $total   = count($files);
    $done    = 0;
    $skipped = 0;
    $db      = get_db();

    foreach ($files as $i => $file) {
        $num     = $i + 1;
        $content = file_get_contents($file);
        $parsed  = parse_frontmatter($content);
        $fm      = $parsed['data'];
        $body    = $parsed['body'];
        $slug    = $fm['slug'] ?? pathinfo($file, PATHINFO_FILENAME);

        if ($slug === '_template') continue;

        $stmt = $db->prepare('SELECT id FROM news WHERE slug = ?');
        $stmt->execute([$slug]);
        $existing = $stmt->fetchColumn();

        if ($existing && !$force) {
            echo "[{$num}/{$total}] {$slug}: スキップ（既存）\n";
            $skipped++;
            continue;
        }

        $data = json_encode(build_extra_data($fm, ['slug', 'title', 'date']),
                            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($existing) {
            $stmt = $db->prepare('
                UPDATE news SET
                    title = ?, date = ?,
                    data = ?, body = ?,
                    updated_at = datetime("now")
                WHERE slug = ?
            ');
            $stmt->execute([
                $fm['title'] ?? '',
                normalize_date($fm['date'] ?? ''),
                $data,
                $body,
                $slug,
            ]);
        } else {
            $stmt = $db->prepare('
                INSERT INTO news (slug, title, date, data, body)
                VALUES (?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $slug,
                $fm['title'] ?? '',
                normalize_date($fm['date'] ?? ''),
                $data,
                $body,
            ]);
        }

        echo "[{$num}/{$total}] {$slug}: 完了\n";
        $done++;
    }

    echo "完了: {$total}件中 {$done}件インポート、{$skipped}件スキップ\n";
}

// ─── About インポート ────────────────────────────────────────

function import_about(string $file, bool $force): void {
    echo "\n=== About のインポート ===\n";

    if (!file_exists($file)) {
        echo "ファイルが見つかりません: {$file}\n";
        return;
    }

    $content = file_get_contents($file);
    $parsed  = parse_frontmatter($content);
    $fm      = $parsed['data'];
    $body    = $parsed['body'];

    $db      = get_db();
    $stmt    = $db->prepare('SELECT id FROM about WHERE id = 1');
    $stmt->execute();
    $existing = $stmt->fetchColumn();

    if ($existing && !$force) {
        echo "スキップ（既存）\n";
        return;
    }

    // frontmatter 全体を data として保存
    $data = json_encode($fm, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($existing) {
        $db->prepare('UPDATE about SET data = ?, body = ?, updated_at = datetime("now") WHERE id = 1')
           ->execute([$data, $body]);
    } else {
        $db->prepare('INSERT INTO about (id, data, body) VALUES (1, ?, ?)')
           ->execute([$data, $body]);
    }

    echo "完了\n";
}

// ─── Garden インポート ───────────────────────────────────────

function import_garden(string $dir, bool $force): void {
    echo "\n=== Garden のインポート ===\n";

    $files = glob($dir . '/*.md');
    if (!$files) {
        echo "ファイルが見つかりません: {$dir}\n";
        return;
    }

    $files = array_filter($files, fn($f) => basename($f) !== '_template.md');
    $files = array_values($files);

    $total      = count($files);
    $done       = 0;
    $skipped    = 0;
    $db         = get_db();
    $batch_size = 100;  // トランザクションのバッチサイズ

    echo "合計 {$total}件を処理します...\n";

    $db->exec('BEGIN');
    $batch_count = 0;

    foreach ($files as $i => $file) {
        $content  = file_get_contents($file);
        $parsed   = parse_frontmatter($content);
        $fm       = $parsed['data'];
        $body     = $parsed['body'];
        $filename = pathinfo($file, PATHINFO_FILENAME);

        // slug はファイル名から生成（日付はそのままスラッグとして使用）
        $slug = $filename;

        // date はファイル名から推測（frontmatter の date を優先）
        if (!empty($fm['date'])) {
            $date = normalize_date((string)$fm['date']);
        } else {
            $date = guess_date_from_filename($filename);
        }

        // title は frontmatter の title を使用（なければ日付）
        $title = $fm['title'] ?? $date;

        // 既存レコード確認
        $stmt_check = $db->prepare('SELECT id FROM garden WHERE slug = ?');
        $stmt_check->execute([$slug]);
        $existing = $stmt_check->fetchColumn();

        if ($existing && !$force) {
            $skipped++;
        } else {
            $tags = json_encode($fm['tags'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            if ($existing) {
                $stmt = $db->prepare('
                    UPDATE garden SET
                        date = ?, title = ?, tags = ?, type = ?, body = ?,
                        updated_at = datetime("now")
                    WHERE slug = ?
                ');
                $stmt->execute([
                    $date,
                    $title,
                    $tags,
                    $fm['type'] ?? 'text',
                    $body,
                    $slug,
                ]);
            } else {
                $stmt = $db->prepare('
                    INSERT INTO garden (slug, date, title, tags, type, body)
                    VALUES (?, ?, ?, ?, ?, ?)
                ');
                $stmt->execute([
                    $slug,
                    $date,
                    $title,
                    $tags,
                    $fm['type'] ?? 'text',
                    $body,
                ]);
            }
            $done++;
        }

        $batch_count++;

        // バッチサイズごとにトランザクションをコミットして再開
        if ($batch_count >= $batch_size) {
            $db->exec('COMMIT');
            echo "進捗: " . ($i + 1) . "件...\n";
            $db->exec('BEGIN');
            $batch_count = 0;
        }
    }

    // 残りをコミット
    $db->exec('COMMIT');

    echo "完了: {$total}件中 {$done}件インポート、{$skipped}件スキップ\n";
}

// ─── ユーティリティ関数 ──────────────────────────────────────

/**
 * Markdown ファイルを frontmatter + body に分割する
 * --- で囲まれた YAML frontmatter を解析する（シンプルな key: value 形式）
 *
 * 対応する YAML 形式:
 * - string: `key: value`
 * - integer: 数値のみの場合
 * - boolean: `true` / `false`
 * - null: `~` または空
 * - 配列: `- item` 形式
 * - ネストオブジェクト: インデントされた key: value 形式
 */
function parse_frontmatter(string $content): array {
    $content = str_replace("\r\n", "\n", $content);

    // --- で始まる frontmatter ブロックを検出
    if (!preg_match('/^---\n(.*?)\n---\n?/s', $content, $matches)) {
        // frontmatter がない場合は body のみ返す
        return ['data' => [], 'body' => trim($content)];
    }

    $yaml_str = $matches[1];
    $body     = trim(substr($content, strlen($matches[0])));
    $data     = parse_yaml_simple($yaml_str);

    return ['data' => $data, 'body' => $body];
}

/**
 * シンプルな YAML パーサー（正規表現ベース）
 * PHP の yaml 拡張が使えない場合向け
 */
function parse_yaml_simple(string $yaml): array {
    $lines  = explode("\n", $yaml);
    $result = [];

    $i = 0;
    $n = count($lines);

    while ($i < $n) {
        $line = $lines[$i];

        // 空行・コメント行はスキップ
        if (trim($line) === '' || preg_match('/^\s*#/', $line)) {
            $i++;
            continue;
        }

        // キー: 値 形式
        if (preg_match('/^([a-zA-Z_][a-zA-Z0-9_\-]*):\s*(.*)$/', $line, $m)) {
            $key = $m[1];
            $val = $m[2];

            if ($val === '' || $val === null) {
                // 次の行がインデントされていれば配列またはオブジェクト
                $i++;
                if ($i < $n) {
                    $next = $lines[$i];
                    if (preg_match('/^(\s+)-\s/', $next)) {
                        // インデントされた配列
                        [$arr, $i] = collect_array($lines, $i);
                        $result[$key] = $arr;
                    } elseif (preg_match('/^(\s+)[a-zA-Z_]/', $next)) {
                        // ネストオブジェクト
                        $indent = strlen($next) - strlen(ltrim($next));
                        [$obj, $i] = collect_object($lines, $i, $indent);
                        $result[$key] = $obj;
                    } else {
                        // 値なし → null
                        $result[$key] = null;
                    }
                } else {
                    $result[$key] = null;
                }
            } else {
                $result[$key] = parse_yaml_value($val);
                $i++;
            }
            continue;
        }

        // - item 形式（トップレベルの配列は通常ないが念のため）
        if (preg_match('/^-\s+(.+)$/', $line, $m)) {
            // 配列形式はキーがないため無視
            $i++;
            continue;
        }

        $i++;
    }

    return $result;
}

/**
 * インデントされた配列を収集する
 * @param array  $lines 全行
 * @param int    $start 開始インデックス（"  - item" の行）
 * @return array [収集した配列, 次の処理開始インデックス]
 */
function collect_array(array $lines, int $start): array {
    $result = [];
    $n      = count($lines);
    $i      = $start;

    // 最初の行のインデントを基準にする
    $base_indent = strlen($lines[$start]) - strlen(ltrim($lines[$start]));

    while ($i < $n) {
        $line   = $lines[$i];
        $indent = strlen($line) - strlen(ltrim($line));
        $trimmed = ltrim($line);

        if ($trimmed === '') {
            $i++;
            continue;
        }

        // インデントが基準より浅くなったら終了
        if ($indent < $base_indent) {
            break;
        }

        // "  - value" 形式
        if (preg_match('/^-\s+(.+)$/', $trimmed, $m)) {
            $result[] = parse_yaml_value($m[1]);
            $i++;
        } elseif ($trimmed === '-') {
            $result[] = null;
            $i++;
        } else {
            break;
        }
    }

    return [$result, $i];
}

/**
 * ネストされたオブジェクトを収集する
 * @param array  $lines       全行
 * @param int    $start       開始インデックス
 * @param int    $base_indent 基準インデント幅
 * @return array [収集したオブジェクト, 次の処理開始インデックス]
 */
function collect_object(array $lines, int $start, int $base_indent): array {
    $result = [];
    $n      = count($lines);
    $i      = $start;

    while ($i < $n) {
        $line    = $lines[$i];
        $indent  = strlen($line) - strlen(ltrim($line));
        $trimmed = ltrim($line);

        if ($trimmed === '') {
            $i++;
            continue;
        }

        // インデントが基準より浅くなったら終了
        if ($indent < $base_indent) {
            break;
        }

        // "  key: value" 形式
        if (preg_match('/^([a-zA-Z_][a-zA-Z0-9_\-]*):\s*(.*)$/', $trimmed, $m)) {
            $key = $m[1];
            $val = $m[2];
            if ($val === '') {
                $i++;
                // 次の行を確認
                if ($i < $n) {
                    $next        = $lines[$i];
                    $next_indent = strlen($next) - strlen(ltrim($next));
                    $next_trim   = ltrim($next);
                    if ($next_trim !== '' && $next_indent > $indent) {
                        if (preg_match('/^-\s/', $next_trim)) {
                            [$arr, $i] = collect_array($lines, $i);
                            $result[$key] = $arr;
                        } else {
                            [$obj, $i] = collect_object($lines, $i, $next_indent);
                            $result[$key] = $obj;
                        }
                    } else {
                        $result[$key] = null;
                    }
                } else {
                    $result[$key] = null;
                }
            } else {
                $result[$key] = parse_yaml_value($val);
                $i++;
            }
        } else {
            break;
        }
    }

    return [$result, $i];
}

/**
 * YAML の値文字列をPHPの型に変換する
 */
function parse_yaml_value(string $val): mixed {
    $val = trim($val);

    // クォート除去
    if (preg_match('/^"(.*)"$/', $val, $m)) return $m[1];
    if (preg_match("/^'(.*)'$/", $val, $m)) return $m[1];

    // null
    if ($val === '~' || $val === 'null') return null;

    // boolean
    if ($val === 'true')  return true;
    if ($val === 'false') return false;

    // 整数
    if (preg_match('/^-?\d+$/', $val)) return (int)$val;

    // 浮動小数点
    if (preg_match('/^-?\d+\.\d+$/', $val)) return (float)$val;

    return $val;
}

/**
 * 日付文字列を YYYY-MM-DD 形式に正規化する
 * 例: "2026/02/14" → "2026-02-14", "2021-02-24" → "2021-02-24"
 */
function normalize_date(string $date): string {
    if ($date === '') return '';
    // スラッシュをハイフンに変換
    $normalized = str_replace('/', '-', $date);
    // YYYY-MM-DD 形式の確認
    if (preg_match('/^\d{4}-\d{2}-\d{2}/', $normalized)) {
        return substr($normalized, 0, 10);
    }
    return $normalized;
}

/**
 * ファイル名から日付を推測する
 * 例: "2021-02-24" → "2021-02-24", "2021.02.24" → "2021-02-24"
 */
function guess_date_from_filename(string $filename): string {
    // YYYY-MM-DD 形式
    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $filename, $m)) {
        return $m[1];
    }
    // YYYY.MM.DD 形式
    if (preg_match('/^(\d{4})\.(\d{2})\.(\d{2})/', $filename, $m)) {
        return "{$m[1]}-{$m[2]}-{$m[3]}";
    }
    return '';
}

/**
 * known フィールド以外の追加データを返す
 */
function build_extra_data(array $fm, array $known_fields): array {
    $data = [];
    foreach ($fm as $key => $val) {
        if (!in_array($key, $known_fields, true)) {
            $data[$key] = $val;
        }
    }
    return $data;
}
