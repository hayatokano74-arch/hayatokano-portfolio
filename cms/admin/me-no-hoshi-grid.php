<?php
// 目の星 — グリッド表示設定
// どのフィールドを一覧に表示するか、表示順を設定する

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db = get_db();

// ── POST: 保存 ──
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。';
    } else {
        $keys    = $_POST['field_key']     ?? [];
        $labels  = $_POST['field_label']   ?? [];
        $visible = $_POST['field_visible'] ?? [];

        $fields = [];
        foreach ($keys as $i => $k) {
            $k = trim($k);
            if ($k === '') continue;
            $fields[] = [
                'key'     => $k,
                'label'   => trim($labels[$i] ?? ''),
                'visible' => in_array((string)$i, $visible, true),
            ];
        }

        $value = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $db->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        $stmt->execute(['me_no_hoshi_grid_fields', $value]);

        header('Location: ' . cms_url('/admin/me-no-hoshi-grid.php?saved=1'));
        exit;
    }
}

// ── GET: 読み込み ──
$stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
$stmt->execute(['me_no_hoshi_grid_fields']);
$row = $stmt->fetch();

$fields = [];
if ($row) {
    $fields = json_decode($row['value'], true) ?? [];
}

// フィールドが空なら、全投稿の details からキーを収集してデフォルトを生成
if (empty($fields)) {
    $all_posts = db_all('me_no_hoshi', 'date DESC');
    $seen = [];
    $defaults_visible = ['artist', 'period', 'open_date', 'hours', 'venue'];
    foreach ($all_posts as $p) {
        $data = json_decode($p['data'] ?? '{}', true) ?? [];
        $details = $data['details'] ?? [];
        if (is_array($details)) {
            foreach ($details as $d) {
                $k = $d['key'] ?? '';
                if ($k && !isset($seen[$k])) {
                    $seen[$k] = true;
                    $fields[] = [
                        'key'     => $k,
                        'label'   => $d['label'] ?? strtoupper($k),
                        'visible' => in_array($k, $defaults_visible),
                    ];
                }
            }
        }
    }
}

$page_title = '目の星 — グリッド表示設定';
$active_nav = 'me-no-hoshi';
ob_start();
?>

<?php if (!empty($_GET['saved'])): ?>
<div class="alert alert-success">設定を保存しました。</div>
<?php endif; ?>

<p style="color:var(--text-2);margin-bottom:var(--s-5);">
  一覧ページのグリッド/リスト表示に表示するフィールドと順番を設定します。<br>
  ドラッグで並べ替え、チェックボックスで表示/非表示を切り替えてください。
</p>

<form method="post" action="">
  <input type="hidden" name="_csrf" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">

  <div class="grid-settings-list" id="grid-settings-list">
    <?php foreach ($fields as $i => $f): ?>
    <div class="grid-settings-row" draggable="true">
      <span class="grid-settings-handle" title="ドラッグで並べ替え">⠿</span>
      <input type="hidden" name="field_key[]" value="<?= htmlspecialchars($f['key'], ENT_QUOTES) ?>">
      <label class="grid-settings-check">
        <input type="checkbox" name="field_visible[]" value="<?= $i ?>" <?= $f['visible'] ? 'checked' : '' ?>>
      </label>
      <span class="grid-settings-key"><?= htmlspecialchars($f['key'], ENT_QUOTES) ?></span>
      <input type="text" name="field_label[]" class="form-control form-control--sm grid-settings-label"
             value="<?= htmlspecialchars($f['label'], ENT_QUOTES) ?>" placeholder="表示ラベル">
    </div>
    <?php endforeach; ?>
  </div>

  <div class="form-actions" style="margin-top:var(--s-6);">
    <a href="<?= cms_url('/admin/me-no-hoshi.php') ?>" class="btn btn-ghost">戻る</a>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>
</form>

<style>
.grid-settings-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  max-width: 600px;
}
.grid-settings-row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: grab;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.grid-settings-row:active { cursor: grabbing; }
.grid-settings-row.is-dragging {
  opacity: 0.5;
  border-color: var(--accent);
}
.grid-settings-row.is-over {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-bg);
}
.grid-settings-handle {
  font-size: 18px;
  color: var(--text-3);
  cursor: grab;
  user-select: none;
  line-height: 1;
}
.grid-settings-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}
.grid-settings-key {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-2);
  min-width: 100px;
  font-family: monospace;
}
.grid-settings-label {
  flex: 1;
  min-width: 0;
}
</style>

<script>
// ドラッグ&ドロップで並べ替え
(function() {
  const list = document.getElementById('grid-settings-list');
  if (!list) return;

  let dragged = null;

  list.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.grid-settings-row');
    if (!row) return;
    dragged = row;
    row.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragend', (e) => {
    if (dragged) dragged.classList.remove('is-dragging');
    list.querySelectorAll('.is-over').forEach(el => el.classList.remove('is-over'));
    dragged = null;
    // チェックボックスの value を行順に更新
    list.querySelectorAll('.grid-settings-row').forEach((row, i) => {
      const cb = row.querySelector('input[type="checkbox"]');
      if (cb) cb.value = String(i);
    });
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.grid-settings-row');
    if (row && row !== dragged) {
      list.querySelectorAll('.is-over').forEach(el => el.classList.remove('is-over'));
      row.classList.add('is-over');
    }
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.grid-settings-row');
    if (!target || !dragged || target === dragged) return;

    const rows = [...list.querySelectorAll('.grid-settings-row')];
    const fromIdx = rows.indexOf(dragged);
    const toIdx = rows.indexOf(target);

    if (fromIdx < toIdx) {
      target.after(dragged);
    } else {
      target.before(dragged);
    }

    target.classList.remove('is-over');
  });
})();
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
