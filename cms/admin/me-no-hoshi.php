<?php
// 目の星 一覧 — 全エントリをテーブル表示し、編集・新規追加へのリンクを提供する

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db   = get_db();
$rows = $db->query("SELECT id, slug, title, date, tags, updated_at FROM me_no_hoshi ORDER BY date DESC")->fetchAll();

$page_title = '目の星 一覧';
$active_nav = 'me-no-hoshi';
ob_start();
?>

<div class="page-actions">
  <a href="<?= cms_url('/admin/me-no-hoshi-edit.php?action=new') ?>" class="btn btn-primary">+ 新規追加</a>
</div>

<?php if (empty($rows)): ?>
<p class="empty-state">まだ目の星のエントリがありません。</p>
<?php else: ?>
<div class="table-wrap">
  <table class="data-table data-table--clickable">
    <thead>
      <tr>
        <th>タイトル</th>
        <th>日付</th>
        <th>タグ</th>
        <th>更新日時</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $row): ?>
      <?php
        $edit_url = cms_url('/admin/me-no-hoshi-edit.php?slug=' . urlencode($row['slug']));
        $tags     = json_decode($row['tags'] ?? '[]', true) ?? [];
      ?>
      <tr data-href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>" class="clickable-row">
        <td>
          <?= htmlspecialchars($row['title'] ?: '（無題）', ENT_QUOTES) ?>
          <br><small class="text-muted"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
        </td>
        <td><?= htmlspecialchars($row['date'], ENT_QUOTES) ?></td>
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
<?php endif; ?>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
