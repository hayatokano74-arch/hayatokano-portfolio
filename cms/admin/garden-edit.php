<?php
// Garden 編集 — Garden エントリの新規作成・既存編集・削除を行うフォームページ

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

        $tags_raw  = trim($_POST['tags'] ?? '');
        $tags      = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
        $tags_json = json_encode($tags, JSON_UNESCAPED_UNICODE);

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';

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
    $row = ['slug' => '', 'date' => date('Y-m-d'), 'title' => '', 'type' => 'text', 'tags' => '[]', 'body' => ''];
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

$tags_arr = json_decode($row['tags'] ?? '[]', true) ?? [];
$f_tags   = htmlspecialchars(implode(', ', $tags_arr), ENT_QUOTES);

$page_title = $is_new ? 'Garden 新規追加' : 'Garden 編集: ' . ($row['title'] ?: $row['slug']);
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

    <div class="form-section form-section--full">
      <h3 class="form-section__title">基本情報</h3>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="slug">スラッグ <span class="required">*</span></label>
          <input type="text" id="slug" name="slug" class="form-control"
                 value="<?= $f_slug ?>" pattern="[a-zA-Z0-9\-_]+" required
                 <?= !$is_new ? 'readonly' : '' ?>>
        </div>
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="title">タイトル <span class="required">*</span></label>
        <input type="text" id="title" name="title" class="form-control" value="<?= $f_title ?>" required>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="type">タイプ</label>
          <select id="type" name="type" class="form-control" id="garden-type">
            <option value="text"  <?= $f_type === 'text'  ? 'selected' : '' ?>>text</option>
            <option value="photo" <?= $f_type === 'photo' ? 'selected' : '' ?>>photo</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="tags">タグ（カンマ区切り）</label>
          <input type="text" id="tags" name="tags" class="form-control" value="<?= $f_tags ?>">
        </div>
      </div>
    </div>

    <!-- 本文 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="16"><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- 画像アップロードゾーン（photo タイプ時に使用） -->
    <div class="form-section form-section--full" id="photo-section" style="<?= $f_type === 'photo' ? '' : 'display:none' ?>">
      <h3 class="form-section__title">画像アップロード（photo タイプ）</h3>
      <div class="upload-zone" id="upload-zone-garden" data-section="garden" data-slug="<?= $f_slug ?>">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-garden"></div>
      </div>
      <p class="form-hint" style="margin-top:var(--s-2)">アップロードした URL は手動で本文に追記してください。</p>
    </div>

  </div>

  <div class="form-actions">
    <a href="<?= cms_url('/admin/garden.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger" data-delete
            data-message="「<?= htmlspecialchars($row['title'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。">
      削除
    </button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // タイプ切替で画像セクションを表示/非表示
  const typeSelect    = document.getElementById('garden-type');
  const photoSection  = document.getElementById('photo-section');
  if (typeSelect && photoSection) {
    typeSelect.addEventListener('change', () => {
      photoSection.style.display = typeSelect.value === 'photo' ? '' : 'none';
    });
  }

  // 画像アップロードゾーン初期化
  const zone = document.getElementById('upload-zone-garden');
  if (zone) {
    init_upload_zone(zone, {
      apiUrl: '../api/upload.php',
      section: 'garden',
      slug: '<?= addslashes($row['slug'] ?? '') ?>',
      onUploaded(url) {
        // URL をクリップボードにコピーして通知
        navigator.clipboard?.writeText(url).catch(() => {});
        show_toast('アップロード完了: ' + url, 'success');
      },
    });
  }

  // 削除ボタン
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message, () => {
        document.getElementById('garden-form').querySelector('[name="_action"]').value = 'delete';
        document.getElementById('garden-form').submit();
      });
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
