<?php
/**
 * Garden Write — Ulysses風マークダウンエディタ
 *
 * PIN認証 → SPA配信
 */
/* セッション設定（FastCGI環境では .htaccess の php_value が使えないためここで設定） */
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/api/auth.php'; /* config.php もここで読み込まれる */

/* 認証チェック */
$authenticated = isset($_SESSION['garden_auth']) && $_SESSION['garden_auth'] === true;

/* デバイストークンによる自動ログイン */
if (!$authenticated && isset($_COOKIE['garden_token'])) {
    if (token_verify($_COOKIE['garden_token'])) {
        $_SESSION['garden_auth'] = true;
        $_SESSION['garden_auth_time'] = time();
        $authenticated = true;
    } else {
        /* 無効なトークンのクッキーを削除 */
        setcookie('garden_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'secure' => true,
            'samesite' => 'Strict',
        ]);
    }
}

/* PIN送信処理 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pin'])) {
    if ($_POST['pin'] === GARDEN_PIN) {
        $_SESSION['garden_auth'] = true;
        $_SESSION['garden_auth_time'] = time();

        /* 「このデバイスを記憶」にチェックがある場合トークン発行 */
        if (!empty($_POST['remember'])) {
            $token = token_create();
            setcookie('garden_token', $token, [
                'expires' => time() + TOKEN_LIFETIME,
                'path' => '/',
                'httponly' => true,
                'secure' => true,
                'samesite' => 'Strict',
            ]);
        }

        header('Location: /');
        exit;
    }
    $error = 'PINが正しくありません';
}

/* セッション有効期限（24時間） */
if ($authenticated && isset($_SESSION['garden_auth_time'])) {
    if (time() - $_SESSION['garden_auth_time'] > SESSION_LIFETIME) {
        session_destroy();
        $authenticated = false;
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Garden</title>
  <link rel="stylesheet" href="/assets/style.css">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#1a1a1a">
  <link rel="manifest" href="data:application/json,{}">
</head>
<body data-theme="dark">

<?php if (!$authenticated): ?>
<!-- ログイン画面 -->
<div class="login-screen">
  <div class="login-box">
    <h1 class="login-title">Garden</h1>
    <?php if (isset($error)): ?>
      <p class="login-error"><?= htmlspecialchars($error) ?></p>
    <?php endif; ?>
    <form method="POST" class="login-form">
      <input
        type="password"
        name="pin"
        placeholder="PIN"
        class="login-input"
        autofocus
        inputmode="numeric"
        pattern="[0-9]*"
      >
      <label class="login-remember">
        <input type="checkbox" name="remember" value="1" checked>
        <span>このデバイスを記憶する（30日間）</span>
      </label>
      <button type="submit" class="login-btn">Enter</button>
    </form>
  </div>
</div>

<?php else: ?>
<!-- エディタ本体 -->
<div id="app">

  <!-- サイドバー -->
  <aside id="sidebar" class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Garden</span>
      <button id="btn-new" class="sidebar-btn" title="新規">+</button>
    </div>
    <div id="folder-tree" class="folder-tree"></div>
    <div id="post-list" class="post-list"></div>
    <div class="sidebar-footer">
      <button id="btn-theme" class="sidebar-btn-sm" title="テーマ切替">◐</button>
      <button id="btn-logout" class="sidebar-btn-sm" title="ログアウト">←</button>
    </div>
  </aside>

  <!-- メインエディタ -->
  <main id="editor-area" class="editor-area">

    <!-- ヘッダー -->
    <div class="editor-header">
      <!-- モバイル用: 戻るボタン（サイドバーを開く） -->
      <button id="btn-mobile-back" class="mobile-back-btn" title="一覧に戻る">
        <span class="back-chevron">‹</span>
        <span class="back-label">一覧</span>
      </button>
      <!-- デスクトップ用: サイドバートグル -->
      <button id="btn-sidebar-toggle" class="editor-btn sidebar-toggle">☰</button>
      <div class="editor-meta">
        <input id="post-title" type="text" placeholder="タイトル" class="title-input">
        <span id="post-date" class="meta-date"></span>
        <span id="post-status" class="meta-status">下書き</span>
      </div>
      <div class="editor-actions">
        <button id="btn-preview-toggle" class="btn-preview-toggle" title="プレビュー切替">プレビュー</button>
        <button id="btn-publish" class="btn-publish">公開</button>
      </div>
    </div>

    <!-- エディタ / プレビュー切替（デスクトップ用） -->
    <div class="editor-tabs">
      <button class="tab active" data-tab="write">Markdown</button>
      <button class="tab" data-tab="preview">プレビュー</button>
    </div>

    <!-- テキストエリア（タイプライターモード） -->
    <div id="editor-scroll" class="editor-scroll">
      <textarea
        id="editor"
        class="editor-textarea"
        placeholder="書き始める..."
        spellcheck="false"
      ></textarea>
    </div>

    <!-- プレビュー -->
    <div id="preview" class="preview-area" style="display:none;"></div>

    <!-- マークダウンツールバー（キーボード上） -->
    <div id="md-toolbar" class="md-toolbar">
      <button data-insert="#">#</button>
      <button data-insert="**">*</button>
      <button data-insert="_">_</button>
      <button data-insert="+">+</button>
      <button data-insert="- ">-</button>
      <button data-insert="```">``</button>
      <button id="btn-link" data-action="link">[]</button>
      <button data-insert="> ">&gt;</button>
      <button data-insert="!">!</button>
      <button data-insert="---">—</button>
      <button id="btn-photo" data-action="photo">📷</button>
    </div>

    <!-- 画像アップロード（非表示） -->
    <input type="file" id="file-input" accept="image/*" multiple style="display:none;">

  </main>
</div>

<script src="/assets/app.js"></script>
<?php endif; ?>
</body>
</html>
