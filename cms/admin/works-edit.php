<?php
// Works 編集

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/revalidate.php';

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
                revalidate_paths(['/', '/works', "/works/{$del_slug}"]);
            }
            header('Location: ' . cms_url('/admin/works.php'));
            exit;
        }

        $slug    = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title   = trim($_POST['title'] ?? '');
        $date    = trim($_POST['date'] ?? '');
        $year    = trim($_POST['year'] ?? '');
        $excerpt = trim($_POST['excerpt'] ?? '');
        // pinnedは一覧ページで管理（編集ページでは変更しない）
        $original_slug_for_pin = trim($_POST['_original_slug'] ?? '');
        $_existing_for_pin = $original_slug_for_pin ? db_find_by_slug('works', $original_slug_for_pin) : null;
        $pinned = $_existing_for_pin ? (int)$_existing_for_pin['pinned'] : 0;
        $body    = trim($_POST['body'] ?? '');

        $tags_raw  = trim($_POST['tags'] ?? '');
        $tags      = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
        $tags_json = json_encode($tags, JSON_UNESCAPED_UNICODE);

        // details: 送信順を維持した連想配列（DOMの並び順で再収集済み）
        $det_keys   = $_POST['det_key']   ?? [];
        $det_values = $_POST['det_value'] ?? [];
        $details = [];
        foreach ($det_keys as $i => $k) {
            $k = trim($k);
            if ($k === '') continue;
            $v = trim($det_values[$i] ?? '');
            if ($v !== '') $details[$k] = $v; // 値がある項目のみ保存
        }

        // media: 動的メディアリスト（画像・動画）
        $med_ids     = $_POST['media_id']     ?? [];
        $med_srcs    = $_POST['media_src']    ?? [];
        $med_types   = $_POST['media_type']   ?? [];
        $med_alts    = $_POST['media_alt']    ?? [];
        $med_posters = $_POST['media_poster'] ?? [];
        $med_widths  = $_POST['media_width']  ?? [];
        $med_heights = $_POST['media_height'] ?? [];
        $media       = [];
        foreach ($med_srcs as $i => $src) {
            $src  = trim($src);
            if ($src === '') continue;
            $type = ($med_types[$i] ?? 'image') === 'video' ? 'video' : 'image';
            $item = [
                'id'     => trim($med_ids[$i] ?? ('media-' . ($i + 1))),
                'type'   => $type,
                'src'    => $src,
                'alt'    => trim($med_alts[$i] ?? ''),
                'width'  => (int)($med_widths[$i] ?? 0),
                'height' => (int)($med_heights[$i] ?? 0),
            ];
            if ($type === 'video') {
                $poster = trim($med_posters[$i] ?? '');
                $item['poster'] = $poster;
            }
            $media[] = $item;
        }

        // サムネイル（アイキャッチ）
        $thumb_src = trim($_POST['thumbnail_src'] ?? '');
        $thumb_data = [];
        if ($thumb_src) {
            $thumb_data = [
                'src' => $thumb_src,
                'alt' => '',
                'width' => (int)($_POST['thumbnail_width'] ?? 0),
                'height' => (int)($_POST['thumbnail_height'] ?? 0),
            ];
        }

        $data_arr = ['details' => $details, 'media' => $media];
        if ($thumb_data) $data_arr['thumbnail'] = $thumb_data;
        $data_json = json_encode($data_arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $original_slug = trim($_POST['_original_slug'] ?? '');
            $existing = $original_slug ? db_find_by_slug('works', $original_slug) : null;

            if ($existing) {
                // 既存レコードを更新（スラッグ変更にも対応）
                $stmt = $db->prepare("UPDATE works SET slug=?, title=?, date=?, year=?, tags=?, excerpt=?, pinned=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$slug, $title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json, $original_slug]);
                // スラッグを変更した場合は旧パスも再検証（残らないように）
                $paths = ['/', '/works', "/works/{$slug}"];
                if ($original_slug !== $slug) $paths[] = "/works/{$original_slug}";
                revalidate_paths($paths);
            } else {
                // 新規作成
                $stmt = $db->prepare("INSERT INTO works (slug, title, date, year, tags, excerpt, pinned, body, data) VALUES (?,?,?,?,?,?,?,?,?)");
                $stmt->execute([$slug, $title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json]);
                revalidate_paths(['/', '/works', "/works/{$slug}"]);
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
    // 次の連番スラッグを自動生成（w001, w002, ...）
    $max_num = 0;
    $existing = $db->query("SELECT slug FROM works WHERE slug LIKE 'w%'")->fetchAll();
    foreach ($existing as $e) {
        if (preg_match('/^w(\d+)$/', $e['slug'], $m)) {
            $max_num = max($max_num, (int)$m[1]);
        }
    }
    $next_slug = 'w' . str_pad($max_num + 1, 3, '0', STR_PAD_LEFT);
    $row = ['slug' => $next_slug, 'title' => '', 'date' => date('Y-m-d'), 'year' => date('Y'),
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
$media     = $data['media']     ?? [];
$thumbnail = $data['thumbnail'] ?? [];

// 詳細フィールド設定をDBから読み込み（works-fields.phpで管理）
$_field_stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
$_field_stmt->execute(['works_detail_fields']);
$_field_row = $_field_stmt->fetch();
$standard_fields = $_field_row ? (json_decode($_field_row['value'], true) ?? []) : [];

// デフォルト（settingsが空の場合のみ使用）
if (empty($standard_fields)) {
    $standard_fields = [
        ['name' => '展示・イベント', 'fields' => [
            ['key' => 'Type', 'placeholder' => '例: Solo Exhibition / Group Exhibition'],
            ['key' => 'Artist', 'placeholder' => ''], ['key' => 'Artists', 'placeholder' => 'グループ展の場合'],
            ['key' => 'Period', 'placeholder' => '例: 2023.04.08 - 2023.06.04'],
            ['key' => 'Venue', 'placeholder' => ''], ['key' => 'Address', 'placeholder' => ''],
            ['key' => 'Access', 'placeholder' => ''], ['key' => 'Hours', 'placeholder' => '例: 12:00 - 18:00'],
            ['key' => 'Closed', 'placeholder' => '例: 月・火・水'], ['key' => 'Admission', 'placeholder' => '例: 無料'],
            ['key' => 'Organizer', 'placeholder' => ''], ['key' => 'Curator', 'placeholder' => ''],
            ['key' => 'Supported by', 'placeholder' => ''],
        ]],
        ['name' => 'クライアント', 'fields' => [
            ['key' => 'Client', 'placeholder' => '企業名・団体名'],
            ['key' => 'Project Type', 'placeholder' => '例: 撮影 / 映像制作'],
            ['key' => 'Role', 'placeholder' => ''], ['key' => 'Collaborators', 'placeholder' => ''],
        ]],
        ['name' => '出版・寄稿', 'fields' => [
            ['key' => 'Publication Type', 'placeholder' => '例: Free Paper / Book / Magazine'],
            ['key' => 'Publisher', 'placeholder' => ''], ['key' => 'Publication', 'placeholder' => '雑誌名・メディア名'],
            ['key' => 'Issue', 'placeholder' => '例: No.3'], ['key' => 'Published', 'placeholder' => '例: 2025.06.15'],
            ['key' => 'Pages', 'placeholder' => ''], ['key' => 'Binding', 'placeholder' => '例: ソフトカバー'],
            ['key' => 'Price', 'placeholder' => ''], ['key' => 'ISBN', 'placeholder' => ''],
            ['key' => 'Contribution', 'placeholder' => '例: Photography / Text'],
            ['key' => 'Base', 'placeholder' => '例: Sendai / Tokyo'],
        ]],
        ['name' => '作品', 'fields' => [
            ['key' => 'Medium', 'placeholder' => '例: Inkjet Print'], ['key' => 'Dimensions', 'placeholder' => '例: 1200 x 900 mm'],
            ['key' => 'Edition', 'placeholder' => '例: 1/5 + AP'], ['key' => 'Series', 'placeholder' => ''],
            ['key' => 'Duration', 'placeholder' => '映像の場合'], ['key' => 'Format', 'placeholder' => '例: 16mm / 4K'],
        ]],
        ['name' => 'クレジット', 'fields' => [
            ['key' => 'Photo', 'placeholder' => ''], ['key' => 'Design', 'placeholder' => ''],
            ['key' => 'Text', 'placeholder' => ''], ['key' => 'Sound', 'placeholder' => ''],
            ['key' => 'Video', 'placeholder' => ''], ['key' => 'Translation', 'placeholder' => ''],
            ['key' => 'Cooperation', 'placeholder' => ''],
        ]],
        ['name' => '実績・リンク', 'fields' => [
            ['key' => 'Award', 'placeholder' => ''], ['key' => 'Grant', 'placeholder' => '例: ○○財団助成金'],
            ['key' => 'Residency', 'placeholder' => ''], ['key' => 'Collection', 'placeholder' => '例: ○○美術館'],
            ['key' => 'URL', 'placeholder' => 'https://...'],
        ]],
    ];
}

// 既存データをキーでマッチング（大文字小文字無視）
$det_lower = [];
foreach ($details as $k => $v) {
    $det_lower[strtolower($k)] = $v;
}

// 標準キー収集（カスタム項目判定用）
$standard_keys_lower = [];
foreach ($standard_fields as $cat) {
    foreach ($cat['fields'] as $f) {
        $standard_keys_lower[strtolower($f['key'])] = true;
    }
}
$custom_details = [];
foreach ($details as $k => $v) {
    if (!isset($standard_keys_lower[strtolower($k)])) {
        $custom_details[$k] = $v;
    }
}

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
  <input type="hidden" name="_original_slug" value="<?= htmlspecialchars($row['slug'] ?? '', ENT_QUOTES) ?>">

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
                 >
          <p class="form-hint">URLに使われます（例: w001 → /works/w001/）</p>
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
      </div>

      <div class="form-group">
        <label class="form-label" for="tags-input">タグ</label>
        <input type="hidden" id="tags" name="tags" value="<?= $f_tags ?>">
        <div class="tag-chips" id="tag-chips"></div>
        <input type="text" id="tags-input" class="form-control" list="tag-suggestions"
               placeholder="タグを入力（Enterで追加）" autocomplete="off">
        <datalist id="tag-suggestions"></datalist>
      </div>

      <div class="form-group">
        <label class="form-label" for="excerpt">抜粋</label>
        <textarea id="excerpt" name="excerpt" class="form-control" rows="3"
                  placeholder="一覧ページに表示する短い説明"><?= $f_excerpt ?></textarea>
      </div>
    </div>

    <!-- ── 詳細情報 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">詳細情報</h3>
      <p class="form-hint">必要な項目だけ入力してください。空の項目はサイトに表示されません。</p>

      <?php
        // $standard_fields, $det_lower, $custom_details はファイル上部で定義済み
      ?>

      <?php foreach ($standard_fields as $cat):
        $cat_name = $cat['name'] ?? '';
        $cat_fields = $cat['fields'] ?? [];
        $has_value = false;
        foreach ($cat_fields as $f) {
            if (!empty($det_lower[strtolower($f['key'])])) { $has_value = true; break; }
        }
      ?>
      <details class="det-category" <?= $has_value ? 'open' : '' ?>>
        <summary class="det-category__summary">
          <span><?= htmlspecialchars($cat_name, ENT_QUOTES) ?></span>
          <?php if ($has_value): ?>
          <span class="det-category__badge">入力済み</span>
          <?php endif; ?>
        </summary>
        <div class="det-category__body">
          <?php foreach ($cat_fields as $f):
            $key = $f['key'];
            $ph  = $f['placeholder'] ?? '';
            $val = $det_lower[strtolower($key)] ?? '';
          ?>
          <div class="det-field">
            <div class="det-field__order">
              <button type="button" class="det-move-up" title="上に移動">▲</button>
              <button type="button" class="det-move-down" title="下に移動">▼</button>
            </div>
            <label class="det-field__label"><?= htmlspecialchars($key, ENT_QUOTES) ?></label>
            <input type="hidden" name="det_key[]" value="<?= htmlspecialchars($key, ENT_QUOTES) ?>">
            <input type="text" name="det_value[]" class="form-control"
                   value="<?= htmlspecialchars($val, ENT_QUOTES) ?>"
                   placeholder="<?= htmlspecialchars($ph, ENT_QUOTES) ?>">
          </div>
          <?php endforeach; ?>
        </div>
      </details>
      <?php endforeach; ?>

      <!-- カスタム項目（標準にないもの） -->
      <?php if (!empty($custom_details)): ?>
      <details class="det-category" open>
        <summary class="det-category__summary">
          <span>カスタム項目</span>
          <span class="det-category__badge"><?= count($custom_details) ?>件</span>
        </summary>
        <div class="det-category__body">
          <div id="det-custom-list">
          <?php foreach ($custom_details as $key => $val): ?>
          <div class="det-custom-row">
            <input type="text" name="det_key[]" class="form-control det-input-key" value="<?= htmlspecialchars($key, ENT_QUOTES) ?>" placeholder="項目名">
            <input type="text" name="det_value[]" class="form-control" value="<?= htmlspecialchars($val, ENT_QUOTES) ?>" placeholder="内容">
            <button type="button" class="det-row-remove" title="削除">✕</button>
          </div>
          <?php endforeach; ?>
          </div>
        </div>
      </details>
      <?php endif; ?>

      <!-- 項目追加UI -->
      <div class="det-add-panel" id="det-add-panel" style="display:none;">
        <div class="det-add-panel__row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">追加先カテゴリ</label>
            <select id="det-add-cat" class="form-control">
              <?php foreach ($standard_fields as $i => $cat): ?>
              <option value="<?= $i ?>"><?= htmlspecialchars($cat['name'], ENT_QUOTES) ?></option>
              <?php endforeach; ?>
              <option value="__new__">── 新しいカテゴリを作成 ──</option>
            </select>
          </div>
          <div class="form-group" id="det-new-cat-group" style="flex:1;display:none;">
            <label class="form-label">新カテゴリ名</label>
            <input type="text" id="det-new-cat-name" class="form-control" placeholder="例: 映像・上映">
          </div>
        </div>
        <div class="det-add-panel__row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">項目名</label>
            <input type="text" id="det-add-key" class="form-control" placeholder="例: Screening Date">
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">プレースホルダー（任意）</label>
            <input type="text" id="det-add-ph" class="form-control" placeholder="例: 2025.06.15">
          </div>
        </div>
        <div style="display:flex;gap:var(--s-2);">
          <button type="button" class="btn btn-sm btn-primary" id="det-add-confirm">追加</button>
          <button type="button" class="btn btn-sm btn-ghost" id="det-add-cancel">キャンセル</button>
          <label style="display:flex;align-items:center;gap:var(--s-2);margin-left:auto;font-size:var(--font-xs);color:var(--text-3);">
            <input type="checkbox" id="det-add-save-setting" checked>
            フィールド設定にも保存
          </label>
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="det-add-custom" style="margin-top:var(--s-2);">+ 項目を追加</button>
    </div>

    <!-- ── アイキャッチ画像 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">アイキャッチ画像</h3>
      <p class="form-hint">一覧ページのサムネイルに使われます。未指定の場合は作品画像の1枚目が自動で使われます。</p>
      <div style="display:flex;gap:var(--s-4);align-items:flex-start;">
        <div id="thumb-preview" style="flex-shrink:0;">
          <?php if (!empty($thumbnail['src'])): ?>
          <img src="<?= htmlspecialchars(fix_broken_unicode_url($thumbnail['src']), ENT_QUOTES) ?>" alt=""
               style="width:120px;height:80px;object-fit:cover;border-radius:4px;border:1px solid var(--border);">
          <?php else: ?>
          <div style="width:120px;height:80px;background:var(--surface);border-radius:4px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:var(--font-xs);">自動</div>
          <?php endif; ?>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:var(--s-2);">
          <input type="text" name="thumbnail_src" id="thumbnail-src" class="form-control"
                 value="<?= htmlspecialchars($thumbnail['src'] ?? '', ENT_QUOTES) ?>" placeholder="画像URLを入力 or アップロード">
          <input type="hidden" name="thumbnail_width" id="thumbnail-width" value="<?= (int)($thumbnail['width'] ?? 0) ?>">
          <input type="hidden" name="thumbnail_height" id="thumbnail-height" value="<?= (int)($thumbnail['height'] ?? 0) ?>">
          <div style="display:flex;gap:var(--s-2);">
            <label class="btn btn-sm btn-ghost">
              <input type="file" id="thumb-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
              アップロード
            </label>
            <button type="button" class="btn btn-sm btn-ghost" id="thumb-clear">クリア（自動に戻す）</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 作品画像（media） ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">作品画像</h3>
      <div id="media-list" class="dynamic-list">
        <?php foreach ($media as $i => $m): ?>
        <div class="dynamic-row dynamic-row--media">
          <div class="media-row-order">
            <button type="button" class="media-move-up" title="上に移動">▲</button>
            <span class="media-row-handle" title="ドラッグで並べ替え">⠿</span>
            <button type="button" class="media-move-down" title="下に移動">▼</button>
          </div>
          <div class="media-row-preview">
            <?php
              $preview_src = '';
              if (!empty($m['src'])) {
                  if (($m['type'] ?? '') === 'video' && str_contains($m['src'], 'youtube')) {
                      if (preg_match('/[?&]v=([^&]+)/', $m['src'], $ym)) {
                          $preview_src = 'https://img.youtube.com/vi/' . $ym[1] . '/hqdefault.jpg';
                      }
                  } else {
                      $preview_src = fix_broken_unicode_url($m['src']);
                  }
              }
            ?>
            <?php if ($preview_src): ?>
            <img src="<?= htmlspecialchars($preview_src, ENT_QUOTES) ?>" alt=""
                 style="width:80px;height:60px;object-fit:cover;border-radius:4px;">
            <?php endif; ?>
          </div>
          <div class="media-row-fields">
            <?php $m_type = ($m['type'] ?? 'image') === 'video' ? 'video' : 'image'; ?>
            <input type="hidden" name="media_id[]" value="<?= htmlspecialchars($m['id'] ?? '', ENT_QUOTES) ?>">
            <div class="form-row" style="margin-bottom:var(--s-2);">
              <div class="form-group" style="flex:0 0 auto;">
                <label class="form-label">タイプ</label>
                <select name="media_type[]" class="form-control media-type-select" style="width:120px;">
                  <option value="image"<?= $m_type === 'image' ? ' selected' : '' ?>>画像</option>
                  <option value="video"<?= $m_type === 'video' ? ' selected' : '' ?>>動画</option>
                </select>
              </div>
            </div>
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label media-src-label"><?= $m_type === 'video' ? '動画 URL (YouTube等)' : '画像 URL' ?></label>
                <input type="text" name="media_src[]" class="form-control"
                       data-upload-section="works" data-upload-slug="<?= $f_slug ?>"
                       value="<?= htmlspecialchars($m['src'] ?? '', ENT_QUOTES) ?>"
                       placeholder="<?= $m_type === 'video' ? 'https://www.youtube.com/watch?v=...' : '/uploads/...' ?>">
              </div>
              <div class="form-group">
                <label class="form-label">alt テキスト</label>
                <input type="text" name="media_alt[]" class="form-control"
                       value="<?= htmlspecialchars($m['alt'] ?? '', ENT_QUOTES) ?>">
              </div>
            </div>
            <div class="form-row media-poster-row" style="<?= $m_type === 'video' ? '' : 'display:none;' ?>">
              <div class="form-group" style="flex:1;">
                <label class="form-label">ポスター画像 URL（サムネイル。未入力ならYouTubeから自動取得）</label>
                <input type="text" name="media_poster[]" class="form-control"
                       value="<?= htmlspecialchars($m['poster'] ?? '', ENT_QUOTES) ?>"
                       placeholder="/media/works/...">
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
      <div class="media-add-actions">
        <label class="btn btn-sm btn-primary" id="media-upload-label">
          <input type="file" id="media-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
          + ファイルをアップロード
        </label>
        <button type="button" class="btn btn-sm btn-ghost" id="media-pick-from-library">+ メディアから選択</button>
        <button type="button" class="btn btn-sm btn-ghost" id="media-add">+ 空の行を追加</button>
      </div>
      <div class="media-drop-zone" id="media-drop-zone">
        <p style="color:var(--text-3);font-size:var(--font-sm);">画像をドラッグ＆ドロップでも追加できます</p>
      </div>
      <div class="media-upload-progress" id="media-progress" style="display:none;">
        <div class="media-upload-progress__info">
          <span id="progress-text">アップロード中…</span>
          <span id="progress-percent">0%</span>
        </div>
        <div class="media-upload-progress__track">
          <div class="media-upload-progress__fill" id="progress-fill"></div>
        </div>
      </div>
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
    <div class="media-row-order">
      <button type="button" class="media-move-up" title="上に移動">▲</button>
      <span class="media-row-handle" title="ドラッグで並べ替え">⠿</span>
      <button type="button" class="media-move-down" title="下に移動">▼</button>
    </div>
    <div class="media-row-preview"></div>
    <div class="media-row-fields">
      <input type="hidden" name="media_id[]" value="">
      <div class="form-row" style="margin-bottom:var(--s-2);">
        <div class="form-group" style="flex:0 0 auto;">
          <label class="form-label">タイプ</label>
          <select name="media_type[]" class="form-control media-type-select" style="width:120px;">
            <option value="image">画像</option>
            <option value="video">動画</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label media-src-label">画像 URL</label>
          <input type="text" name="media_src[]" class="form-control"
                 data-upload-section="works" data-upload-slug="" placeholder="/uploads/...">
        </div>
        <div class="form-group">
          <label class="form-label">alt テキスト</label>
          <input type="text" name="media_alt[]" class="form-control">
        </div>
      </div>
      <div class="form-row media-poster-row" style="display:none;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">ポスター画像 URL（サムネイル。未入力ならYouTubeから自動取得）</label>
          <input type="text" name="media_poster[]" class="form-control" placeholder="/media/works/...">
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

<!-- メディアライブラリモーダル -->
<div class="modal-backdrop" id="media-library-modal" style="display:none">
  <div class="modal" style="width:min(900px,95vw);max-height:85vh;display:flex;flex-direction:column;">
    <div class="modal__header">
      <h3 class="modal__title">メディアライブラリ</h3>
      <button type="button" class="modal__close" id="media-lib-close">✕</button>
    </div>
    <div class="modal__body" style="overflow-y:auto;flex:1;">
      <div style="padding:0 0 var(--s-3);display:flex;gap:var(--s-2);">
        <input type="text" id="media-lib-search" class="form-control form-control--sm" placeholder="検索（ファイル名・スラッグ）" style="flex:1;">
        <select id="media-lib-section" class="form-control form-control--sm" style="width:150px;">
          <option value="">すべて</option>
          <option value="works">works</option>
          <option value="me-no-hoshi">me-no-hoshi</option>
          <option value="garden">garden</option>
          <option value="about">about</option>
          <option value="news">news</option>
        </select>
      </div>
      <div class="media-lib-grid" id="media-lib-grid"></div>
      <div id="media-lib-loading" style="text-align:center;padding:var(--s-8);color:var(--text-3);">読み込み中…</div>
    </div>
  </div>
</div>

<style>
.media-add-actions { display:flex; gap:var(--s-3); flex-wrap:wrap; margin-top:var(--s-3); }
.media-drop-zone {
  margin-top:var(--s-3); padding:var(--s-4); text-align:center;
  border:2px dashed var(--border); border-radius:var(--radius); transition:border-color var(--transition);
}
.media-drop-zone.is-dragover { border-color:var(--accent); background:var(--accent-bg); }
.media-lib-grid {
  display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:var(--s-2);
}
.media-lib-item {
  aspect-ratio:1; overflow:hidden; border-radius:var(--radius); cursor:pointer;
  border:2px solid transparent; transition:border-color var(--transition);
}
.media-lib-item:hover { border-color:var(--accent); }
.media-lib-item.is-selected { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent-bg); }
.media-lib-item img { width:100%; height:100%; object-fit:cover; display:block; }

.media-upload-progress {
  margin-top:var(--s-3); padding:var(--s-3) var(--s-4);
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
}
.media-upload-progress__info {
  display:flex; justify-content:space-between; align-items:center;
  font-size:var(--font-sm); color:var(--text-2); margin-bottom:var(--s-2);
}
.media-upload-progress__track {
  height:4px; background:var(--border); border-radius:2px; overflow:hidden;
}
.media-upload-progress__fill {
  height:100%; background:var(--accent); width:0%; transition:width 0.2s ease;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const list   = document.getElementById('media-list');
  const addBtn = document.getElementById('media-add');
  const tpl    = document.getElementById('tpl-media-row');
  const slug   = '<?= addslashes($f_slug) ?>';
  const csrf   = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

  // ── フォーム送信前: 並べ替え結果を反映 ──
  // 標準フィールドの hidden input の value を、DOMの順序に合わせて更新する
  // （hidden input は各 .det-field 内に既に存在するのでDOMの順序通りに送信される）

  // ── アイキャッチ画像 ──
  {
    const thumbInput = document.getElementById('thumbnail-src');
    const thumbWidth = document.getElementById('thumbnail-width');
    const thumbHeight = document.getElementById('thumbnail-height');
    const thumbPreview = document.getElementById('thumb-preview');
    const thumbUpload = document.getElementById('thumb-upload-input');
    const thumbClear = document.getElementById('thumb-clear');

    if (thumbUpload) {
      thumbUpload.addEventListener('change', async function() {
        const file = this.files?.[0];
        if (!file) return;
        this.value = '';
        try {
          const result = await upload_image_to_api(file, 'works', slug);
          thumbInput.value = result.url;
          thumbWidth.value = result.width;
          thumbHeight.value = result.height;
          thumbPreview.innerHTML = `<img src="${result.url}" alt="" style="width:120px;height:80px;object-fit:cover;border-radius:4px;border:1px solid var(--border);">`;
          show_toast('アイキャッチをアップロードしました', 'success');
        } catch (err) {
          show_toast(err.message, 'error');
        }
      });
    }

    if (thumbClear) {
      thumbClear.addEventListener('click', () => {
        thumbInput.value = '';
        thumbWidth.value = '0';
        thumbHeight.value = '0';
        thumbPreview.innerHTML = '<div style="width:120px;height:80px;background:var(--surface);border-radius:4px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:var(--font-xs);">自動</div>';
      });
    }
  }

  // ── タグ入力（チップ + 候補） ──
  {
    const hiddenInput = document.getElementById('tags');
    const chipsEl = document.getElementById('tag-chips');
    const tagInput = document.getElementById('tags-input');
    const datalist = document.getElementById('tag-suggestions');

    let tags = hiddenInput.value ? hiddenInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];

    function syncHidden() {
      hiddenInput.value = tags.join(', ');
    }

    function renderChips() {
      chipsEl.innerHTML = '';
      tags.forEach((tag, i) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${esc(tag)}<button type="button" class="tag-chip__remove" data-index="${i}">✕</button>`;
        chipsEl.appendChild(chip);
      });
    }

    chipsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.tag-chip__remove');
      if (btn) {
        tags.splice(parseInt(btn.dataset.index), 1);
        syncHidden();
        renderChips();
      }
    });

    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = tagInput.value.trim().replace(/,/g, '');
        if (val && !tags.includes(val)) {
          tags.push(val);
          syncHidden();
          renderChips();
        }
        tagInput.value = '';
      }
    });

    // フォーカスアウトでも追加
    tagInput.addEventListener('blur', () => {
      const val = tagInput.value.trim().replace(/,/g, '');
      if (val && !tags.includes(val)) {
        tags.push(val);
        syncHidden();
        renderChips();
      }
      tagInput.value = '';
    });

    // 候補を取得
    fetch('../api/works.php?tags=1')
      .then(r => r.json())
      .then(suggestions => {
        if (Array.isArray(suggestions)) {
          suggestions.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            datalist.appendChild(opt);
          });
        }
      })
      .catch(() => {});

    renderChips();
  }

  // ── 項目追加（カテゴリ選択 + 新規カテゴリ + 設定保存） ──
  {
    const addBtn     = document.getElementById('det-add-custom');
    const panel      = document.getElementById('det-add-panel');
    const catSelect  = document.getElementById('det-add-cat');
    const newCatGrp  = document.getElementById('det-new-cat-group');
    const newCatName = document.getElementById('det-new-cat-name');
    const keyInput   = document.getElementById('det-add-key');
    const phInput    = document.getElementById('det-add-ph');
    const confirmBtn = document.getElementById('det-add-confirm');
    const cancelBtn  = document.getElementById('det-add-cancel');
    const saveCheck  = document.getElementById('det-add-save-setting');

    addBtn.addEventListener('click', () => {
      panel.style.display = '';
      addBtn.style.display = 'none';
      keyInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      addBtn.style.display = '';
    });

    catSelect.addEventListener('change', () => {
      newCatGrp.style.display = catSelect.value === '__new__' ? '' : 'none';
    });

    confirmBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) { show_toast('項目名を入力してください', 'error'); return; }

      const catIdx = catSelect.value;
      let targetBody;

      if (catIdx === '__new__') {
        // 新しいカテゴリを作成
        const catName = newCatName.value.trim();
        if (!catName) { show_toast('カテゴリ名を入力してください', 'error'); return; }

        const detailsSection = document.querySelector('.form-section:has(#det-add-panel)');
        const newCat = document.createElement('details');
        newCat.className = 'det-category';
        newCat.open = true;
        newCat.innerHTML = `
          <summary class="det-category__summary"><span>${esc(catName)}</span></summary>
          <div class="det-category__body"></div>
        `;
        // カスタム項目セクションの前に挿入
        const customSection = detailsSection.querySelector('#det-add-panel');
        customSection.parentNode.insertBefore(newCat, customSection);
        targetBody = newCat.querySelector('.det-category__body');
      } else {
        // 既存カテゴリに追加
        const allCats = document.querySelectorAll('.det-category');
        const cat = allCats[parseInt(catIdx)];
        if (cat) {
          cat.open = true;
          targetBody = cat.querySelector('.det-category__body');
        }
      }

      if (targetBody) {
        const field = document.createElement('div');
        field.className = 'det-field';
        field.innerHTML = `
          <div class="det-field__order">
            <button type="button" class="det-move-up" title="上に移動">▲</button>
            <button type="button" class="det-move-down" title="下に移動">▼</button>
          </div>
          <label class="det-field__label">${esc(key)}</label>
          <input type="hidden" name="det_key[]" value="${esc(key)}">
          <input type="text" name="det_value[]" class="form-control" placeholder="${esc(phInput.value.trim())}">
        `;
        targetBody.appendChild(field);
      }

      // フィールド設定にも保存（設定APIを叩く）
      if (saveCheck.checked) {
        try {
          const settingsRes = await fetch('../api/settings.php?key=works_detail_fields');
          const current = await settingsRes.json() || [];
          const fields = Array.isArray(current) ? current : [];

          if (catIdx === '__new__') {
            fields.push({ name: newCatName.value.trim(), fields: [{ key, placeholder: phInput.value.trim() }] });
          } else {
            const idx = parseInt(catIdx);
            if (fields[idx]) {
              fields[idx].fields.push({ key, placeholder: phInput.value.trim() });
            }
          }

          await fetch('../api/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body: JSON.stringify({ key: 'works_detail_fields', value: fields }),
          });
          show_toast('項目を追加し、設定にも保存しました', 'success');
        } catch {
          show_toast('項目は追加しましたが、設定への保存に失敗しました', 'warning');
        }
      } else {
        show_toast('項目を追加しました（この投稿のみ）', 'success');
      }

      // リセット
      keyInput.value = '';
      phInput.value = '';
      newCatName.value = '';
      panel.style.display = 'none';
      addBtn.style.display = '';
    });

    // フィールドの並べ替え + カスタム行の削除
    document.addEventListener('click', (e) => {
      const up = e.target.closest('.det-move-up');
      const down = e.target.closest('.det-move-down');
      if (up) {
        const field = up.closest('.det-field');
        const prev = field.previousElementSibling;
        if (prev && prev.classList.contains('det-field')) prev.before(field);
      }
      if (down) {
        const field = down.closest('.det-field');
        const next = field.nextElementSibling;
        if (next && next.classList.contains('det-field')) next.after(field);
      }
      if (e.target.closest('.det-row-remove')) {
        e.target.closest('.det-custom-row')?.remove();
      }
    });
  }

  // ── メディア行の並べ替え（ボタン式 + ハンドルドラッグ） ──
  {
    // 上下ボタンで移動
    list.addEventListener('click', (e) => {
      const upBtn = e.target.closest('.media-move-up');
      const downBtn = e.target.closest('.media-move-down');
      if (upBtn) {
        const row = upBtn.closest('.dynamic-row--media');
        const prev = row.previousElementSibling;
        if (prev) prev.before(row);
      }
      if (downBtn) {
        const row = downBtn.closest('.dynamic-row--media');
        const next = row.nextElementSibling;
        if (next) next.after(row);
      }
    });

    // ハンドルからのドラッグ
    let dragged = null;
    list.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.media-row-handle')) return;
      const row = e.target.closest('.dynamic-row--media');
      if (row) row.setAttribute('draggable', 'true');
    });
    list.addEventListener('dragstart', (e) => {
      const row = e.target.closest('.dynamic-row--media');
      if (!row) return;
      dragged = row;
      row.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    list.addEventListener('dragend', () => {
      if (dragged) { dragged.style.opacity = ''; dragged.removeAttribute('draggable'); }
      list.querySelectorAll('.is-drag-over').forEach(r => r.classList.remove('is-drag-over'));
      dragged = null;
    });
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const row = e.target.closest('.dynamic-row--media');
      if (row && row !== dragged) {
        list.querySelectorAll('.is-drag-over').forEach(r => r.classList.remove('is-drag-over'));
        row.classList.add('is-drag-over');
      }
    });
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('.dynamic-row--media');
      if (!target || !dragged || target === dragged) return;
      const rows = [...list.querySelectorAll('.dynamic-row--media')];
      if (rows.indexOf(dragged) < rows.indexOf(target)) target.after(dragged);
      else target.before(dragged);
      target.classList.remove('is-drag-over');
    });
  }

  // メディアタイプ切替: ラベル・ポスター欄・プレースホルダーを更新
  function applyMediaType(row, type) {
    const srcLabel   = row.querySelector('.media-src-label');
    const srcInput   = row.querySelector('[name="media_src[]"]');
    const posterRow  = row.querySelector('.media-poster-row');
    if (type === 'video') {
      if (srcLabel)  srcLabel.textContent  = '動画 URL (YouTube等)';
      if (srcInput)  srcInput.placeholder  = 'https://www.youtube.com/watch?v=...';
      if (posterRow) posterRow.style.display = '';
    } else {
      if (srcLabel)  srcLabel.textContent  = '画像 URL';
      if (srcInput)  srcInput.placeholder  = '/uploads/...';
      if (posterRow) posterRow.style.display = 'none';
    }
  }

  // 既存行・新規行共通: タイプセレクター変更イベント
  list.addEventListener('change', (e) => {
    const sel = e.target.closest('.media-type-select');
    if (!sel) return;
    applyMediaType(sel.closest('.dynamic-row'), sel.value);
  });

  // HTMLエスケープ
  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // 行追加ヘルパー
  function addMediaRow(src, alt, width, height, id) {
    const clone = tpl.content.cloneNode(true);
    clone.querySelectorAll('[data-upload-section]').forEach(el => el.dataset.uploadSlug = slug);
    const row = clone.querySelector('.dynamic-row') || clone.firstElementChild;
    if (src) {
      row.querySelector('[name="media_src[]"]').value = src;
      row.querySelector('[name="media_alt[]"]').value = alt || '';
      row.querySelector('[name="media_width[]"]').value = width || 0;
      row.querySelector('[name="media_height[]"]').value = height || 0;
      row.querySelector('[name="media_id[]"]').value = id || 'media-' + Date.now();
      // プレビュー
      const preview = row.querySelector('.media-row-preview');
      if (preview && src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.style.cssText = 'width:80px;height:60px;object-fit:cover;border-radius:4px;';
        preview.appendChild(img);
      }
    }
    list.appendChild(clone);
    init_upload_fields(list.lastElementChild);
  }

  // 空の行を追加
  if (addBtn) addBtn.addEventListener('click', () => addMediaRow('', '', 0, 0, ''));

  // 行削除
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.dynamic-remove');
    if (btn) btn.closest('.dynamic-row')?.remove();
  });

  // ── 複数ファイルアップロード ──
  const uploadInput = document.getElementById('media-upload-input');
  if (uploadInput) {
    uploadInput.addEventListener('change', async () => {
      const files = Array.from(uploadInput.files);
      if (!files.length) return;
      uploadInput.value = '';
      await uploadFiles(files);
    });
  }

  const progressEl   = document.getElementById('media-progress');
  const progressText = document.getElementById('progress-text');
  const progressPct  = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');

  function uploadWithProgress(file, section, fileSlug) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('section', section);
      if (fileSlug) fd.append('slug', fileSlug);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '../api/media.php');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('X-CSRF-Token', csrf);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round(e.loaded / e.total * 100);
          progressPct.textContent = pct + '%';
          progressFill.style.width = pct + '%';
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && !data.error) {
            resolve(data.data || data);
          } else {
            reject(new Error(data.error || 'アップロード失敗'));
          }
        } catch { reject(new Error('レスポンスの解析に失敗')); }
      });
      xhr.addEventListener('error', () => reject(new Error('通信エラー')));
      xhr.send(fd);
    });
  }

  async function uploadFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    progressEl.style.display = '';
    let done = 0;

    for (const file of imageFiles) {
      progressText.textContent = `${done + 1} / ${imageFiles.length}: ${file.name}`;
      progressPct.textContent = '0%';
      progressFill.style.width = '0%';

      try {
        const result = await uploadWithProgress(file, 'works', slug);
        addMediaRow(result.url, '', result.width, result.height, 'media-' + Date.now());
        show_toast(file.name + ' をアップロードしました', 'success');
      } catch (err) {
        show_toast(file.name + ': ' + err.message, 'error');
      }
      done++;
    }

    progressText.textContent = `${done} 件のアップロード完了`;
    progressPct.textContent = '100%';
    progressFill.style.width = '100%';
    setTimeout(() => { progressEl.style.display = 'none'; }, 2000);
  }

  // ── ドラッグ＆ドロップ ──
  const dropZone = document.getElementById('media-drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('is-dragover');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length) await uploadFiles(files);
    });
  }

  // ── メディアライブラリから選択 ──
  const libBtn   = document.getElementById('media-pick-from-library');
  const libModal = document.getElementById('media-library-modal');
  const libGrid  = document.getElementById('media-lib-grid');
  const libLoad  = document.getElementById('media-lib-loading');
  const libClose = document.getElementById('media-lib-close');

  if (libBtn && libModal) {
    const LIB_PER_PAGE = 60;
    let libOffset = 0;
    let libTotal = 0;
    const libPrev = document.createElement('button');
    const libNext = document.createElement('button');
    const libPageInfo = document.createElement('span');
    libPrev.className = 'btn btn-sm btn-ghost';
    libNext.className = 'btn btn-sm btn-ghost';
    libPrev.textContent = '← 前へ';
    libNext.textContent = '次へ →';
    libPageInfo.style.cssText = 'font-size:var(--font-sm);color:var(--text-3);';

    const libSearch = document.getElementById('media-lib-search');
    const libSectionFilter = document.getElementById('media-lib-section');
    let libSearchTimer = null;

    async function loadLibrary(offset) {
      libOffset = offset;
      libGrid.innerHTML = '';
      libLoad.style.display = '';
      libLoad.textContent = '読み込み中…';

      try {
        const params = new URLSearchParams({ limit: LIB_PER_PAGE, offset });
        const q = libSearch?.value?.trim();
        if (q) params.set('q', q);
        const sec = libSectionFilter?.value;
        if (sec) params.set('section', sec);
        const res = await fetch(`../api/media.php?${params}`);
        const data = await res.json();
        const items = data.items || [];
        libTotal = data.total || 0;
        libLoad.style.display = 'none';

        items.forEach(item => {
          const fullUrl = '<?= UPLOAD_URL_PREFIX ?>' + item.path;
          const dir = item.path.substring(0, item.path.lastIndexOf('/') + 1);
          const thumbUrl = '<?= UPLOAD_URL_PREFIX ?>' + dir + 'thumb_' + item.filename + '.webp';
          const div = document.createElement('div');
          div.className = 'media-lib-item';
          div.innerHTML = `<img src="${esc(thumbUrl)}" alt="" loading="lazy"
            onerror="this.src='${esc(fullUrl)}'">`;
          div.addEventListener('click', () => {
            addMediaRow(fullUrl, '', item.width || 0, item.height || 0, 'media-' + Date.now());
            show_toast('画像を追加しました', 'success');
          });
          libGrid.appendChild(div);
        });

        if (!items.length) {
          libLoad.style.display = '';
          libLoad.textContent = 'メディアがありません';
        }

        // ページネーション更新
        const page = Math.floor(offset / LIB_PER_PAGE) + 1;
        const pages = Math.ceil(libTotal / LIB_PER_PAGE);
        libPageInfo.textContent = `${page} / ${pages}（${libTotal}件）`;
        libPrev.disabled = offset === 0;
        libNext.disabled = offset + LIB_PER_PAGE >= libTotal;
      } catch {
        libLoad.textContent = '読み込みに失敗しました';
      }
    }

    libBtn.addEventListener('click', () => {
      libModal.style.display = '';
      requestAnimationFrame(() => libModal.classList.add('is-visible'));
      // ページネーションUIを追加
      let pager = libModal.querySelector('.media-lib-pager');
      if (!pager) {
        pager = document.createElement('div');
        pager.className = 'media-lib-pager';
        pager.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:var(--s-4);padding:var(--s-3);';
        pager.append(libPrev, libPageInfo, libNext);
        libModal.querySelector('.modal__body').appendChild(pager);
      }
      loadLibrary(0);
    });

    libPrev.addEventListener('click', () => loadLibrary(Math.max(0, libOffset - LIB_PER_PAGE)));
    libNext.addEventListener('click', () => loadLibrary(libOffset + LIB_PER_PAGE));
    if (libSearch) {
      libSearch.addEventListener('input', () => {
        clearTimeout(libSearchTimer);
        libSearchTimer = setTimeout(() => loadLibrary(0), 300);
      });
    }
    if (libSectionFilter) {
      libSectionFilter.addEventListener('change', () => loadLibrary(0));
    }

    function closeLibrary() {
      libModal.classList.remove('is-visible');
      setTimeout(() => { libModal.style.display = 'none'; }, 200);
    }
    libClose.addEventListener('click', closeLibrary);
    libModal.addEventListener('click', (e) => { if (e.target === libModal) closeLibrary(); });
  }

  // 削除ボタン
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
