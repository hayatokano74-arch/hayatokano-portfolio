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

/* CSRFトークン生成（セッションに1つ保持） */
$_SESSION['csrf_token'] = $_SESSION['csrf_token'] ?? bin2hex(random_bytes(32));

/* ============================================
 * PIN認証レート制限
 * ============================================ */
define('RATE_LIMIT_FILE', __DIR__ . '/.rate-limit.json');
define('RATE_LIMIT_MAX', 5);       /* 最大試行回数 */
define('RATE_LIMIT_WINDOW', 300);  /* 計測期間（秒）= 5分 */
define('RATE_LIMIT_LOCKOUT', 900); /* ロックアウト時間（秒）= 15分 */

function rate_limit_check(string $ip): bool {
    $data = [];
    if (file_exists(RATE_LIMIT_FILE)) {
        $data = json_decode(file_get_contents(RATE_LIMIT_FILE), true) ?: [];
    }
    $now = time();
    /* 古いエントリを掃除 */
    foreach ($data as $k => $entry) {
        if ($now - ($entry['last'] ?? 0) > RATE_LIMIT_LOCKOUT + RATE_LIMIT_WINDOW) {
            unset($data[$k]);
        }
    }
    if (!isset($data[$ip])) return true; /* 初回 */
    $entry = $data[$ip];
    /* ロックアウト中か */
    if (($entry['locked_until'] ?? 0) > $now) return false;
    return true;
}

function rate_limit_record(string $ip): void {
    $data = [];
    if (file_exists(RATE_LIMIT_FILE)) {
        $data = json_decode(file_get_contents(RATE_LIMIT_FILE), true) ?: [];
    }
    $now = time();
    if (!isset($data[$ip])) {
        $data[$ip] = ['attempts' => [], 'locked_until' => 0, 'last' => $now];
    }
    /* 計測期間外の試行を除去 */
    $data[$ip]['attempts'] = array_values(array_filter(
        $data[$ip]['attempts'],
        fn($t) => ($now - $t) < RATE_LIMIT_WINDOW
    ));
    $data[$ip]['attempts'][] = $now;
    $data[$ip]['last'] = $now;
    /* 上限超過でロックアウト */
    if (count($data[$ip]['attempts']) >= RATE_LIMIT_MAX) {
        $data[$ip]['locked_until'] = $now + RATE_LIMIT_LOCKOUT;
        $data[$ip]['attempts'] = [];
    }
    file_put_contents(RATE_LIMIT_FILE, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
    @chmod(RATE_LIMIT_FILE, 0600);
}

function rate_limit_clear(string $ip): void {
    if (!file_exists(RATE_LIMIT_FILE)) return;
    $data = json_decode(file_get_contents(RATE_LIMIT_FILE), true) ?: [];
    unset($data[$ip]);
    file_put_contents(RATE_LIMIT_FILE, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
}

/* PIN送信処理 */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pin'])) {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    if (!rate_limit_check($clientIp)) {
        $error = 'しばらく待ってから再試行してください';
    } elseif ($_POST['pin'] === GARDEN_PIN) {
        $_SESSION['garden_auth'] = true;
        $_SESSION['garden_auth_time'] = time();
        rate_limit_clear($clientIp);

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

        header('Location: ./');
        exit;
    } else {
        rate_limit_record($clientIp);
        $error = 'PINが正しくありません';
    }
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
  <link rel="stylesheet" href="assets/style.css?v=18">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#1a1a1a">
  <?php if ($authenticated): ?>
  <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
  <?php endif; ?>
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
  <aside id="sidebar" class="sidebar" role="navigation" aria-label="フォルダと投稿">
    <div class="sidebar-header">
      <span class="sidebar-title">Garden</span>
      <button id="btn-new" class="sidebar-btn" title="新規" aria-label="新規投稿">+</button>
    </div>
    <div class="sidebar-search" id="sidebar-search">
      <input type="text" id="search-input" class="search-input" placeholder="検索..." aria-label="投稿を検索">
      <button id="search-clear" class="search-clear" type="button" aria-label="検索をクリア" style="display:none;">×</button>
    </div>
    <div id="folder-tree" class="folder-tree"></div>
    <div id="post-list" class="post-list" role="listbox" aria-label="投稿一覧"></div>
    <div class="sidebar-footer">
      <button id="btn-settings" class="sidebar-btn-sm" title="設定" aria-label="設定">⚙</button>
      <button id="btn-theme" class="sidebar-btn-sm" title="テーマ切替" aria-label="テーマ切替">◐</button>
      <button id="btn-logout" class="sidebar-btn-sm" title="ログアウト" aria-label="ログアウト">←</button>
    </div>
  </aside>

  <!-- メインエディタ -->
  <main id="editor-area" class="editor-area" role="main" aria-label="エディタ">

    <!-- ヘッダー -->
    <div class="editor-header">
      <!-- モバイル用: 戻るボタン（サイドバーを開く） -->
      <button id="btn-mobile-back" class="mobile-back-btn" title="一覧に戻る" aria-label="一覧に戻る">‹ 一覧</button>
      <!-- デスクトップ用: サイドバートグル -->
      <button id="btn-sidebar-toggle" class="editor-btn sidebar-toggle" aria-label="サイドバー開閉">☰</button>
      <div class="editor-meta">
        <span id="post-date" class="meta-date"></span>
        <span id="post-status" class="meta-status">下書き</span>
      </div>
      <div class="editor-actions">
        <button id="btn-publish" class="btn-publish" type="button">公開</button>
      </div>
    </div>

    <!-- エディタ / プレビュー切替 -->
    <div class="editor-tabs">
      <button class="tab active" data-tab="write">編集</button>
      <button class="tab" data-tab="preview">プレビュー</button>
    </div>

    <!-- テキストエリア（タイプライターモード） -->
    <div id="editor-scroll" class="editor-scroll">
      <div id="editor-content" class="editor-content">
        <input id="post-title" type="text" placeholder="タイトル" class="editor-title-input">
        <textarea
          id="editor"
          class="editor-textarea"
          placeholder="書き始める..."
          spellcheck="false"
        ></textarea>
      </div>
    </div>

    <!-- プレビュー -->
    <div id="preview" class="preview-area" style="display:none;"></div>

    <!-- マークダウンツールバー（キーボード上） -->
    <div id="md-toolbar" class="md-toolbar" role="toolbar" aria-label="マークダウンツールバー">
      <button data-insert="#" aria-label="見出し">#</button>
      <button data-insert="**" aria-label="太字">*</button>
      <button data-insert="_" aria-label="斜体">_</button>
      <button data-insert="+" aria-label="番号付きリスト">+</button>
      <button data-insert="- " aria-label="箇条書き">-</button>
      <button data-insert="```" aria-label="コードブロック">``</button>
      <button id="btn-link" data-action="link" aria-label="ウィキリンク">[]</button>
      <button data-insert="> " aria-label="引用">&gt;</button>
      <button data-insert="!" aria-label="画像">!</button>
      <button data-insert="---" aria-label="水平線">—</button>
      <button id="btn-photo" data-action="photo" aria-label="写真アップロード">📷</button>
      <span class="toolbar-spacer"></span>
      <button id="btn-fullscreen" data-action="fullscreen" title="全画面" aria-label="全画面">⤢</button>
    </div>

    <!-- 画像アップロード（非表示） -->
    <input type="file" id="file-input" accept="image/*" multiple style="display:none;">

  </main>
</div>

<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
<script src="assets/app.js?v=18"></script>
<?php endif; ?>
</body>
</html>
