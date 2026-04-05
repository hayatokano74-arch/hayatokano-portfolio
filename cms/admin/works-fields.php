<?php
// Works — 詳細フィールド設定
// カテゴリとフィールドの定義を管理する

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
        $cat_names  = $_POST['cat_name']  ?? [];
        $field_keys = $_POST['field_key'] ?? [];
        $field_phs  = $_POST['field_ph']  ?? [];
        $field_cats = $_POST['field_cat'] ?? [];

        $categories = [];
        // カテゴリ名を収集
        foreach ($cat_names as $i => $name) {
            $name = trim($name);
            if ($name === '') continue;
            $categories[$i] = ['name' => $name, 'fields' => []];
        }

        // フィールドを各カテゴリに振り分け
        foreach ($field_keys as $i => $key) {
            $key = trim($key);
            if ($key === '') continue;
            $cat_idx = (int)($field_cats[$i] ?? 0);
            if (!isset($categories[$cat_idx])) continue;
            $categories[$cat_idx]['fields'][] = [
                'key' => $key,
                'placeholder' => trim($field_phs[$i] ?? ''),
            ];
        }

        $value = json_encode(array_values($categories), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $db->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        $stmt->execute(['works_detail_fields', $value]);

        header('Location: ' . cms_url('/admin/works-fields.php?saved=1'));
        exit;
    }
}

// ── GET: 読み込み ──
$stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
$stmt->execute(['works_detail_fields']);
$row = $stmt->fetch();

$categories = [];
if ($row) {
    $categories = json_decode($row['value'], true) ?? [];
}

// 初回: ハードコードのデフォルトを使用
if (empty($categories)) {
    $categories = [
        ['name' => '展示・イベント', 'fields' => [
            ['key' => 'Type', 'placeholder' => '例: Solo Exhibition / Group Exhibition'],
            ['key' => 'Artist', 'placeholder' => ''],
            ['key' => 'Artists', 'placeholder' => 'グループ展の場合'],
            ['key' => 'Period', 'placeholder' => '例: 2023.04.08 - 2023.06.04'],
            ['key' => 'Venue', 'placeholder' => ''],
            ['key' => 'Address', 'placeholder' => ''],
            ['key' => 'Access', 'placeholder' => ''],
            ['key' => 'Hours', 'placeholder' => '例: 12:00 - 18:00'],
            ['key' => 'Closed', 'placeholder' => '例: 月・火・水'],
            ['key' => 'Admission', 'placeholder' => '例: 無料'],
            ['key' => 'Organizer', 'placeholder' => ''],
            ['key' => 'Curator', 'placeholder' => ''],
            ['key' => 'Supported by', 'placeholder' => ''],
        ]],
        ['name' => 'クライアント', 'fields' => [
            ['key' => 'Client', 'placeholder' => '企業名・団体名'],
            ['key' => 'Project Type', 'placeholder' => '例: 撮影 / 映像制作'],
            ['key' => 'Role', 'placeholder' => ''],
            ['key' => 'Collaborators', 'placeholder' => ''],
        ]],
        ['name' => '出版・寄稿', 'fields' => [
            ['key' => 'Type', 'placeholder' => '例: Free Paper / Book / Magazine'],
            ['key' => 'Publisher', 'placeholder' => ''],
            ['key' => 'Publication', 'placeholder' => '雑誌名・メディア名'],
            ['key' => 'Issue', 'placeholder' => '例: No.3'],
            ['key' => 'Published', 'placeholder' => '例: 2025.06.15'],
            ['key' => 'Pages', 'placeholder' => ''],
            ['key' => 'Binding', 'placeholder' => '例: ソフトカバー'],
            ['key' => 'Price', 'placeholder' => ''],
            ['key' => 'ISBN', 'placeholder' => ''],
            ['key' => 'Contribution', 'placeholder' => '例: Photography / Text'],
            ['key' => 'Base', 'placeholder' => '例: Sendai / Tokyo'],
        ]],
        ['name' => '作品', 'fields' => [
            ['key' => 'Medium', 'placeholder' => '例: Inkjet Print'],
            ['key' => 'Dimensions', 'placeholder' => '例: 1200 x 900 mm'],
            ['key' => 'Edition', 'placeholder' => '例: 1/5 + AP'],
            ['key' => 'Series', 'placeholder' => ''],
            ['key' => 'Duration', 'placeholder' => '映像の場合'],
            ['key' => 'Format', 'placeholder' => '例: 16mm / 4K'],
        ]],
        ['name' => 'クレジット', 'fields' => [
            ['key' => 'Photo', 'placeholder' => ''],
            ['key' => 'Design', 'placeholder' => ''],
            ['key' => 'Text', 'placeholder' => ''],
            ['key' => 'Sound', 'placeholder' => ''],
            ['key' => 'Video', 'placeholder' => ''],
            ['key' => 'Translation', 'placeholder' => ''],
            ['key' => 'Cooperation', 'placeholder' => ''],
        ]],
        ['name' => '実績・リンク', 'fields' => [
            ['key' => 'Award', 'placeholder' => ''],
            ['key' => 'Grant', 'placeholder' => '例: ○○財団助成金'],
            ['key' => 'Residency', 'placeholder' => ''],
            ['key' => 'Collection', 'placeholder' => '例: ○○美術館'],
            ['key' => 'URL', 'placeholder' => 'https://...'],
        ]],
    ];
}

$page_title = 'Works — 詳細フィールド設定';
$active_nav = 'works';
ob_start();
?>

<?php if (!empty($_GET['saved'])): ?>
<div class="alert alert-success">設定を保存しました。今後の全Works入力に反映されます。</div>
<?php endif; ?>

<p style="color:var(--text-2);margin-bottom:var(--s-5);">
  Worksの詳細情報に表示するカテゴリとフィールドを設定します。<br>
  ここで設定した内容が全Worksの編集画面に反映されます。
</p>

<form method="post" action="">
  <input type="hidden" name="_csrf" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">

  <div id="categories-container">
    <?php foreach ($categories as $ci => $cat): ?>
    <div class="wf-category" data-cat-index="<?= $ci ?>">
      <div class="wf-category__header">
        <input type="text" name="cat_name[]" class="form-control wf-category__name"
               value="<?= htmlspecialchars($cat['name'], ENT_QUOTES) ?>" placeholder="カテゴリ名">
        <button type="button" class="btn btn-sm btn-ghost wf-cat-remove" title="カテゴリ削除">✕</button>
      </div>
      <div class="wf-fields">
        <?php foreach ($cat['fields'] as $fi => $field): ?>
        <div class="wf-field-row">
          <input type="hidden" name="field_cat[]" value="<?= $ci ?>">
          <input type="text" name="field_key[]" class="form-control wf-field-key"
                 value="<?= htmlspecialchars($field['key'], ENT_QUOTES) ?>" placeholder="項目名">
          <input type="text" name="field_ph[]" class="form-control wf-field-ph"
                 value="<?= htmlspecialchars($field['placeholder'], ENT_QUOTES) ?>" placeholder="プレースホルダー">
          <button type="button" class="wf-field-remove" title="削除">✕</button>
        </div>
        <?php endforeach; ?>
      </div>
      <button type="button" class="btn btn-xs btn-ghost wf-add-field" style="margin-top:var(--s-2);">+ フィールドを追加</button>
    </div>
    <?php endforeach; ?>
  </div>

  <button type="button" class="btn btn-sm btn-ghost" id="add-category" style="margin-top:var(--s-4);">+ カテゴリを追加</button>

  <div class="form-actions" style="margin-top:var(--s-6);">
    <a href="<?= cms_url('/admin/works.php') ?>" class="btn btn-ghost">戻る</a>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>
</form>

<style>
.wf-category {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: var(--s-3);
  background: var(--card);
}
.wf-category__header {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--border-subtle);
}
.wf-category__name {
  flex: 1;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: var(--font-base);
}
.wf-category__name:focus {
  outline: none;
  border-bottom: 1px solid var(--accent);
}
.wf-fields {
  padding: var(--s-2) var(--s-4);
}
.wf-field-row {
  display: grid;
  grid-template-columns: 1fr 2fr 24px;
  gap: var(--s-2);
  align-items: center;
  padding: var(--s-1) 0;
}
.wf-field-key {
  font-weight: 500;
  font-size: var(--font-sm);
}
.wf-field-ph {
  font-size: var(--font-sm);
  color: var(--text-2);
}
.wf-field-remove, .wf-cat-remove {
  all: unset;
  font-size: 13px;
  color: var(--text-3);
  cursor: pointer;
  text-align: center;
}
.wf-field-remove:hover, .wf-cat-remove:hover { color: var(--danger); }
.btn-xs { font-size: var(--font-xs); padding: 2px var(--s-2); }

@media (max-width: 768px) {
  .wf-field-row { grid-template-columns: 1fr 20px; }
  .wf-field-ph { grid-column: 1; }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('categories-container');
  const addCatBtn = document.getElementById('add-category');

  // カテゴリ追加
  addCatBtn.addEventListener('click', () => {
    const idx = container.querySelectorAll('.wf-category').length;
    const div = document.createElement('div');
    div.className = 'wf-category';
    div.dataset.catIndex = idx;
    div.innerHTML = `
      <div class="wf-category__header">
        <input type="text" name="cat_name[]" class="form-control wf-category__name" placeholder="新しいカテゴリ名" autofocus>
        <button type="button" class="btn btn-sm btn-ghost wf-cat-remove" title="カテゴリ削除">✕</button>
      </div>
      <div class="wf-fields"></div>
      <button type="button" class="btn btn-xs btn-ghost wf-add-field" style="margin-top:var(--s-2);margin-left:var(--s-4);margin-bottom:var(--s-2);">+ フィールドを追加</button>
    `;
    container.appendChild(div);
    div.querySelector('.wf-category__name').focus();
  });

  // フィールド追加
  container.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.wf-add-field');
    if (addBtn) {
      const cat = addBtn.closest('.wf-category');
      const idx = cat.dataset.catIndex;
      const fields = cat.querySelector('.wf-fields');
      const row = document.createElement('div');
      row.className = 'wf-field-row';
      row.innerHTML = `
        <input type="hidden" name="field_cat[]" value="${idx}">
        <input type="text" name="field_key[]" class="form-control wf-field-key" placeholder="項目名">
        <input type="text" name="field_ph[]" class="form-control wf-field-ph" placeholder="プレースホルダー">
        <button type="button" class="wf-field-remove" title="削除">✕</button>
      `;
      fields.appendChild(row);
      row.querySelector('.wf-field-key').focus();
    }

    // フィールド削除
    if (e.target.closest('.wf-field-remove')) {
      e.target.closest('.wf-field-row').remove();
    }

    // カテゴリ削除
    if (e.target.closest('.wf-cat-remove')) {
      if (confirm('このカテゴリと全フィールドを削除しますか？')) {
        e.target.closest('.wf-category').remove();
      }
    }
  });

  // フォーム送信前にcat_indexを再採番
  document.querySelector('form').addEventListener('submit', () => {
    container.querySelectorAll('.wf-category').forEach((cat, i) => {
      cat.dataset.catIndex = i;
      cat.querySelectorAll('[name="field_cat[]"]').forEach(input => {
        input.value = i;
      });
    });
  });
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
