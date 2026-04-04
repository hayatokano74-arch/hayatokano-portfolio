<?php
/**
 * CMS 管理画面 — 共通レイアウト
 *
 * 使い方:
 *   $page_title = 'Works 一覧';
 *   $active_nav  = 'works';
 *   ob_start();
 *   // … ページ固有のコンテンツを出力 …
 *   $content = ob_get_clean();
 *   require __DIR__ . '/layout.php';
 */

// 直接アクセス禁止
if (!defined('CMS_ROOT') && !isset($page_title)) {
    http_response_code(403);
    exit('Forbidden');
}

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/auth.php';

// 認証チェック（include 元で require_auth() 済みでも念のため）
require_auth();

// 変数のデフォルト値
$page_title ??= 'ダッシュボード';
$active_nav  ??= 'dashboard';
$content     ??= '';

// ナビメニュー定義
// [スラッグ, ラベル, URL, 頭文字]
$nav_items = [
    ['dashboard',   'ダッシュボード',  cms_url('/'),                      'D'],
    ['works',       'Works',           cms_url('/admin/works.php'),       'W'],
    ['me-no-hoshi', '目の星',           cms_url('/admin/me-no-hoshi.php'), 'M'],
    ['news',        'News',            cms_url('/admin/news.php'),        'N'],
    ['garden',      'Garden',          cms_url('/admin/garden.php'),      'G'],
    ['text',        'Text',            cms_url('/admin/text.php'),        'Tx'],
    ['about',       'About',           cms_url('/admin/about.php'),       'A'],
    ['media',       'メディア',         cms_url('/admin/media.php'),       'F'],
];

// CSRF トークン
$csrf = csrf_token();

// アセットのベース URL
$assets_url = cms_url('/assets');

// キャッシュバスター（ファイルのタイムスタンプ）
$css_ver = @filemtime(CMS_ROOT . '/assets/admin.css') ?: '1';
$js_ver  = @filemtime(CMS_ROOT . '/assets/admin.js')  ?: '1';

?><!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <!-- CSRF トークン（JavaScript から参照） -->
  <meta name="csrf-token" content="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
  <title><?= htmlspecialchars($page_title, ENT_QUOTES) ?> — Hayato Kano CMS</title>
  <link rel="stylesheet" href="<?= htmlspecialchars($assets_url, ENT_QUOTES) ?>/admin.css?v=<?= $css_ver ?>">
  <!-- Quill リッチエディタ -->
  <link href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" rel="stylesheet">
  <!-- ファビコン（テキスト SVG） -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%235b8ef0'/><text x='16' y='22' text-anchor='middle' font-family='system-ui' font-size='18' font-weight='700' fill='white'>H</text></svg>">
</head>
<body>

<div class="cms-layout">

  <!-- ═══════════════════════════════════════
       サイドバー
  ════════════════════════════════════════════ -->
  <aside class="sidebar" id="sidebar" role="navigation" aria-label="メインナビゲーション">

    <!-- ロゴ -->
    <a href="<?= cms_url('/') ?>" class="sidebar__logo" aria-label="ダッシュボードへ">
      <div class="sidebar__logo-mark" aria-hidden="true">H</div>
      <span class="sidebar__logo-text">Hayato Kano CMS</span>
    </a>

    <!-- ナビゲーション -->
    <nav class="sidebar__nav">
      <ul role="list">
        <?php foreach ($nav_items as [$slug, $label, $url, $icon]): ?>
          <?php $is_active = ($active_nav === $slug); ?>
          <li>
            <a href="<?= htmlspecialchars($url, ENT_QUOTES) ?>"
               class="sidebar__nav-item<?= $is_active ? ' is-active' : '' ?>"
               <?= $is_active ? 'aria-current="page"' : '' ?>>
              <span class="sidebar__nav-icon" aria-hidden="true"><?= htmlspecialchars($icon, ENT_QUOTES) ?></span>
              <span><?= htmlspecialchars($label, ENT_QUOTES) ?></span>
            </a>
          </li>
        <?php endforeach; ?>
      </ul>
    </nav>

    <!-- フッター（ログアウト） -->
    <div class="sidebar__footer">
      <a href="<?= cms_url('/admin/logout.php') ?>"
         class="sidebar__logout"
         onclick="return confirm('ログアウトしますか？')">
        <span aria-hidden="true">→</span>
        <span>ログアウト</span>
      </a>
    </div>

  </aside><!-- /.sidebar -->

  <!-- モバイルオーバーレイ -->
  <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>

  <!-- ═══════════════════════════════════════
       メインエリア
  ════════════════════════════════════════════ -->
  <div class="main-wrap">

    <!-- トップバー -->
    <header class="topbar" role="banner">
      <div class="topbar__left">
        <!-- モバイルメニュートグル -->
        <button class="topbar__menu-toggle"
                id="sidebar-toggle"
                type="button"
                aria-label="メニューを開く"
                aria-controls="sidebar"
                aria-expanded="false">
          ☰
        </button>
        <!-- ページタイトル -->
        <h1 class="topbar__title"><?= htmlspecialchars($page_title, ENT_QUOTES) ?></h1>
      </div>

      <div class="topbar__right">
        <!-- デプロイステータス -->
        <div class="deploy-status deploy-status--idle" id="deploy-status">
          <div class="deploy-status__dot" aria-hidden="true"></div>
          <span class="deploy-status__text">スタンバイ</span>
        </div>
        <!-- デプロイボタン -->
        <button class="btn btn-deploy" id="deploy-btn" type="button">
          デプロイ
        </button>
      </div>
    </header><!-- /.topbar -->

    <!-- メインコンテンツ -->
    <main class="main-content" id="main-content" role="main">
      <?= $content ?>
    </main>

    <!-- フッター -->
    <footer style="padding:var(--s-4) var(--s-6);border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:var(--font-xs);color:var(--text-3);">
        Hayato Kano CMS &copy; <?= date('Y') ?>
      </span>
      <span style="font-size:var(--font-xs);color:var(--text-3);">
        <a href="https://hayatokano.com" target="_blank" rel="noopener" style="color:var(--text-3);">
          hayatokano.com
        </a>
      </span>
    </footer>

  </div><!-- /.main-wrap -->

</div><!-- /.cms-layout -->

<!-- トースト用コンテナ -->
<div id="toast-container" class="toast-container" aria-live="polite" aria-atomic="true"></div>

<script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
<script src="<?= htmlspecialchars($assets_url, ENT_QUOTES) ?>/admin.js?v=<?= $js_ver ?>"></script>
</body>
</html>
