<?php
/**
 * データベース接続 + マイグレーション
 * PDO を使用。SQLite3。呼び出し元は get_db() を使う。
 */

require_once dirname(__DIR__) . '/config.php';

/** PDO インスタンス（シングルトン） */
function get_db(): PDO {
    static $db = null;
    if ($db !== null) return $db;

    $dir = dirname(DB_PATH);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA journal_mode=WAL');  // 書き込み性能向上
    $db->exec('PRAGMA foreign_keys=ON');

    run_migrations($db);
    return $db;
}

/** マイグレーション（テーブルが存在しない場合のみ作成） */
function run_migrations(PDO $db): void {
    $db->exec('CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT ""
    )');

    $current = (int)($db->query('SELECT COALESCE(MAX(version), 0) FROM schema_version')->fetchColumn());

    $migrations = get_migrations();
    foreach ($migrations as $version => $sql) {
        if ($version > $current) {
            $db->exec('BEGIN');
            try {
                $db->exec($sql);
                $db->prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')->execute([$version, gmdate('Y-m-d H:i:s')]);
                $db->exec('COMMIT');
            } catch (Exception $e) {
                $db->exec('ROLLBACK');
                throw $e;
            }
        }
    }
}

function get_migrations(): array {
    return [
        1 => /** Works */ '
            CREATE TABLE IF NOT EXISTS works (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT NOT NULL UNIQUE,
                title      TEXT NOT NULL DEFAULT "",
                date       TEXT NOT NULL DEFAULT "",
                year       TEXT NOT NULL DEFAULT "",
                tags       TEXT NOT NULL DEFAULT "[]",
                excerpt    TEXT NOT NULL DEFAULT "",
                pinned     INTEGER NOT NULL DEFAULT 0,
                data       TEXT NOT NULL DEFAULT "{}",
                body       TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_works_date ON works(date DESC);
            CREATE INDEX IF NOT EXISTS idx_works_pinned ON works(pinned DESC);
        ',

        2 => /** MeNoHoshi */ '
            CREATE TABLE IF NOT EXISTS me_no_hoshi (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT NOT NULL UNIQUE,
                title      TEXT NOT NULL DEFAULT "",
                date       TEXT NOT NULL DEFAULT "",
                year       TEXT NOT NULL DEFAULT "",
                tags       TEXT NOT NULL DEFAULT "[]",
                excerpt    TEXT NOT NULL DEFAULT "",
                data       TEXT NOT NULL DEFAULT "{}",
                body       TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_mnh_date ON me_no_hoshi(date DESC);
        ',

        3 => /** News */ '
            CREATE TABLE IF NOT EXISTS news (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT NOT NULL UNIQUE,
                title      TEXT NOT NULL DEFAULT "",
                date       TEXT NOT NULL DEFAULT "",
                data       TEXT NOT NULL DEFAULT "{}",
                body       TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC);
        ',

        4 => /** Timeline */ '
            CREATE TABLE IF NOT EXISTS timeline (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT NOT NULL UNIQUE,
                date       TEXT NOT NULL DEFAULT "",
                time_val   TEXT NOT NULL DEFAULT "",
                type       TEXT NOT NULL DEFAULT "text",
                images     TEXT NOT NULL DEFAULT "[]",
                body       TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline(date DESC, time_val DESC);
        ',

        5 => /** Text */ '
            CREATE TABLE IF NOT EXISTS texts (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT NOT NULL UNIQUE,
                title      TEXT NOT NULL DEFAULT "",
                date       TEXT NOT NULL DEFAULT "",
                year       TEXT NOT NULL DEFAULT "",
                categories TEXT NOT NULL DEFAULT "[]",
                data       TEXT NOT NULL DEFAULT "{}",
                body       TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_texts_date ON texts(date DESC);
        ',

        6 => /** About（単一レコード） */ '
            CREATE TABLE IF NOT EXISTS about (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                data       TEXT NOT NULL DEFAULT "{}",
                body       TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            INSERT OR IGNORE INTO about (id, data, body) VALUES (1, "{}", "");
        ',

        7 => /** Garden */ '
            CREATE TABLE IF NOT EXISTS garden (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slug       TEXT NOT NULL UNIQUE,
                date       TEXT NOT NULL DEFAULT "",
                title      TEXT NOT NULL DEFAULT "",
                tags       TEXT NOT NULL DEFAULT "[]",
                type       TEXT NOT NULL DEFAULT "text",
                body       TEXT NOT NULL DEFAULT "",
                created_at TEXT NOT NULL DEFAULT "",
                updated_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_garden_date ON garden(date DESC);
            CREATE INDEX IF NOT EXISTS idx_garden_title ON garden(title);
        ',

        8 => /** Media */ '
            CREATE TABLE IF NOT EXISTS media (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                filename    TEXT NOT NULL,
                path        TEXT NOT NULL UNIQUE,
                section     TEXT NOT NULL DEFAULT "",
                slug        TEXT NOT NULL DEFAULT "",
                width       INTEGER DEFAULT NULL,
                height      INTEGER DEFAULT NULL,
                size_bytes  INTEGER DEFAULT NULL,
                mime_type   TEXT DEFAULT NULL,
                created_at  TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_media_section ON media(section);
        ',

        9 => /** ログイン試行（レートリミット用） */ '
            CREATE TABLE IF NOT EXISTS login_attempts (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                ip         TEXT NOT NULL,
                attempted_at TEXT NOT NULL DEFAULT ""
            );
            CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts(ip, attempted_at);
        ',
    ];
}

// ─── 汎用 CRUD ヘルパー ──────────────────────────────────────

/** 許可テーブル名一覧 */
const DB_ALLOWED_TABLES = [
    'works', 'me_no_hoshi', 'news', 'timeline',
    'texts', 'about', 'garden', 'media', 'login_attempts', 'schema_version',
];

/**
 * ORDER BY 句をホワイトリスト検証する
 * "column ASC" / "column DESC" / 複数カラムをカンマ区切りで許可
 * カラム名は英数字・アンダースコアのみ
 */
function db_safe_order(string $order): string {
    $parts = array_map('trim', explode(',', $order));
    $safe  = [];
    foreach ($parts as $part) {
        if (!preg_match('/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+(ASC|DESC))?$/i', $part, $m)) {
            throw new InvalidArgumentException("不正な ORDER BY 句: {$part}");
        }
        $safe[] = $m[1] . ' ' . (isset($m[2]) ? strtoupper($m[2]) : 'ASC');
    }
    return implode(', ', $safe);
}

/** レコード全件取得 */
function db_all(string $table, string $order = 'id DESC'): array {
    if (!in_array($table, DB_ALLOWED_TABLES, true)) {
        throw new InvalidArgumentException("不正なテーブル名: {$table}");
    }
    $safe_order = db_safe_order($order);
    $db = get_db();
    return $db->query("SELECT * FROM {$table} ORDER BY {$safe_order}")->fetchAll();
}

/** slug で1件取得 */
function db_find_by_slug(string $table, string $slug): ?array {
    if (!in_array($table, DB_ALLOWED_TABLES, true)) {
        throw new InvalidArgumentException("不正なテーブル名: {$table}");
    }
    $db = get_db();
    $stmt = $db->prepare("SELECT * FROM {$table} WHERE slug = ?");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row !== false ? $row : null;
}

/** ID で1件取得 */
function db_find_by_id(string $table, int $id): ?array {
    $db = get_db();
    $stmt = $db->prepare("SELECT * FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row !== false ? $row : null;
}

/** 件数取得 */
function db_count(string $table): int {
    return (int)get_db()->query("SELECT COUNT(*) FROM {$table}")->fetchColumn();
}

/** updated_at トリガーを発火させる共通 UPDATE（全カラム渡す形式） */
function db_touch(string $table, int $id): void {
    get_db()->prepare("UPDATE {$table} SET updated_at = datetime('now') WHERE id = ?")->execute([$id]);
}
