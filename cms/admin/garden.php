<?php
// Garden 一覧 — ページネーション・タイトル検索付きで全エントリをテーブル表示する

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db = get_db();

// 検索パラメータ
$search    = trim($_GET['q'] ?? '');
$page_num  = max(1, (int)($_GET['p'] ?? 1));
$per_page  = 50;
$offset    = ($page_num - 1) * $per_page;

// クエリ構築
if ($search !== '') {
    $stmt = $db->prepare("SELECT COUNT(*) FROM garden WHERE title LIKE ?");
    $stmt->execute(['%' . $search . '%']);
    $total = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT id, slug, date, title, type, tags, updated_at FROM garden WHERE title LIKE ? ORDER BY date DESC LIMIT ? OFFSET ?");
    $stmt->execute(['%' . $search . '%', $per_page, $offset]);
} else {
    $total = db_count('garden');
    $stmt  = $db->prepare("SELECT id, slug, date, title, type, tags, updated_at FROM garden ORDER BY date DESC LIMIT ? OFFSET ?");
    $stmt->execute([$per_page, $offset]);
}

$rows       = $stmt->fetchAll();
$total_pages = (int)ceil($total / $per_page);

$page_title = 'Garden 一覧';
$active_nav = 'garden';
ob_start();
?>

<div class="page-actions">
  <!-- 検索フォーム -->
  <form method="get" action="" class="search-form">
    <input type="text" name="q" class="form-control search-input"
           value="<?= htmlspecialchars($search, ENT_QUOTES) ?>"
           placeholder="タイトルで検索...">
    <button type="submit" class="btn btn-ghost">検索</button>
    <?php if ($search): ?>
    <a href="<?= cms_url('/admin/garden.php') ?>" class="btn btn-ghost">クリア</a>
    <?php endif; ?>
  </form>
  <a href="<?= cms_url('/admin/garden-edit.php?action=new') ?>" class="btn btn-primary">+ 新規追加</a>
</div>

<?php if ($search): ?>
<p class="search-result-info">「<?= htmlspecialchars($search, ENT_QUOTES) ?>」の検索結果: <?= $total ?> 件</p>
<?php endif; ?>

<?php if (empty($rows)): ?>
<p class="empty-state">エントリが見つかりません。</p>
<?php else: ?>
<div class="table-wrap">
  <table class="data-table data-table--clickable">
    <thead>
      <tr>
        <th>日付</th>
        <th>タイトル</th>
        <th>タイプ</th>
        <th>タグ</th>
        <th>更新日時</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $row): ?>
      <?php
        $edit_url = cms_url('/admin/garden-edit.php?slug=' . urlencode($row['slug']));
        $tags     = json_decode($row['tags'] ?? '[]', true) ?? [];
      ?>
      <tr data-href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>" class="clickable-row">
        <td><?= htmlspecialchars($row['date'], ENT_QUOTES) ?></td>
        <td>
          <?= htmlspecialchars($row['title'] ?: '（無題）', ENT_QUOTES) ?>
          <br><small class="text-muted"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
        </td>
        <td>
          <span class="badge badge--<?= $row['type'] === 'photo' ? 'accent' : 'default' ?>">
            <?= htmlspecialchars($row['type'], ENT_QUOTES) ?>
          </span>
        </td>
        <td>
          <?php foreach ($tags as $tag): ?>
          <span class="badge badge--sm"><?= htmlspecialchars($tag, ENT_QUOTES) ?></span>
          <?php endforeach; ?>
        </td>
        <td class="rel-time" data-datetime="<?= htmlspecialchars($row['updated_at'], ENT_QUOTES) ?>">
          <?= htmlspecialchars($row['updated_at'], ENT_QUOTES) ?>
        </td>
        <td>
          <a href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>" class="btn btn-sm btn-ghost" onclick="event.stopPropagation()">編集</a>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<!-- ページネーション -->
<?php if ($total_pages > 1): ?>
<nav class="pagination" aria-label="ページネーション">
  <?php if ($page_num > 1): ?>
  <a href="?p=<?= $page_num - 1 ?><?= $search ? '&q=' . urlencode($search) : '' ?>" class="pagination__btn">&lsaquo; 前へ</a>
  <?php endif; ?>

  <span class="pagination__info"><?= $page_num ?> / <?= $total_pages ?> ページ（全 <?= $total ?> 件）</span>

  <?php if ($page_num < $total_pages): ?>
  <a href="?p=<?= $page_num + 1 ?><?= $search ? '&q=' . urlencode($search) : '' ?>" class="pagination__btn">次へ &rsaquo;</a>
  <?php endif; ?>
</nav>
<?php endif; ?>

<?php endif; ?>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
