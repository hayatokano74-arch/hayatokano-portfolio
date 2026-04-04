<?php
// Garden 編集

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db     = get_db();
$errors = [];
$is_new = false;
$row    = null;

// ── POST 処理 ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。ページを再読み込みしてください。';
    } else {
        $action = $_POST['_action'] ?? 'save';

        if ($action === 'delete') {
            $del_slug = trim($_POST['slug'] ?? '');
            if ($del_slug) {
                $db->prepare("DELETE FROM garden WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/garden.php'));
            exit;
        }

        $slug  = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $date  = trim($_POST['date'] ?? '');
        $title = trim($_POST['title'] ?? '');
        $type  = in_array($_POST['type'] ?? '', ['text', 'photo']) ? $_POST['type'] : 'text';
        $body  = trim($_POST['body'] ?? '');

        // タイトルが空なら日付をタイトルにする
        if ($title === '' && $date !== '') {
            $title = $date;
        }

        $tags_raw  = trim($_POST['tags'] ?? '');
        $tags      = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
        $tags_json = json_encode($tags, JSON_UNESCAPED_UNICODE);

        if (!$slug) $errors[] = 'スラッグは必須です。';
        if (!$date) $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('garden', $slug);
            if ($existing) {
                $stmt = $db->prepare("UPDATE garden SET date=?, title=?, type=?, tags=?, body=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$date, $title, $type, $tags_json, $body, $slug]);
            } else {
                $stmt = $db->prepare("INSERT INTO garden (slug, date, title, type, tags, body) VALUES (?,?,?,?,?,?)");
                $stmt->execute([$slug, $date, $title, $type, $tags_json, $body]);
            }
            header('Location: ' . cms_url('/admin/garden.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $today  = date('Y-m-d');
    $row = ['slug' => $today, 'date' => $today, 'title' => '', 'type' => 'text', 'tags' => '[]', 'body' => ''];
} elseif ($slug_param) {
    $row = db_find_by_slug('garden', $slug_param);
    if (!$row) {
        $errors[] = '指定された Garden エントリが見つかりません。';
        $row = ['slug' => $slug_param, 'date' => '', 'title' => '', 'type' => 'text', 'tags' => '[]', 'body' => ''];
    }
} else {
    header('Location: ' . cms_url('/admin/garden.php'));
    exit;
}

$f_slug  = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_date  = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_title = htmlspecialchars($row['title'] ?? '', ENT_QUOTES);
$f_type  = $row['type'] ?? 'text';
$f_body  = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);

$tags_decoded = json_decode($row['tags'] ?? '[]', true);
$tags_arr     = is_array($tags_decoded) ? $tags_decoded : [];
$f_tags       = htmlspecialchars(implode(', ', $tags_arr), ENT_QUOTES);

$page_title = $is_new ? 'Garden 新規追加' : 'Garden: ' . ($row['date'] ?: $row['slug']);
$active_nav = 'garden';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="garden-form">
  <input type="hidden" name="_csrf"   value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">
  <input type="hidden" name="_action" value="save">

  <div class="form-grid">

    <!-- ── ヘッダー行: 日付 + 種類 ── -->
    <div class="form-section form-section--full">
      <div class="form-row form-row--3col" style="align-items:flex-end;">
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="slug">スラッグ <span class="required">*</span></label>
          <input type="text" id="slug" name="slug" class="form-control"
                 value="<?= $f_slug ?>" pattern="[a-zA-Z0-9\-_]+" required
                 <?= !$is_new ? 'readonly' : '' ?>>
          <?php if (!$is_new): ?><p class="form-hint">変更不可</p><?php endif; ?>
        </div>
        <div class="form-group">
          <label class="form-label">種類</label>
          <div style="display:flex;gap:var(--s-4);align-items:center;padding-top:var(--s-2);">
            <label style="display:flex;align-items:center;gap:var(--s-2);cursor:pointer;">
              <input type="radio" name="type" value="text"  <?= $f_type !== 'photo' ? 'checked' : '' ?>>
              <span>テキスト</span>
            </label>
            <label style="display:flex;align-items:center;gap:var(--s-2);cursor:pointer;">
              <input type="radio" name="type" value="photo" <?= $f_type === 'photo' ? 'checked' : '' ?>>
              <span>写真</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 本文エリア（タイトル + 本文を一体化） ── -->
    <div class="form-section form-section--full">
      <div class="garden-entry-editor">
        <div class="form-group garden-title-group">
          <input type="text" id="title" name="title" class="form-control garden-title-input"
                 value="<?= $f_title ?>"
                 placeholder="タイトル（省略すると日付がタイトルになります）">
        </div>
        <div class="form-group">
          <textarea id="body" name="body" class="form-control garden-body-textarea"
                    rows="18"
                    data-rich-editor
                    data-md-upload-section="garden"
                    data-md-upload-slug="<?= htmlspecialchars($row['slug'] ?? '', ENT_QUOTES) ?>"
                    placeholder="本文を入力..."><?= $f_body ?></textarea>
        </div>
      </div>
    </div>

    <!-- ── タグ ── -->
    <div class="form-section form-section--full">
      <div class="form-group">
        <label class="form-label" for="tags">タグ（カンマ区切り、任意）</label>
        <input type="text" id="tags" name="tags" class="form-control" value="<?= $f_tags ?>"
               placeholder="例: 日記, 石巻, 2021">
      </div>
    </div>

    <!-- ── 画像アップロード（photo タイプ時） ── -->
    <div class="form-section form-section--full" id="photo-section"
         style="<?= $f_type === 'photo' ? '' : 'display:none' ?>">
      <h3 class="form-section__title">画像アップロード</h3>
      <div class="upload-zone" id="upload-zone-garden">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-garden"></div>
      </div>
      <p class="form-hint" style="margin-top:var(--s-2)">アップロードした URL を本文に貼り付けてください。</p>
    </div>

  </div>

  <div class="form-actions">
    <a href="<?= cms_url('/admin/garden.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger"
            data-delete
            data-message="「<?= htmlspecialchars($row['date'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。"
            data-form-action="delete"
            data-form-id="garden-form">削除</button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // 日付 → スラッグ自動入力（新規時）
  const dateInput = document.getElementById('date');
  const slugInput = document.getElementById('slug');
  if (dateInput && slugInput && slugInput.readOnly === false) {
    dateInput.addEventListener('change', () => {
      if (slugInput.value === '' || slugInput.value === slugInput.dataset.prevDate) {
        slugInput.value = dateInput.value;
        slugInput.dataset.prevDate = dateInput.value;
      }
    });
  }

  // 種類切替で画像セクションを表示/非表示
  document.querySelectorAll('input[name="type"]').forEach(r => {
    r.addEventListener('change', () => {
      const ps = document.getElementById('photo-section');
      if (ps) ps.style.display = r.value === 'photo' ? '' : 'none';
    });
  });

  // 画像アップロードゾーン
  const zone = document.getElementById('upload-zone-garden');
  if (zone) {
    init_upload_zone(zone, {
      section: 'garden',
      slug: '<?= addslashes($row['slug'] ?? '') ?>',
      onUploaded(url) {
        insert_at_cursor(document.getElementById('body'), `\n![](${url})\n`);
        show_toast('画像を挿入しました', 'success');
      },
    });
  }

  // 削除ボタン
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message || '削除しますか？', () => {
        const form = document.getElementById('garden-form');
        form.querySelector('[name="_action"]').value = 'delete';
        form.submit();
      });
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
