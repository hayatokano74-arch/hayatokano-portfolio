<?php
// Works 編集

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
                $db->prepare("DELETE FROM works WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/works.php'));
            exit;
        }

        $slug    = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title   = trim($_POST['title'] ?? '');
        $date    = trim($_POST['date'] ?? '');
        $year    = trim($_POST['year'] ?? '');
        $excerpt = trim($_POST['excerpt'] ?? '');
        $pinned  = isset($_POST['pinned']) ? 1 : 0;
        $body    = trim($_POST['body'] ?? '');

        $tags_raw  = trim($_POST['tags'] ?? '');
        $tags      = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
        $tags_json = json_encode($tags, JSON_UNESCAPED_UNICODE);

        // details: 固定フィールド
        $details = [
            'exhibition_type' => trim($_POST['det_exhibition_type'] ?? ''),
            'period'          => trim($_POST['det_period'] ?? ''),
            'venue'           => trim($_POST['det_venue'] ?? ''),
            'address'         => trim($_POST['det_address'] ?? ''),
        ];
        // 空のフィールドは除去
        $details = array_filter($details, fn($v) => $v !== '');

        // media: 動的画像リスト
        $med_ids     = $_POST['media_id']     ?? [];
        $med_srcs    = $_POST['media_src']    ?? [];
        $med_alts    = $_POST['media_alt']    ?? [];
        $med_widths  = $_POST['media_width']  ?? [];
        $med_heights = $_POST['media_height'] ?? [];
        $media       = [];
        foreach ($med_srcs as $i => $src) {
            $src = trim($src);
            if ($src === '') continue;
            $media[] = [
                'id'     => trim($med_ids[$i] ?? ('media-' . ($i + 1))),
                'type'   => 'image',
                'src'    => $src,
                'alt'    => trim($med_alts[$i] ?? ''),
                'width'  => (int)($med_widths[$i] ?? 0),
                'height' => (int)($med_heights[$i] ?? 0),
            ];
        }

        $data_arr  = ['details' => $details, 'media' => $media];
        $data_json = json_encode($data_arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('works', $slug);
            if ($existing) {
                $stmt = $db->prepare("UPDATE works SET title=?, date=?, year=?, tags=?, excerpt=?, pinned=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json, $slug]);
            } else {
                $stmt = $db->prepare("INSERT INTO works (slug, title, date, year, tags, excerpt, pinned, body, data) VALUES (?,?,?,?,?,?,?,?,?)");
                $stmt->execute([$slug, $title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json]);
            }
            header('Location: ' . cms_url('/admin/works.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $row = ['slug' => '', 'title' => '', 'date' => date('Y-m-d'), 'year' => date('Y'),
            'tags' => '[]', 'excerpt' => '', 'pinned' => 0, 'body' => '', 'data' => '{}'];
} elseif ($slug_param) {
    $row = db_find_by_slug('works', $slug_param);
    if (!$row) {
        $errors[] = '指定された Works が見つかりません。';
        $row = ['slug' => $slug_param, 'title' => '', 'date' => '', 'year' => '',
                'tags' => '[]', 'excerpt' => '', 'pinned' => 0, 'body' => '', 'data' => '{}'];
    }
} else {
    header('Location: ' . cms_url('/admin/works.php'));
    exit;
}

$f_slug    = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_title   = htmlspecialchars($row['title'] ?? '', ENT_QUOTES);
$f_date    = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_year    = htmlspecialchars($row['year'] ?? '', ENT_QUOTES);
$f_excerpt = htmlspecialchars($row['excerpt'] ?? '', ENT_QUOTES);
$f_pinned  = !empty($row['pinned']);
$f_body    = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);

$tags_decoded = json_decode($row['tags'] ?? '[]', true);
$tags_arr     = is_array($tags_decoded) ? $tags_decoded : [];
$f_tags   = htmlspecialchars(implode(', ', $tags_arr), ENT_QUOTES);

$data    = json_decode($row['data'] ?? '{}', true) ?? [];
$details = $data['details'] ?? [];
$media   = $data['media']   ?? [];

// details は旧形式（object）と新形式（object）どちらも対応
$f_det_type    = htmlspecialchars($details['exhibition_type'] ?? '', ENT_QUOTES);
$f_det_period  = htmlspecialchars($details['period']          ?? '', ENT_QUOTES);
$f_det_venue   = htmlspecialchars($details['venue']           ?? '', ENT_QUOTES);
$f_det_address = htmlspecialchars($details['address']         ?? '', ENT_QUOTES);

$page_title = $is_new ? 'Works 新規追加' : 'Works 編集: ' . ($row['title'] ?: $row['slug']);
$active_nav = 'works';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="works-form">
  <input type="hidden" name="_csrf"   value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">
  <input type="hidden" name="_action" value="save">

  <div class="form-grid">

    <!-- ── 基本情報 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">基本情報</h3>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="slug">スラッグ <span class="required">*</span></label>
          <input type="text" id="slug" name="slug" class="form-control"
                 value="<?= $f_slug ?>" pattern="[a-zA-Z0-9\-_]+"
                 title="英数字・ハイフン・アンダースコアのみ" required
                 <?= !$is_new ? 'readonly' : '' ?>>
          <?php if (!$is_new): ?><p class="form-hint">スラッグは変更できません。</p><?php endif; ?>
        </div>
        <div class="form-group">
          <label class="form-label" for="title">タイトル <span class="required">*</span></label>
          <input type="text" id="title" name="title" class="form-control" value="<?= $f_title ?>" required>
        </div>
      </div>

      <div class="form-row form-row--3col">
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="year">年</label>
          <input type="text" id="year" name="year" class="form-control" value="<?= $f_year ?>" placeholder="例: 2024">
        </div>
        <div class="form-group form-group--center">
          <label class="form-label">固定表示</label>
          <label class="toggle-label">
            <input type="checkbox" name="pinned" <?= $f_pinned ? 'checked' : '' ?>>
            <span>トップに固定</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="tags">タグ（カンマ区切り）</label>
        <input type="text" id="tags" name="tags" class="form-control" value="<?= $f_tags ?>"
               placeholder="例: Exhibition, Photography, 2024">
      </div>

      <div class="form-group">
        <label class="form-label" for="excerpt">抜粋</label>
        <textarea id="excerpt" name="excerpt" class="form-control" rows="3"
                  placeholder="一覧ページに表示する短い説明"><?= $f_excerpt ?></textarea>
      </div>
    </div>

    <!-- ── 展示情報 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">展示情報</h3>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="det_exhibition_type">展示形式</label>
          <input type="text" id="det_exhibition_type" name="det_exhibition_type"
                 class="form-control" value="<?= $f_det_type ?>"
                 placeholder="例: Solo Exhibition, Group Exhibition">
        </div>
        <div class="form-group">
          <label class="form-label" for="det_period">会期</label>
          <input type="text" id="det_period" name="det_period"
                 class="form-control" value="<?= $f_det_period ?>"
                 placeholder="例: 2023.04.08 - 2023.06.04">
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="det_venue">会場名</label>
          <input type="text" id="det_venue" name="det_venue"
                 class="form-control" value="<?= $f_det_venue ?>"
                 placeholder="例: Glvanize gallery">
        </div>
        <div class="form-group">
          <label class="form-label" for="det_address">住所</label>
          <input type="text" id="det_address" name="det_address"
                 class="form-control" value="<?= $f_det_address ?>"
                 placeholder="例: 宮城県石巻市...">
        </div>
      </div>
    </div>

    <!-- ── 作品画像（media） ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">作品画像</h3>
      <p class="form-hint">先頭の画像がサムネイルになります。</p>
      <div id="media-list" class="dynamic-list">
        <?php foreach ($media as $i => $m): ?>
        <div class="dynamic-row dynamic-row--media">
          <div class="media-row-preview">
            <?php if (!empty($m['src'])): ?>
            <img src="<?= htmlspecialchars($m['src'], ENT_QUOTES) ?>" alt=""
                 style="width:80px;height:60px;object-fit:cover;border-radius:4px;">
            <?php endif; ?>
          </div>
          <div class="media-row-fields">
            <input type="hidden" name="media_id[]" value="<?= htmlspecialchars($m['id'] ?? '', ENT_QUOTES) ?>">
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">画像 URL</label>
                <input type="text" name="media_src[]" class="form-control"
                       data-upload-section="works" data-upload-slug="<?= $f_slug ?>"
                       value="<?= htmlspecialchars($m['src'] ?? '', ENT_QUOTES) ?>" placeholder="/uploads/...">
              </div>
              <div class="form-group">
                <label class="form-label">alt テキスト</label>
                <input type="text" name="media_alt[]" class="form-control"
                       value="<?= htmlspecialchars($m['alt'] ?? '', ENT_QUOTES) ?>">
              </div>
            </div>
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">幅 (px)</label>
                <input type="number" name="media_width[]" class="form-control"
                       value="<?= (int)($m['width'] ?? 0) ?>" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">高さ (px)</label>
                <input type="number" name="media_height[]" class="form-control"
                       value="<?= (int)($m['height'] ?? 0) ?>" min="0">
              </div>
            </div>
          </div>
          <div class="media-row-actions">
            <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="media-add">+ 画像を追加</button>
    </div>

    <!-- ── 本文 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="14"
                  data-rich-editor
                  placeholder="ステートメント・説明文"><?= $f_body ?></textarea>
      </div>
    </div>

  </div><!-- /.form-grid -->

  <div class="form-actions">
    <a href="<?= cms_url('/admin/works.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger"
            data-delete
            data-message="「<?= htmlspecialchars($row['title'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。"
            data-form-action="delete"
            data-form-id="works-form">削除</button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<template id="tpl-media-row">
  <div class="dynamic-row dynamic-row--media">
    <div class="media-row-preview"></div>
    <div class="media-row-fields">
      <input type="hidden" name="media_id[]" value="">
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">画像 URL</label>
          <input type="text" name="media_src[]" class="form-control"
                 data-upload-section="works" data-upload-slug="" placeholder="/uploads/...">
        </div>
        <div class="form-group">
          <label class="form-label">alt テキスト</label>
          <input type="text" name="media_alt[]" class="form-control">
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">幅 (px)</label>
          <input type="number" name="media_width[]" class="form-control" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">高さ (px)</label>
          <input type="number" name="media_height[]" class="form-control" value="0" min="0">
        </div>
      </div>
    </div>
    <div class="media-row-actions">
      <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
    </div>
  </div>
</template>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const list   = document.getElementById('media-list');
  const addBtn = document.getElementById('media-add');
  const tpl    = document.getElementById('tpl-media-row');

  if (addBtn && list && tpl) {
    addBtn.addEventListener('click', () => {
      const clone = tpl.content.cloneNode(true);
      clone.querySelectorAll('[data-upload-section]').forEach(el => {
        el.dataset.uploadSlug = '<?= addslashes($f_slug) ?>';
      });
      list.appendChild(clone);
      init_upload_fields(list.lastElementChild);
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.dynamic-remove');
      if (btn) btn.closest('.dynamic-row')?.remove();
    });
  }

  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message || '削除しますか？', () => {
        const form = document.getElementById('works-form');
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
