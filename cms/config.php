<?php
/**
 * CMS 設定ファイル
 * 全ての設定はここに集約する。環境ごとの差異は環境変数か .env.php で吸収する。
 */

// .env.php が存在すればローカル上書き設定を読み込む（gitignore 対象）
if (file_exists(__DIR__ . '/.env.php')) {
    require_once __DIR__ . '/.env.php';
}

// ─── パス設定 ────────────────────────────────────────────────
/** CMS ルートディレクトリ（絶対パス） */
define('CMS_ROOT', __DIR__);

/** SQLite データベースファイルのパス */
define('DB_PATH', CMS_ROOT . '/db/hayatokano.sqlite3');

/** アップロードファイルの保存先（ローカル開発: cms/uploads/、Xserver: public_html/media/） */
define('UPLOAD_DIR', defined('UPLOAD_DIR_OVERRIDE') ? UPLOAD_DIR_OVERRIDE : CMS_ROOT . '/uploads');

/** アップロードファイルの公開 URL プレフィックス */
define('UPLOAD_URL_PREFIX', defined('UPLOAD_URL_OVERRIDE') ? UPLOAD_URL_OVERRIDE : '/_cms/uploads');

// ─── 認証設定 ────────────────────────────────────────────────
/** セッション名 */
define('SESSION_NAME', 'hayatokano_cms');

/** セッション有効期間（秒）: 14 日 */
define('SESSION_LIFETIME', 60 * 60 * 24 * 14);

/** ログイン失敗のレートリミット（X 回失敗で Y 秒ロック） */
define('LOGIN_MAX_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_SECONDS', 300);

// ─── デプロイ設定 ────────────────────────────────────────────
/** GitHub Personal Access Token（.env.php で設定） */
define('GITHUB_TOKEN', defined('GITHUB_TOKEN_VALUE') ? GITHUB_TOKEN_VALUE : '');

/** GitHub リポジトリ（owner/repo） */
define('GITHUB_REPO', 'hayatokano74-arch/hayatokano-portfolio');

/** デプロイするブランチ */
define('GITHUB_DEPLOY_BRANCH', 'main');

/** トリガーするワークフローファイル名 */
define('GITHUB_WORKFLOW', 'deploy.yml');

// ─── 画像設定 ────────────────────────────────────────────────
/** アップロード最大サイズ（バイト）: 20MB */
define('UPLOAD_MAX_BYTES', 20 * 1024 * 1024);

/** 許可する MIME タイプ */
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** WebP 変換先の最大長辺ピクセル（それ以上は縮小） */
define('IMAGE_MAX_DIMENSION', 2560);

// ─── サイト設定 ────────────────────────────────────────────────
define('SITE_NAME', 'Hayato Kano');
define('SITE_URL', defined('SITE_URL_OVERRIDE') ? SITE_URL_OVERRIDE : 'https://hayatokano.com');
