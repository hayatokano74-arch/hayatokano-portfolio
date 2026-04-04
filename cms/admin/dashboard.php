<?php
// ダッシュボード — 各コンテンツ件数・デプロイボタン・最近更新された記事を表示する

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

// 各テーブルの件数を取得
$counts = [
    'works'       => db_count('works'),
    'me_no_hoshi' => db_count('me_no_hoshi'),
    'news'        => db_count('news'),
    'garden'      => db_count('garden'),
    'texts'       => db_count('texts'),
];

// 最近更新された記事（各テーブルから updated_at 降順5件）
$recent = [];

$recent_queries = [
    ['table' => 'works',       'label' => 'Works',    'url' => cms_url('/admin/works-edit.php?slug=%s'),       'title_col' => 'title'],
    ['table' => 'me_no_hoshi', 'label' => '目の星',   'url' => cms_url('/admin/me-no-hoshi-edit.php?slug=%s'), 'title_col' => 'title'],
    ['table' => 'news',        'label' => 'News',     'url' => cms_url('/admin/news-edit.php?slug=%s'),        'title_col' => 'title'],
    ['table' => 'garden',      'label' => 'Garden',   'url' => cms_url('/admin/garden-edit.php?slug=%s'),      'title_col' => 'title'],
    ['table' => 'texts',       'label' => 'Text',     'url' => cms_url('/admin/text-edit.php?slug=%s'),        'title_col' => 'title'],
];

$db = get_db();
foreach ($recent_queries as $q) {
    $title_col = $q['title_col'] ?? 'title';
    $stmt = $db->prepare("SELECT slug, {$title_col} AS title, updated_at, '{$q['label']}' AS section FROM {$q['table']} ORDER BY updated_at DESC LIMIT 5");
    $stmt->execute();
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['edit_url'] = sprintf($q['url'], urlencode($row['slug']));
    }
    unset($row);
    $recent = array_merge($recent, $rows);
}

// updated_at 降順でソートして先頭10件
usort($recent, fn($a, $b) => strcmp($b['updated_at'], $a['updated_at']));
$recent = array_slice($recent, 0, 10);

// カード定義
$cards = [
    ['label' => 'Works',    'count' => $counts['works'],       'key' => 'works',       'url' => cms_url('/admin/works.php'),       'color' => 'blue'],
    ['label' => '目の星',   'count' => $counts['me_no_hoshi'], 'key' => 'me-no-hoshi', 'url' => cms_url('/admin/me-no-hoshi.php'), 'color' => 'purple'],
    ['label' => 'News',     'count' => $counts['news'],        'key' => 'news',         'url' => cms_url('/admin/news.php'),        'color' => 'green'],
    ['label' => 'Garden',   'count' => $counts['garden'],      'key' => 'garden',       'url' => cms_url('/admin/garden.php'),      'color' => 'teal'],
    ['label' => 'Text',     'count' => $counts['texts'],       'key' => 'text',         'url' => cms_url('/admin/text.php'),        'color' => 'pink'],
];

$page_title = 'ダッシュボード';
$active_nav = 'dashboard';
ob_start();
?>

<!-- コンテンツ件数カード -->
<section class="dashboard-section">
  <h2 class="section-heading">コンテンツ概要</h2>
  <div class="stat-grid">
    <?php foreach ($cards as $card): ?>
    <a href="<?= htmlspecialchars($card['url'], ENT_QUOTES) ?>" class="stat-card stat-card--<?= htmlspecialchars($card['color'], ENT_QUOTES) ?>">
      <div class="stat-card__count"><?= (int)$card['count'] ?></div>
      <div class="stat-card__label"><?= htmlspecialchars($card['label'], ENT_QUOTES) ?></div>
    </a>
    <?php endforeach; ?>
  </div>
</section>

<!-- デプロイセクション -->
<section class="dashboard-section dashboard-section--deploy">
  <h2 class="section-heading">デプロイ</h2>
  <div class="deploy-panel">
    <div class="deploy-panel__info">
      <p class="deploy-panel__desc">本番サイト（hayatokano.com）に変更を反映します。<br>GitHub Actions ワークフローをトリガーします。</p>
      <div class="deploy-status deploy-status--idle" id="deploy-status-main">
        <div class="deploy-status__dot" aria-hidden="true"></div>
        <span class="deploy-status__text">スタンバイ</span>
      </div>
    </div>
    <button class="btn btn-deploy btn-deploy--large" id="deploy-btn-main" type="button">
      本番にデプロイ
    </button>
  </div>
</section>

<!-- 最近更新された記事 -->
<section class="dashboard-section">
  <h2 class="section-heading">最近の更新</h2>
  <?php if (empty($recent)): ?>
  <p class="empty-state">まだコンテンツがありません。</p>
  <?php else: ?>
  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th>セクション</th>
          <th>タイトル / スラッグ</th>
          <th>更新日時</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($recent as $item): ?>
        <tr>
          <td><span class="badge"><?= htmlspecialchars($item['section'], ENT_QUOTES) ?></span></td>
          <td>
            <?php if (!empty($item['title'])): ?>
              <?= htmlspecialchars($item['title'], ENT_QUOTES) ?>
              <br><small class="text-muted"><?= htmlspecialchars($item['slug'], ENT_QUOTES) ?></small>
            <?php else: ?>
              <span class="text-muted"><?= htmlspecialchars($item['slug'], ENT_QUOTES) ?></span>
            <?php endif; ?>
          </td>
          <td class="rel-time" data-datetime="<?= htmlspecialchars($item['updated_at'], ENT_QUOTES) ?>">
            <?= htmlspecialchars($item['updated_at'], ENT_QUOTES) ?>
          </td>
          <td>
            <a href="<?= htmlspecialchars($item['edit_url'], ENT_QUOTES) ?>" class="btn btn-sm btn-ghost">編集</a>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php endif; ?>
</section>

<script>
// ダッシュボード専用のデプロイボタン初期化
document.addEventListener('DOMContentLoaded', () => {
  const btn    = document.getElementById('deploy-btn-main');
  const status = document.getElementById('deploy-status-main');
  if (btn) {
    btn.addEventListener('click', () => trigger_deploy(btn, '../api/deploy.php', status));
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
