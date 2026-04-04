<?php
/**
 * 初期パスワード設定スクリプト
 *
 * 使用方法:
 *   php scripts/setup-password.php              # 対話形式
 *   php scripts/setup-password.php --password=xxx  # 引数で直接指定
 *
 * 対話形式でパスワードを設定する。bcrypt でハッシュ化して db/password.hash に保存。
 */

// CLIのみ許可
if (php_sapi_name() !== 'cli') {
    die("このスクリプトはコマンドラインから実行してください。\n");
}

// CMS ルートは scripts/ の1つ上
define('CMS_ROOT', dirname(__DIR__));

require_once CMS_ROOT . '/config.php';
require_once CMS_ROOT . '/lib/auth.php';

// --password=xxx 引数の処理
$password_from_arg = null;
foreach ($argv as $arg) {
    if (strpos($arg, '--password=') === 0) {
        $password_from_arg = substr($arg, strlen('--password='));
        break;
    }
}

echo "=== CMS パスワード設定 ===\n\n";

// 既存パスワードの確認（引数指定時はスキップ）
if ($password_from_arg === null) {
    $existing_hash = get_password_hash();
    if ($existing_hash) {
        echo "既存のパスワードが設定されています。\n";
        echo "上書きしますか？ [y/N]: ";
        $confirm = strtolower(trim(fgets(STDIN)));
        if ($confirm !== 'y') {
            echo "キャンセルしました。\n";
            exit(0);
        }
    }
}

if ($password_from_arg !== null) {
    // 引数から直接取得
    $password = $password_from_arg;
    echo "（--password 引数からパスワードを設定します）\n";
} else {
    // 対話形式で入力
    $password = read_password("パスワードを入力してください: ");
    if ($password === '') {
        die("エラー: パスワードが空です。\n");
    }

    // 確認入力
    $confirm_password = read_password("確認入力: ");
    if ($confirm_password === '') {
        die("エラー: 確認パスワードが空です。\n");
    }

    // パスワード一致確認
    if ($password !== $confirm_password) {
        die("エラー: パスワードが一致しません。\n");
    }
}

// 最小長チェック（8文字以上）
if (strlen($password) < 8) {
    die("エラー: パスワードは8文字以上にしてください。\n");
}

// パスワードを設定
try {
    set_password($password);
    echo "パスワードを設定しました。\n";
    echo "保存先: " . CMS_ROOT . "/db/password.hash\n";
} catch (Exception $e) {
    die("エラー: パスワードの保存に失敗しました: " . $e->getMessage() . "\n");
}

/**
 * パスワードを非表示で読み取る
 * stty が使える環境ではエコーを無効化する
 */
function read_password(string $prompt): string {
    echo $prompt;

    // stty が使える場合はエコーを無効化
    $stty_available = false;
    if (function_exists('shell_exec')) {
        $test = @shell_exec('stty -echo 2>/dev/null; echo ok');
        if (trim($test) === 'ok') {
            $stty_available = true;
        }
    }

    if ($stty_available) {
        system('stty -echo');
    }

    $password = trim(fgets(STDIN));

    if ($stty_available) {
        system('stty echo');
    }

    // 非表示入力後の改行を出力
    echo "\n";

    return $password;
}
