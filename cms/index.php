<?php
/**
 * CMS ログインページ / 初期パスワード設定ページ
 *
 * - パスワード未設定の場合は初期セットアップフォームを表示
 * - ロックアウト中は残り時間を表示
 * - 認証済みの場合は dashboard.php にリダイレクト
 */

define('CMS_ROOT', __DIR__);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/auth.php';

session_start_safe();

// 既にログイン済みならダッシュボードへ
if (is_authenticated()) {
    header('Location: ' . cms_url('/admin/dashboard.php'));
    exit;
}

$errors  = [];
$success = '';
$mode    = 'login'; // 'login' | 'setup'

// パスワードが未設定なら初期設定モード
if (!get_password_hash()) {
    $mode = 'setup';
    header('Location: ' . cms_url('/admin/setup.php'));
    exit;
}

// ロックアウト確認
$locked      = is_locked_out();
$lockout_remaining = 0;
if ($locked) {
    $db    = get_db();
    $ip    = get_client_ip();
    $since = date('Y-m-d H:i:s', time() - LOGIN_LOCKOUT_SECONDS);
    $stmt  = $db->prepare(
        'SELECT MAX(attempted_at) FROM login_attempts WHERE ip = ? AND attempted_at > ?'
    );
    $stmt->execute([$ip, $since]);
    $last_attempt = $stmt->fetchColumn();
    if ($last_attempt) {
        $lockout_remaining = max(0, LOGIN_LOCKOUT_SECONDS - (time() - strtotime($last_attempt)));
    }
}

// POST 処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$locked) {
    $password = $_POST['password'] ?? '';

    if ($password === '') {
        $errors[] = 'パスワードを入力してください。';
    } else {
        if (login($password)) {
            // ログイン成功: リダイレクト先を確認
            $redirect = $_GET['redirect'] ?? '';
            // オープンリダイレクト対策:
            //   - 先頭が "/" かつ次文字が "/" や "\" でないもののみ許可
            //   - 制御文字を含む場合は無効とする
            if ($redirect
                && preg_match('#^/[^/\\\\]#', $redirect)
                && !preg_match('/[\x00-\x1f]/', $redirect)
            ) {
                header('Location: ' . $redirect);
            } else {
                header('Location: ' . cms_url('/admin/dashboard.php'));
            }
            exit;
        } else {
            // 再度ロックアウト確認
            if (is_locked_out()) {
                $locked = true;
                $lockout_remaining = LOGIN_LOCKOUT_SECONDS;
                $errors[] = 'ログイン試行回数が上限を超えました。しばらく待ってから再試行してください。';
            } else {
                $errors[] = 'パスワードが正しくありません。';
            }
        }
    }
}

// ロックアウト残り時間を分秒でフォーマット
function format_lockout_time(int $seconds): string {
    $m = floor($seconds / 60);
    $s = $seconds % 60;
    if ($m > 0) {
        return "{$m}分{$s}秒";
    }
    return "{$s}秒";
}

$assets_url = cms_url('/assets');
?><!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>ログイン — Hayato Kano CMS</title>
  <link rel="stylesheet" href="<?= htmlspecialchars($assets_url, ENT_QUOTES) ?>/admin.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%235b8ef0'/><text x='16' y='22' text-anchor='middle' font-family='system-ui' font-size='18' font-weight='700' fill='white'>H</text></svg>">
</head>
<body>

<main class="login-page">
  <div class="login-card">

    <!-- ロゴ -->
    <div class="login-logo">
      <div style="width:48px;height:48px;background:var(--accent);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;margin:0 auto var(--s-4);">H</div>
      <h1 class="login-logo__title">Hayato Kano CMS</h1>
      <p class="login-logo__subtitle">管理画面</p>
    </div>

    <?php if ($locked): ?>

      <!-- ロックアウト表示 -->
      <div class="login-lockout">
        <strong>ログインがロックされています</strong><br>
        <?php if ($lockout_remaining > 0): ?>
          あと <strong><?= format_lockout_time($lockout_remaining) ?></strong> 後に再試行できます。
        <?php else: ?>
          しばらく待ってから再試行してください。
        <?php endif; ?>
      </div>

      <div style="text-align:center;margin-top:var(--s-6);">
        <a href="<?= cms_url('/') ?>" class="btn btn-secondary">
          再読み込み
        </a>
      </div>

    <?php else: ?>

      <!-- エラーメッセージ -->
      <?php if (!empty($errors)): ?>
        <div class="login-error" role="alert">
          <?php foreach ($errors as $err): ?>
            <p><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <!-- ログインフォーム -->
      <form class="login-form" method="POST" action="<?= htmlspecialchars($_SERVER['REQUEST_URI'], ENT_QUOTES) ?>" novalidate>

        <div class="form-group">
          <label class="form-label" for="password">パスワード</label>
          <input
            class="form-input<?= !empty($errors) ? ' is-error' : '' ?>"
            type="password"
            id="password"
            name="password"
            autocomplete="current-password"
            autofocus
            required
            placeholder="パスワードを入力"
          >
        </div>

        <button type="submit" class="btn btn-primary btn-lg">
          ログイン
        </button>

      </form>

    <?php endif; ?>

  </div><!-- /.login-card -->
</main><!-- /.login-page -->

<script src="<?= htmlspecialchars($assets_url, ENT_QUOTES) ?>/admin.js"></script>
</body>
</html>
