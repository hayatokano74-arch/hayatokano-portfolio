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
if (!defined('CMS_ROOT')) define('CMS_ROOT', __DIR__);

/** SQLite データベースファイルのパス */
if (!defined('DB_PATH')) define('DB_PATH', CMS_ROOT . '/db/hayatokano.sqlite3');

/** アップロードファイルの保存先（ローカル開発: cms/uploads/、Xserver: public_html/media/） */
if (!defined('UPLOAD_DIR')) define('UPLOAD_DIR', defined('UPLOAD_DIR_OVERRIDE') ? UPLOAD_DIR_OVERRIDE : CMS_ROOT . '/uploads');

/** アップロードファイルの公開 URL プレフィックス */
if (!defined('UPLOAD_URL_PREFIX')) define('UPLOAD_URL_PREFIX', defined('UPLOAD_URL_OVERRIDE') ? UPLOAD_URL_OVERRIDE : '/_cms/uploads');

// ─── 認証設定 ────────────────────────────────────────────────
/** セッション名 */
if (!defined('SESSION_NAME')) define('SESSION_NAME', 'hayatokano_cms');

/** セッション有効期間（秒）: 90 日 */
if (!defined('SESSION_LIFETIME')) define('SESSION_LIFETIME', 60 * 60 * 24 * 90);

/** ログイン失敗のレートリミット（X 回失敗で Y 秒ロック） */
if (!defined('LOGIN_MAX_ATTEMPTS')) define('LOGIN_MAX_ATTEMPTS', 5);
if (!defined('LOGIN_LOCKOUT_SECONDS')) define('LOGIN_LOCKOUT_SECONDS', 300);

// ─── デプロイ設定 ────────────────────────────────────────────
// コンテンツはクライアントサイドで CMS API から取得するため、
// CMS での編集・保存は本番サイトに即座に反映される。
// コード変更（CSS・レイアウト等）のデプロイはローカルで ./deploy.sh を実行する。

// ─── 画像設定 ────────────────────────────────────────────────
/** アップロード最大サイズ（バイト）: 制限なし（PHPのpost_max_sizeに準拠） */
if (!defined('UPLOAD_MAX_BYTES')) define('UPLOAD_MAX_BYTES', PHP_INT_MAX);

/** 許可する MIME タイプ */
if (!defined('ALLOWED_MIME_TYPES')) define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** 画像の最大長辺ピクセル: 制限なし（元のサイズを維持） */
if (!defined('IMAGE_MAX_DIMENSION')) define('IMAGE_MAX_DIMENSION', PHP_INT_MAX);

// ─── サイト設定 ────────────────────────────────────────────────
if (!defined('SITE_NAME')) define('SITE_NAME', 'Hayato Kano');
if (!defined('SITE_URL')) define('SITE_URL', defined('SITE_URL_OVERRIDE') ? SITE_URL_OVERRIDE : 'https://hayatokano.com');
