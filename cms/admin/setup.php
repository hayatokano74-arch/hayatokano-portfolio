<?php
/**
 * CMS 初期パスワード設定ページ
 *
 * パスワードがまだ設定されていない場合に使用する。
 * パスワード設定後は index.php にリダイレクトする。
 *
 * セキュリティ注意:
 * - パスワードが設定済みの場合はこのページにアクセス不可
 * - 認証済みユーザーはダッシュボードにリダイレクト
 */

define('CMS_ROOT', dirname(__DIR__));
require_once CMS_ROOT . '/config.php';
require_once CMS_ROOT . '/lib/auth.php';

session_start_safe();

// 認証済みならダッシュボードへ
if (is_authenticated()) {
    header('Location: ' . cms_url('/admin/dashboard.php'));
    exit;
}

// パスワードが既に設定済みならログインページへ
if (get_password_hash()) {
    header('Location: ' . cms_url('/'));
    exit;
}

// ────────────────────────────────────────────
// バリデーション定数
// ────────────────────────────────────────────
const PASSWORD_MIN_LENGTH = 12;

$errors  = [];
$success = '';

// POST 処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password']         ?? '';
    $confirm  = $_POST['password_confirm'] ?? '';

    // 入力チェック
    if ($password === '') {
        $errors[] = 'パスワードを入力してください。';
    } elseif (mb_strlen($password) < PASSWORD_MIN_LENGTH) {
        $errors[] = sprintf('パスワードは %d 文字以上で設定してください。', PASSWORD_MIN_LENGTH);
    } elseif ($password !== $confirm) {
        $errors[] = 'パスワードが一致しません。';
    }

    // 強度チェック（大文字・小文字・数字のいずれかを含む）
    if (empty($errors)) {
        $has_lower  = preg_match('/[a-z]/', $password);
        $has_upper  = preg_match('/[A-Z]/', $password);
        $has_digit  = preg_match('/[0-9]/', $password);
        $has_symbol = preg_match('/[^a-zA-Z0-9]/', $password);
        $strength   = (int)$has_lower + (int)$has_upper + (int)$has_digit + (int)$has_symbol;

        if ($strength < 2) {
            $errors[] = 'パスワードには大文字・小文字・数字・記号のうち2種類以上を含めてください。';
        }
    }

    if (empty($errors)) {
        try {
            set_password($password);
            $success = 'パスワードを設定しました。ログインページに移動します。';
            // 3秒後にリダイレクト（JS なしでも動作するように meta refresh も併用）
        } catch (\Exception $e) {
            $errors[] = 'パスワードの保存に失敗しました。ディレクトリの書き込み権限を確認してください。';
        }
    }
}

$assets_url = cms_url('/assets');
?><!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <?php if ($success): ?>
    <meta http-equiv="refresh" content="3;url=<?= htmlspecialchars(cms_url('/'), ENT_QUOTES) ?>">
  <?php endif; ?>
  <title>初期設定 — Hayato Kano CMS</title>
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
      <p class="login-logo__subtitle">初期パスワード設定</p>
    </div>

    <?php if ($success): ?>

      <!-- 設定完了メッセージ -->
      <div style="text-align:center;">
        <div style="width:56px;height:56px;background:var(--success-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--success);margin:0 auto var(--s-4);">✓</div>
        <p style="font-size:var(--font-md);font-weight:600;color:var(--text);margin-bottom:var(--s-2);">
          <?= htmlspecialchars($success, ENT_QUOTES) ?>
        </p>
        <p style="font-size:var(--font-sm);color:var(--text-2);">3秒後にログインページへ移動します。</p>
        <div style="margin-top:var(--s-6);">
          <a href="<?= htmlspecialchars(cms_url('/'), ENT_QUOTES) ?>" class="btn btn-primary">
            ログインページへ
          </a>
        </div>
      </div>

    <?php else: ?>

      <!-- 説明テキスト -->
      <p style="font-size:var(--font-sm);color:var(--text-2);margin-bottom:var(--s-6);text-align:center;line-height:1.6;">
        初めてのアクセスです。<br>
        管理画面にログインするためのパスワードを設定してください。
      </p>

      <!-- 要件 -->
      <div style="background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--radius);padding:var(--s-3) var(--s-4);margin-bottom:var(--s-5);">
        <p style="font-size:var(--font-xs);font-weight:600;color:var(--text-3);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:var(--s-2);">パスワード要件</p>
        <ul style="font-size:var(--font-xs);color:var(--text-2);display:flex;flex-direction:column;gap:4px;">
          <li>・ <?= PASSWORD_MIN_LENGTH ?> 文字以上</li>
          <li>・ 大文字・小文字・数字・記号のうち 2 種類以上を含む</li>
        </ul>
      </div>

      <!-- エラーメッセージ -->
      <?php if (!empty($errors)): ?>
        <div class="login-error" role="alert" style="margin-bottom:var(--s-4);">
          <?php foreach ($errors as $err): ?>
            <p><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <!-- セットアップフォーム -->
      <form class="login-form" method="POST" action="" novalidate id="setup-form">

        <div class="form-group">
          <label class="form-label form-label--required" for="password">
            パスワード
          </label>
          <input
            class="form-input<?= !empty($errors) ? ' is-error' : '' ?>"
            type="password"
            id="password"
            name="password"
            autocomplete="new-password"
            autofocus
            required
            minlength="<?= PASSWORD_MIN_LENGTH ?>"
            placeholder="12文字以上"
          >
        </div>

        <div class="form-group">
          <label class="form-label form-label--required" for="password_confirm">
            パスワード（確認）
          </label>
          <input
            class="form-input<?= !empty($errors) ? ' is-error' : '' ?>"
            type="password"
            id="password_confirm"
            name="password_confirm"
            autocomplete="new-password"
            required
            minlength="<?= PASSWORD_MIN_LENGTH ?>"
            placeholder="もう一度入力"
          >
          <p class="form-hint" id="confirm-hint" style="display:none;"></p>
        </div>

        <button type="submit" class="btn btn-primary btn-lg">
          パスワードを設定する
        </button>

      </form>

    <?php endif; ?>

  </div><!-- /.login-card -->
</main><!-- /.login-page -->

<script src="<?= htmlspecialchars($assets_url, ENT_QUOTES) ?>/admin.js"></script>
<script>
  // クライアントサイドバリデーション（即時フィードバック）
  (function () {
    const form    = document.getElementById('setup-form');
    const pwField = document.getElementById('password');
    const cfField = document.getElementById('password_confirm');
    const hint    = document.getElementById('confirm-hint');

    if (!form) return;

    // パスワード確認のリアルタイムチェック
    function checkMatch() {
      if (!cfField.value) {
        hint.style.display = 'none';
        cfField.classList.remove('is-error');
        return;
      }
      if (pwField.value === cfField.value) {
        hint.style.display = 'block';
        hint.style.color   = 'var(--success)';
        hint.textContent   = 'パスワードが一致しています';
        cfField.classList.remove('is-error');
      } else {
        hint.style.display = 'block';
        hint.style.color   = 'var(--danger)';
        hint.textContent   = 'パスワードが一致しません';
        cfField.classList.add('is-error');
      }
    }

    pwField.addEventListener('input', checkMatch);
    cfField.addEventListener('input', checkMatch);

    // フォーム送信前チェック
    form.addEventListener('submit', (e) => {
      if (pwField.value.length < <?= PASSWORD_MIN_LENGTH ?>) {
        e.preventDefault();
        pwField.focus();
        pwField.classList.add('is-error');
        show_toast('パスワードは <?= PASSWORD_MIN_LENGTH ?> 文字以上で設定してください。', 'error');
        return;
      }
      if (pwField.value !== cfField.value) {
        e.preventDefault();
        cfField.focus();
        cfField.classList.add('is-error');
        show_toast('パスワードが一致しません。', 'error');
      }
    });
  })();
</script>
</body>
</html>
