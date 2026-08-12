<?php
// About 編集

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/revalidate.php';

require_auth();

$db     = get_db();
$errors = [];
$notice = '';

// ── POST 処理 ──
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。';
    } else {
        $body = trim($_POST['body'] ?? '');

        // photos: 動的行
        $photo_srcs    = $_POST['photo_src']    ?? [];
        $photo_widths  = $_POST['photo_width']  ?? [];
        $photo_heights = $_POST['photo_height'] ?? [];
        $photos = [];
        foreach ($photo_srcs as $i => $src) {
            $src = trim($src);
            if ($src === '') continue;
            $photos[] = [
                'src'    => $src,
                'width'  => (int)($photo_widths[$i] ?? 0),
                'height' => (int)($photo_heights[$i] ?? 0),
            ];
        }

        // CV: 動的行
        $cv_years    = $_POST['cv_year']    ?? [];
        $cv_contents = $_POST['cv_content'] ?? [];
        $cv = [];
        foreach ($cv_years as $i => $year) {
            $content = trim($cv_contents[$i] ?? '');
            if ($year === '' && $content === '') continue;
            $cv[] = ['year' => trim($year), 'content' => $content];
        }

        $data_json = json_encode(['photos' => $photos, 'cv' => $cv], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $db->prepare("UPDATE about SET body=?, data=?, updated_at=datetime('now') WHERE id=1");
        $stmt->execute([$body, $data_json]);
        revalidate_paths(['/about']);
        $notice = '保存しました。';
    }
}

// ── データ読み込み ──
$row = db_find_by_id('about', 1);
if (!$row) $row = ['id' => 1, 'body' => '', 'data' => '{}', 'updated_at' => ''];

$f_body = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);
$data   = json_decode($row['data'] ?? '{}', true) ?? [];
$photos = $data['photos'] ?? [];
$cv     = $data['cv'] ?? [];

$page_title = 'About 編集';
$active_nav = 'about';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<?php if ($notice): ?>
<div class="alert alert-success"><?= htmlspecialchars($notice, ENT_QUOTES) ?></div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="about-form">
  <input type="hidden" name="_csrf" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">

  <div class="form-grid">

    <!-- 本文 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">ステートメント</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="10"
                  data-rich-editor placeholder="ステートメント・自己紹介"><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- 写真 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">プロフィール写真</h3>
      <div id="photo-list" class="dynamic-list">
        <?php foreach ($photos as $i => $p): ?>
        <div class="dynamic-row" style="display:flex;gap:var(--s-3);align-items:center;">
          <?php if (!empty($p['src'])): ?>
          <img src="<?= htmlspecialchars(fix_broken_unicode_url($p['src']), ENT_QUOTES) ?>" alt=""
               style="width:80px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0;">
          <?php endif; ?>
          <div style="flex:1;display:flex;gap:var(--s-2);flex-wrap:wrap;">
            <input type="text" name="photo_src[]" class="form-control" style="flex:3;min-width:200px;"
                   value="<?= htmlspecialchars($p['src'] ?? '', ENT_QUOTES) ?>" placeholder="画像URL"
                   data-upload-section="about" data-upload-slug="about">
            <input type="number" name="photo_width[]" class="form-control" style="width:80px;"
                   value="<?= (int)($p['width'] ?? 0) ?>" placeholder="幅">
            <input type="number" name="photo_height[]" class="form-control" style="width:80px;"
                   value="<?= (int)($p['height'] ?? 0) ?>" placeholder="高さ">
          </div>
          <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
        </div>
        <?php endforeach; ?>
      </div>
      <div style="display:flex;gap:var(--s-2);margin-top:var(--s-3);">
        <label class="btn btn-sm btn-primary">
          <input type="file" id="about-photo-upload" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          + 写真をアップロード
        </label>
        <button type="button" class="btn btn-sm btn-ghost" id="photo-add-row">+ URL入力</button>
      </div>
    </div>

    <!-- CV -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">CV（経歴）</h3>
      <p class="form-hint">年を空にして内容だけ入力するとセクション見出しになります。</p>
      <div id="cv-list" class="dynamic-list">
        <?php foreach ($cv as $i => $c): ?>
        <div class="dynamic-row" style="display:flex;gap:var(--s-3);align-items:center;">
          <input type="text" name="cv_year[]" class="form-control" style="width:80px;"
                 value="<?= htmlspecialchars($c['year'] ?? '', ENT_QUOTES) ?>" placeholder="年">
          <input type="text" name="cv_content[]" class="form-control" style="flex:1;"
                 value="<?= htmlspecialchars($c['content'] ?? '', ENT_QUOTES) ?>" placeholder="内容">
          <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
        </div>
        <?php endforeach; ?>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="cv-add-row" style="margin-top:var(--s-3);">+ 行を追加</button>
    </div>

  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

  // 写真行追加
  document.getElementById('photo-add-row').addEventListener('click', () => {
    const list = document.getElementById('photo-list');
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.style.cssText = 'display:flex;gap:var(--s-3);align-items:center;';
    row.innerHTML = `
      <div style="flex:1;display:flex;gap:var(--s-2);flex-wrap:wrap;">
        <input type="text" name="photo_src[]" class="form-control" style="flex:3;min-width:200px;" placeholder="画像URL" data-upload-section="about" data-upload-slug="about">
        <input type="number" name="photo_width[]" class="form-control" style="width:80px;" value="0" placeholder="幅">
        <input type="number" name="photo_height[]" class="form-control" style="width:80px;" value="0" placeholder="高さ">
      </div>
      <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
    `;
    list.appendChild(row);
    init_upload_fields(row);
  });

  // 写真アップロード
  document.getElementById('about-photo-upload').addEventListener('change', async function() {
    const file = this.files?.[0];
    if (!file) return;
    this.value = '';
    try {
      const result = await upload_image_to_api(file, 'about', 'about');
      const list = document.getElementById('photo-list');
      const row = document.createElement('div');
      row.className = 'dynamic-row';
      row.style.cssText = 'display:flex;gap:var(--s-3);align-items:center;';
      row.innerHTML = `
        <img src="${result.url}" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0;">
        <div style="flex:1;display:flex;gap:var(--s-2);flex-wrap:wrap;">
          <input type="text" name="photo_src[]" class="form-control" style="flex:3;min-width:200px;" value="${result.url}">
          <input type="number" name="photo_width[]" class="form-control" style="width:80px;" value="${result.width}">
          <input type="number" name="photo_height[]" class="form-control" style="width:80px;" value="${result.height}">
        </div>
        <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
      `;
      list.appendChild(row);
      show_toast('写真をアップロードしました', 'success');
    } catch (err) {
      show_toast(err.message, 'error');
    }
  });

  // CV行追加
  document.getElementById('cv-add-row').addEventListener('click', () => {
    const list = document.getElementById('cv-list');
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.style.cssText = 'display:flex;gap:var(--s-3);align-items:center;';
    row.innerHTML = `
      <input type="text" name="cv_year[]" class="form-control" style="width:80px;" placeholder="年">
      <input type="text" name="cv_content[]" class="form-control" style="flex:1;" placeholder="内容">
      <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
    `;
    list.appendChild(row);
  });

  // 行削除
  document.addEventListener('click', (e) => {
    if (e.target.closest('.dynamic-remove')) {
      e.target.closest('.dynamic-row')?.remove();
    }
  });
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';
