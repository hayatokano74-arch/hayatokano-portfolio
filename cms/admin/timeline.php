<?php
// Timeline 一覧 — 全タイムラインエントリをテーブル表示し、編集・新規追加へのリンクを提供する

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db   = get_db();
$rows = $db->query("SELECT id, slug, date, time_val, type, body, updated_at FROM timeline ORDER BY date DESC, time_val DESC")->fetchAll();

$page_title = 'Timeline 一覧';
$active_nav = 'timeline';
ob_start();
?>

<div class="page-actions">
  <a href="<?= cms_url('/admin/timeline-edit.php?action=new') ?>" class="btn btn-primary">+ 新規追加</a>
</div>

<?php if (empty($rows)): ?>
<p class="empty-state">まだ Timeline エントリがありません。</p>
<?php else: ?>
<div class="table-wrap">
  <table class="data-table data-table--clickable">
    <thead>
      <tr>
        <th>日付</th>
        <th>時刻</th>
        <th>タイプ</th>
        <th>本文（先頭 50字）</th>
        <th>更新日時</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $row): ?>
      <?php $edit_url = cms_url('/admin/timeline-edit.php?slug=' . urlencode($row['slug'])); ?>
      <tr data-href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>" class="clickable-row">
        <td><?= htmlspecialchars($row['date'], ENT_QUOTES) ?></td>
        <td><?= htmlspecialchars($row['time_val'], ENT_QUOTES) ?></td>
        <td>
          <span class="badge badge--<?= $row['type'] === 'photo' ? 'accent' : 'default' ?>">
            <?= htmlspecialchars($row['type'], ENT_QUOTES) ?>
          </span>
        </td>
        <td>
          <span class="text-ellipsis">
            <?= htmlspecialchars(mb_strimwidth($row['body'] ?? '', 0, 50, '…'), ENT_QUOTES) ?>
          </span>
          <br><small class="text-muted"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
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
