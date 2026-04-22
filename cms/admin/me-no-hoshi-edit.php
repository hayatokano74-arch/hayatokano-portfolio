<?php
// 目の星 編集

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
                $db->prepare("DELETE FROM me_no_hoshi WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/me-no-hoshi.php'));
            exit;
        }

        $slug     = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title    = trim($_POST['title'] ?? '');
        $subtitle = trim($_POST['subtitle'] ?? '');
        $date     = trim($_POST['date'] ?? '');
        $year     = trim($_POST['year'] ?? '');
        $bio      = trim($_POST['bio'] ?? '');
        $body     = trim($_POST['body'] ?? '');
        $excerpt  = trim($_POST['excerpt'] ?? '');

        $tags_raw  = trim($_POST['tags'] ?? '');
        $tags      = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
        $tags_json = json_encode($tags, JSON_UNESCAPED_UNICODE);

        // トグル
        $show_key_visuals    = isset($_POST['showKeyVisuals'])    ? true : false;
        $show_past_works     = isset($_POST['showPastWorks'])     ? true : false;
        $show_archive_works  = isset($_POST['showArchiveWorks'])  ? true : false;

        // details（key/label/value の動的行）
        $det_keys   = $_POST['detail_key']   ?? [];
        $det_labels = $_POST['detail_label'] ?? [];
        $det_values = $_POST['detail_value'] ?? [];
        $details    = [];
        foreach ($det_keys as $i => $k) {
            $k = trim($k);
            if ($k === '') continue;
            $details[] = [
                'key'   => $k,
                'label' => trim($det_labels[$i] ?? ''),
                'value' => trim($det_values[$i] ?? ''),
            ];
        }

        // media（サムネイル画像配列）
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

        // keyVisuals
        $kv_ids      = $_POST['kv_id']      ?? [];
        $kv_captions = $_POST['kv_caption'] ?? [];
        $kv_srcs     = $_POST['kv_src']     ?? [];
        $kv_alts     = $_POST['kv_alt']     ?? [];
        $kv_widths   = $_POST['kv_width']   ?? [];
        $kv_heights  = $_POST['kv_height']  ?? [];
        $key_visuals = [];
        foreach ($kv_srcs as $i => $src) {
            $src = trim($src);
            if ($src === '') continue;
            $key_visuals[] = [
                'id'      => trim($kv_ids[$i] ?? ('kv-' . ($i + 1))),
                'caption' => trim($kv_captions[$i] ?? ''),
                'image'   => [
                    'src'    => $src,
                    'alt'    => trim($kv_alts[$i] ?? ''),
                    'width'  => (int)($kv_widths[$i] ?? 0),
                    'height' => (int)($kv_heights[$i] ?? 0),
                ],
            ];
        }

        // pastWorks
        $pw_ids     = $_POST['pw_id']     ?? [];
        $pw_titles  = $_POST['pw_title']  ?? [];
        $pw_years   = $_POST['pw_year']   ?? [];
        $pw_srcs    = $_POST['pw_src']    ?? [];
        $pw_alts    = $_POST['pw_alt']    ?? [];
        $pw_widths  = $_POST['pw_width']  ?? [];
        $pw_heights = $_POST['pw_height'] ?? [];
        $past_works = [];
        foreach ($pw_titles as $i => $pt) {
            $pt = trim($pt);
            if ($pt === '' && trim($pw_srcs[$i] ?? '') === '') continue;
            $past_works[] = [
                'id'    => trim($pw_ids[$i] ?? ('past-' . ($i + 1))),
                'title' => $pt,
                'year'  => trim($pw_years[$i] ?? ''),
                'image' => [
                    'src'    => trim($pw_srcs[$i] ?? ''),
                    'alt'    => trim($pw_alts[$i] ?? ''),
                    'width'  => (int)($pw_widths[$i] ?? 0),
                    'height' => (int)($pw_heights[$i] ?? 0),
                ],
            ];
        }

        // pastExhibitions（年, 情報の動的行）
        $pe_years = $_POST['pe_year'] ?? [];
        $pe_infos = $_POST['pe_info'] ?? [];
        $past_exhibitions = [];
        foreach ($pe_years as $i => $py) {
            $py   = trim($py);
            $info = trim($pe_infos[$i] ?? '');
            if ($py === '' && $info === '') continue;
            $past_exhibitions[] = ['year' => $py, 'info' => $info];
        }

        $data_arr = [
            'subtitle'          => $subtitle,
            'showKeyVisuals'    => $show_key_visuals,
            'showPastWorks'     => $show_past_works,
            'showArchiveWorks'  => $show_archive_works,
            'details'           => $details,
            'media'             => $media,
            'keyVisuals'        => $key_visuals,
            'pastWorks'         => $past_works,
            'pastExhibitions'   => $past_exhibitions,
            'bio'               => $bio,
        ];
        $data_json = json_encode($data_arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('me_no_hoshi', $slug);
            if ($existing) {
                $stmt = $db->prepare("UPDATE me_no_hoshi SET title=?, date=?, year=?, tags=?, excerpt=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$title, $date, $year, $tags_json, $excerpt, $body, $data_json, $slug]);
            } else {
                $stmt = $db->prepare("INSERT INTO me_no_hoshi (slug, title, date, year, tags, excerpt, body, data) VALUES (?,?,?,?,?,?,?,?)");
                $stmt->execute([$slug, $title, $date, $year, $tags_json, $excerpt, $body, $data_json]);
            }
            header('Location: ' . cms_url('/admin/me-no-hoshi.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $row = [
        'slug' => '', 'title' => '', 'date' => date('Y-m-d'), 'year' => date('Y'),
        'tags' => '[]', 'body' => '', 'data' => '{}',
    ];
} elseif ($slug_param) {
    $row = db_find_by_slug('me_no_hoshi', $slug_param);
    if (!$row) {
        $errors[] = '指定された目の星エントリが見つかりません。';
        $row = ['slug' => $slug_param, 'title' => '', 'date' => '', 'year' => '', 'tags' => '[]', 'body' => '', 'data' => '{}'];
    }
} else {
    header('Location: ' . cms_url('/admin/me-no-hoshi.php'));
    exit;
}

// フォーム用データの準備
$f_slug     = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_title    = htmlspecialchars($row['title'] ?? '', ENT_QUOTES);
$f_date     = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_year     = htmlspecialchars($row['year'] ?? '', ENT_QUOTES);
$f_body     = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);
$f_excerpt  = htmlspecialchars($row['excerpt'] ?? '', ENT_QUOTES);

$tags_decoded = json_decode($row['tags'] ?? '[]', true);
$tags_arr     = is_array($tags_decoded) ? $tags_decoded : [];
$f_tags   = htmlspecialchars(implode(', ', $tags_arr), ENT_QUOTES);

$data     = json_decode($row['data'] ?? '{}', true) ?? [];
$f_sub    = htmlspecialchars($data['subtitle'] ?? '', ENT_QUOTES);
$f_bio    = htmlspecialchars($data['bio'] ?? '', ENT_QUOTES);
$f_show_kv   = !empty($data['showKeyVisuals']);
$f_show_pw   = !empty($data['showPastWorks']);
$f_show_aw   = !empty($data['showArchiveWorks']);
$f_details   = $data['details']   ?? [];
$f_media     = $data['media']     ?? [];
$f_kv        = $data['keyVisuals']      ?? [];
$f_pw        = $data['pastWorks']       ?? [];
$f_pe        = $data['pastExhibitions'] ?? [];

$page_title = $is_new ? '目の星 新規追加' : '目の星 編集: ' . ($row['title'] ?: $row['slug']);
$active_nav = 'me-no-hoshi';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="mnh-form">
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
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="title">展示タイトル <span class="required">*</span></label>
        <input type="text" id="title" name="title" class="form-control" value="<?= $f_title ?>" required placeholder="展示名">
      </div>

      <div class="form-group">
        <label class="form-label" for="subtitle">サブタイトル</label>
        <input type="text" id="subtitle" name="subtitle" class="form-control" value="<?= $f_sub ?>" placeholder="副題・英題など">
      </div>

      <div class="form-group">
        <label class="form-label" for="excerpt">抜粋（リスト表示用）</label>
        <textarea id="excerpt" name="excerpt" class="form-control" rows="3"
                  placeholder="一覧ページに表示する短い紹介文。空欄の場合はステートメントの冒頭が自動表示されます。"><?= $f_excerpt ?></textarea>
        <p class="form-hint">HTMLタグ不要。プレーンテキストで入力してください。</p>
      </div>

      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="year">年</label>
          <input type="text" id="year" name="year" class="form-control" value="<?= $f_year ?>" placeholder="例: 2025">
        </div>
        <div class="form-group">
          <label class="form-label" for="tags">タグ（カンマ区切り）</label>
          <input type="text" id="tags" name="tags" class="form-control" value="<?= $f_tags ?>" placeholder="例: Exhibition, Photography">
        </div>
      </div>
    </div>

    <!-- ── 展示情報（details） ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">展示情報</h3>
      <p class="form-hint">PERIOD / OPEN / HOURS / ADDRESS / ARTIST など。行を追加・削除できます。</p>

      <div id="details-list" class="dynamic-list">
        <?php foreach ($f_details as $i => $d): ?>
        <div class="dynamic-row" data-index="<?= $i ?>">
          <div class="form-row form-row--3col">
            <div class="form-group">
              <label class="form-label">KEY</label>
              <input type="text" name="detail_key[]" class="form-control"
                     value="<?= htmlspecialchars($d['key'] ?? '', ENT_QUOTES) ?>"
                     placeholder="例: period">
            </div>
            <div class="form-group">
              <label class="form-label">ラベル（表示名）</label>
              <input type="text" name="detail_label[]" class="form-control"
                     value="<?= htmlspecialchars($d['label'] ?? '', ENT_QUOTES) ?>"
                     placeholder="例: PERIOD">
            </div>
            <div class="form-group">
              <label class="form-label">値</label>
              <input type="text" name="detail_value[]" class="form-control"
                     value="<?= htmlspecialchars($d['value'] ?? '', ENT_QUOTES) ?>"
                     placeholder="例: 2025.10.04 – 2026.01.11">
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-ghost dynamic-remove" title="この行を削除">✕</button>
        </div>
        <?php endforeach; ?>
        <?php if (empty($f_details)): ?>
        <?php foreach (['artist' => ['ARTIST', ''], 'period' => ['PERIOD', ''], 'open_date' => ['OPEN', ''], 'hours' => ['HOURS', ''], 'venue' => ['VENUE', ''], 'address' => ['ADDRESS', '']] as $k => [$lbl, $val]): ?>
        <div class="dynamic-row">
          <div class="form-row form-row--3col">
            <div class="form-group">
              <label class="form-label">KEY</label>
              <input type="text" name="detail_key[]" class="form-control" value="<?= $k ?>">
            </div>
            <div class="form-group">
              <label class="form-label">ラベル（表示名）</label>
              <input type="text" name="detail_label[]" class="form-control" value="<?= $lbl ?>">
            </div>
            <div class="form-group">
              <label class="form-label">値</label>
              <input type="text" name="detail_value[]" class="form-control" value="">
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-ghost dynamic-remove" title="この行を削除">✕</button>
        </div>
        <?php endforeach; ?>
        <?php endif; ?>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="details-add">+ 行を追加</button>
    </div>

    <!-- ── 表示設定 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">表示設定</h3>
      <div class="toggle-group">
        <label class="toggle-label">
          <input type="checkbox" name="showKeyVisuals" <?= $f_show_kv ? 'checked' : '' ?>>
          <span>キービジュアルを表示</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" name="showPastWorks" <?= $f_show_pw ? 'checked' : '' ?>>
          <span>過去作品を表示</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" name="showArchiveWorks" <?= $f_show_aw ? 'checked' : '' ?>>
          <span>アーカイブ作品を表示</span>
        </label>
      </div>
    </div>

    <!-- ── サムネイル（media[0]） ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">サムネイル画像（一覧・OGP用）</h3>
      <div id="media-list" class="dynamic-list">
        <?php foreach ($f_media as $i => $m): ?>
        <div class="dynamic-row dynamic-row--media">
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
            <img src="<?= htmlspecialchars($preview_src, ENT_QUOTES) ?>" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:4px;">
            <?php endif; ?>
          </div>
          <div class="media-row-fields">
            <input type="hidden" name="media_id[]"     value="<?= htmlspecialchars($m['id'] ?? '', ENT_QUOTES) ?>">
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">画像 URL</label>
                <input type="text" name="media_src[]" class="form-control media-src-input"
                       value="<?= htmlspecialchars($m['src'] ?? '', ENT_QUOTES) ?>"
                       placeholder="/uploads/..."
                       data-upload-section="me-no-hoshi" data-upload-slug="<?= $f_slug ?>">
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
                <input type="number" name="media_width[]"  class="form-control" value="<?= (int)($m['width'] ?? 0) ?>" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">高さ (px)</label>
                <input type="number" name="media_height[]" class="form-control" value="<?= (int)($m['height'] ?? 0) ?>" min="0">
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
        <label class="btn btn-sm btn-primary">
          <input type="file" id="mnh-media-upload" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
          + ファイルをアップロード
        </label>
        <button type="button" class="btn btn-sm btn-ghost" id="mnh-media-pick">+ メディアから選択</button>
        <button type="button" class="btn btn-sm btn-ghost" id="media-add">+ 空の行を追加</button>
      </div>
    </div>

    <!-- ── キービジュアル ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">キービジュアル</h3>
      <div id="kv-list" class="dynamic-list">
        <?php foreach ($f_kv as $i => $kv): ?>
        <?php $img = $kv['image'] ?? []; ?>
        <div class="dynamic-row dynamic-row--media">
          <div class="media-row-preview">
            <?php if (!empty($img['src'])): ?>
            <img src="<?= htmlspecialchars($img['src'], ENT_QUOTES) ?>" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:4px;">
            <?php endif; ?>
          </div>
          <div class="media-row-fields">
            <input type="hidden" name="kv_id[]" value="<?= htmlspecialchars($kv['id'] ?? '', ENT_QUOTES) ?>">
            <div class="form-group">
              <label class="form-label">キャプション</label>
              <input type="text" name="kv_caption[]" class="form-control"
                     value="<?= htmlspecialchars($kv['caption'] ?? '', ENT_QUOTES) ?>"
                     placeholder="キャプション（任意）">
            </div>
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">画像 URL</label>
                <input type="text" name="kv_src[]" class="form-control"
                       value="<?= htmlspecialchars($img['src'] ?? '', ENT_QUOTES) ?>" placeholder="/uploads/..."
                       data-upload-section="me-no-hoshi" data-upload-slug="<?= $f_slug ?>">
              </div>
              <div class="form-group">
                <label class="form-label">alt</label>
                <input type="text" name="kv_alt[]" class="form-control"
                       value="<?= htmlspecialchars($img['alt'] ?? '', ENT_QUOTES) ?>">
              </div>
            </div>
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">幅 (px)</label>
                <input type="number" name="kv_width[]"  class="form-control" value="<?= (int)($img['width'] ?? 0) ?>" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">高さ (px)</label>
                <input type="number" name="kv_height[]" class="form-control" value="<?= (int)($img['height'] ?? 0) ?>" min="0">
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
        <label class="btn btn-sm btn-primary">
          <input type="file" id="mnh-kv-upload" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          + ファイルをアップロード
        </label>
        <button type="button" class="btn btn-sm btn-ghost" id="mnh-kv-pick">+ メディアから選択</button>
        <button type="button" class="btn btn-sm btn-ghost" id="kv-add">+ 空の行を追加</button>
      </div>
    </div>

    <!-- ── 過去作品 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">過去作品 (PAST WORKS)</h3>
      <div id="pw-list" class="dynamic-list">
        <?php foreach ($f_pw as $i => $pw): ?>
        <?php $img = $pw['image'] ?? []; ?>
        <div class="dynamic-row dynamic-row--media">
          <div class="media-row-preview">
            <?php if (!empty($img['src'])): ?>
            <img src="<?= htmlspecialchars($img['src'], ENT_QUOTES) ?>" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:4px;">
            <?php endif; ?>
          </div>
          <div class="media-row-fields">
            <input type="hidden" name="pw_id[]" value="<?= htmlspecialchars($pw['id'] ?? '', ENT_QUOTES) ?>">
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">作品タイトル</label>
                <input type="text" name="pw_title[]" class="form-control"
                       value="<?= htmlspecialchars($pw['title'] ?? '', ENT_QUOTES) ?>" placeholder="作品名">
              </div>
              <div class="form-group">
                <label class="form-label">年</label>
                <input type="text" name="pw_year[]" class="form-control"
                       value="<?= htmlspecialchars($pw['year'] ?? '', ENT_QUOTES) ?>" placeholder="2024">
              </div>
            </div>
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">画像 URL</label>
                <input type="text" name="pw_src[]" class="form-control"
                       value="<?= htmlspecialchars($img['src'] ?? '', ENT_QUOTES) ?>" placeholder="/uploads/..."
                       data-upload-section="me-no-hoshi" data-upload-slug="<?= $f_slug ?>">
              </div>
              <div class="form-group">
                <label class="form-label">alt</label>
                <input type="text" name="pw_alt[]" class="form-control"
                       value="<?= htmlspecialchars($img['alt'] ?? '', ENT_QUOTES) ?>">
              </div>
            </div>
            <div class="form-row form-row--2col">
              <div class="form-group">
                <label class="form-label">幅 (px)</label>
                <input type="number" name="pw_width[]"  class="form-control" value="<?= (int)($img['width'] ?? 0) ?>" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">高さ (px)</label>
                <input type="number" name="pw_height[]" class="form-control" value="<?= (int)($img['height'] ?? 0) ?>" min="0">
              </div>
            </div>
          </div>
          <div class="media-row-actions">
            <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="pw-add">+ 過去作品を追加</button>
    </div>

    <!-- ── 過去の展示 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">過去の展示</h3>
      <div id="pe-list" class="dynamic-list">
        <?php foreach ($f_pe as $pe): ?>
        <div class="dynamic-row">
          <div class="form-row form-row--2col" style="flex:1">
            <div class="form-group">
              <label class="form-label">年</label>
              <input type="text" name="pe_year[]" class="form-control"
                     value="<?= htmlspecialchars($pe['year'] ?? '', ENT_QUOTES) ?>" placeholder="例: 2024">
            </div>
            <div class="form-group">
              <label class="form-label">展示情報</label>
              <input type="text" name="pe_info[]" class="form-control"
                     value="<?= htmlspecialchars($pe['info'] ?? '', ENT_QUOTES) ?>" placeholder="例: 「展示名」会場名">
            </div>
          </div>
          <div class="media-row-actions">
            <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="pe-add">+ 展示を追加</button>
    </div>

    <!-- ── アーティストプロフィール ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">アーティストプロフィール (Bio)</h3>
      <div class="form-group">
        <textarea id="bio" name="bio" class="form-control" rows="5"
                  data-rich-editor
                  placeholder="アーティストのプロフィール文"><?= $f_bio ?></textarea>
      </div>
    </div>

    <!-- ── 本文 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">ステートメント / 本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="10"
                  data-rich-editor
                  placeholder="展示ステートメントや説明文"><?= $f_body ?></textarea>
      </div>
    </div>

  </div><!-- /.form-grid -->

  <div class="form-actions">
    <a href="<?= cms_url('/admin/me-no-hoshi.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger"
            data-delete
            data-message="「<?= htmlspecialchars($row['title'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。"
            data-form-action="delete"
            data-form-id="mnh-form">削除</button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<!-- メディアライブラリモーダル -->
<div class="modal-backdrop" id="mnh-media-library-modal" style="display:none">
  <div class="modal" style="width:min(900px,95vw);max-height:85vh;display:flex;flex-direction:column;">
    <div class="modal__header">
      <h3 class="modal__title">メディアライブラリ</h3>
      <button type="button" class="modal__close" id="mnh-media-lib-close">✕</button>
    </div>
    <div class="modal__body" style="overflow-y:auto;flex:1;">
      <div style="padding:0 0 var(--s-3);display:flex;gap:var(--s-2);">
        <input type="text" id="mnh-media-lib-search" class="form-control form-control--sm" placeholder="検索" style="flex:1;">
        <select id="mnh-media-lib-section" class="form-control form-control--sm" style="width:150px;">
          <option value="">すべて</option>
          <option value="works">works</option>
          <option value="me-no-hoshi" selected>me-no-hoshi</option>
          <option value="garden">garden</option>
          <option value="about">about</option>
        </select>
      </div>
      <div class="media-lib-grid" id="mnh-media-lib-grid"></div>
      <div id="mnh-media-lib-loading" style="text-align:center;padding:var(--s-8);color:var(--text-3);">読み込み中…</div>
    </div>
  </div>
</div>

<style>
.media-lib-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px,1fr)); gap:var(--s-2); }
.media-lib-item { aspect-ratio:1; overflow:hidden; border-radius:var(--radius); cursor:pointer; border:2px solid transparent; transition:border-color var(--transition); }
.media-lib-item:hover { border-color:var(--accent); }
.media-lib-item img { width:100%; height:100%; object-fit:cover; display:block; }
.media-add-actions { display:flex; gap:var(--s-3); flex-wrap:wrap; margin-top:var(--s-3); }
</style>

<!-- 動的行テンプレート -->
<template id="tpl-detail-row">
  <div class="dynamic-row">
    <div class="form-row form-row--3col">
      <div class="form-group">
        <label class="form-label">KEY</label>
        <input type="text" name="detail_key[]" class="form-control" placeholder="例: venue">
      </div>
      <div class="form-group">
        <label class="form-label">ラベル（表示名）</label>
        <input type="text" name="detail_label[]" class="form-control" placeholder="例: VENUE">
      </div>
      <div class="form-group">
        <label class="form-label">値</label>
        <input type="text" name="detail_value[]" class="form-control" placeholder="値">
      </div>
    </div>
    <button type="button" class="btn btn-sm btn-ghost dynamic-remove" title="削除">✕</button>
  </div>
</template>

<template id="tpl-media-row">
  <div class="dynamic-row dynamic-row--media">
    <div class="media-row-preview"></div>
    <div class="media-row-fields">
      <input type="hidden" name="media_id[]" value="">
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">画像 URL</label>
          <input type="text" name="media_src[]" class="form-control" placeholder="/uploads/..."
                 data-upload-section="me-no-hoshi" data-upload-slug="">
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

<template id="tpl-kv-row">
  <div class="dynamic-row dynamic-row--media">
    <div class="media-row-preview"></div>
    <div class="media-row-fields">
      <input type="hidden" name="kv_id[]" value="">
      <div class="form-group">
        <label class="form-label">キャプション</label>
        <input type="text" name="kv_caption[]" class="form-control" placeholder="キャプション（任意）">
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">画像 URL</label>
          <input type="text" name="kv_src[]" class="form-control" placeholder="/uploads/..."
                 data-upload-section="me-no-hoshi" data-upload-slug="">
        </div>
        <div class="form-group">
          <label class="form-label">alt</label>
          <input type="text" name="kv_alt[]" class="form-control">
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">幅 (px)</label>
          <input type="number" name="kv_width[]" class="form-control" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">高さ (px)</label>
          <input type="number" name="kv_height[]" class="form-control" value="0" min="0">
        </div>
      </div>
    </div>
    <div class="media-row-actions">
      <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
    </div>
  </div>
</template>

<template id="tpl-pw-row">
  <div class="dynamic-row dynamic-row--media">
    <div class="media-row-preview"></div>
    <div class="media-row-fields">
      <input type="hidden" name="pw_id[]" value="">
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">作品タイトル</label>
          <input type="text" name="pw_title[]" class="form-control" placeholder="作品名">
        </div>
        <div class="form-group">
          <label class="form-label">年</label>
          <input type="text" name="pw_year[]" class="form-control" placeholder="2024">
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">画像 URL</label>
          <input type="text" name="pw_src[]" class="form-control" placeholder="/uploads/..."
                 data-upload-section="me-no-hoshi" data-upload-slug="">
        </div>
        <div class="form-group">
          <label class="form-label">alt</label>
          <input type="text" name="pw_alt[]" class="form-control">
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label">幅 (px)</label>
          <input type="number" name="pw_width[]" class="form-control" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">高さ (px)</label>
          <input type="number" name="pw_height[]" class="form-control" value="0" min="0">
        </div>
      </div>
    </div>
    <div class="media-row-actions">
      <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
    </div>
  </div>
</template>

<template id="tpl-pe-row">
  <div class="dynamic-row">
    <div class="form-row form-row--2col" style="flex:1">
      <div class="form-group">
        <label class="form-label">年</label>
        <input type="text" name="pe_year[]" class="form-control" placeholder="例: 2024">
      </div>
      <div class="form-group">
        <label class="form-label">展示情報</label>
        <input type="text" name="pe_info[]" class="form-control" placeholder="例: 「展示名」会場名">
      </div>
    </div>
    <div class="media-row-actions">
      <button type="button" class="btn btn-sm btn-ghost dynamic-remove">✕</button>
    </div>
  </div>
</template>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // 汎用: 動的行の追加・削除
  // 現在のスラッグ（アップロード用）
  const current_slug = '<?= addslashes($row['slug'] ?? '') ?>';

  function init_dynamic_list(listId, addBtnId, templateId) {
    const list   = document.getElementById(listId);
    const addBtn = document.getElementById(addBtnId);
    const tpl    = document.getElementById(templateId);
    if (!list || !addBtn || !tpl) return;

    addBtn.addEventListener('click', () => {
      const clone = tpl.content.cloneNode(true);
      list.appendChild(clone);
      const added = list.lastElementChild;
      // 新規行のアップロード入力にスラッグをセット
      added.querySelectorAll('[data-upload-slug]').forEach(el => {
        el.dataset.uploadSlug = current_slug;
      });
      if (typeof init_upload_fields === 'function') init_upload_fields(added);
    });

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.dynamic-remove');
      if (!btn) return;
      btn.closest('.dynamic-row')?.remove();
    });
  }

  init_dynamic_list('details-list', 'details-add', 'tpl-detail-row');
  init_dynamic_list('media-list',   'media-add',   'tpl-media-row');
  init_dynamic_list('kv-list',      'kv-add',      'tpl-kv-row');
  init_dynamic_list('pw-list',      'pw-add',      'tpl-pw-row');
  init_dynamic_list('pe-list',      'pe-add',      'tpl-pe-row');

  // ── 画像アップロード + メディアライブラリ ──
  const mnhSlug = '<?= addslashes($row['slug'] ?? '') ?>';
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ヘルパー: メディア行に画像URLを設定
  function setMediaSrc(list, url, width, height) {
    const rows = list.querySelectorAll('.dynamic-row');
    const last = rows[rows.length - 1];
    if (last) {
      const srcInput = last.querySelector('[name="media_src[]"], [name="kv_image_src[]"]');
      if (srcInput) srcInput.value = url;
      const wInput = last.querySelector('[name="media_width[]"], [name="kv_image_width[]"]');
      if (wInput) wInput.value = width;
      const hInput = last.querySelector('[name="media_height[]"], [name="kv_image_height[]"]');
      if (hInput) hInput.value = height;
    }
  }

  // メディアアップロード
  function setupUpload(inputId, listId, addBtnId, section) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', async function() {
      const files = Array.from(this.files || []);
      this.value = '';
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try {
          const result = await upload_image_to_api(file, section, mnhSlug);
          document.getElementById(addBtnId)?.click();
          const list = document.getElementById(listId);
          setMediaSrc(list, result.url, result.width, result.height);
          show_toast(file.name + ' をアップロードしました', 'success');
        } catch (err) {
          show_toast(file.name + ': ' + err.message, 'error');
        }
      }
    });
  }

  setupUpload('mnh-media-upload', 'media-list', 'media-add', 'me-no-hoshi');
  setupUpload('mnh-kv-upload', 'kv-list', 'kv-add', 'me-no-hoshi');

  // メディアライブラリモーダル
  const mnhLibModal = document.getElementById('mnh-media-library-modal');
  const mnhLibGrid = document.getElementById('mnh-media-lib-grid');
  const mnhLibLoad = document.getElementById('mnh-media-lib-loading');
  const mnhLibClose = document.getElementById('mnh-media-lib-close');
  const mnhLibSearch = document.getElementById('mnh-media-lib-search');
  const mnhLibSection = document.getElementById('mnh-media-lib-section');
  const LIB_PER_PAGE = 60;
  let mnhLibOffset = 0;
  let mnhLibTarget = null; // { listId, addBtnId }

  const mnhLibPrev = document.createElement('button');
  const mnhLibNext = document.createElement('button');
  const mnhLibPageInfo = document.createElement('span');
  mnhLibPrev.className = 'btn btn-sm btn-ghost';
  mnhLibNext.className = 'btn btn-sm btn-ghost';
  mnhLibPrev.textContent = '← 前へ';
  mnhLibNext.textContent = '次へ →';
  mnhLibPageInfo.style.cssText = 'font-size:var(--font-sm);color:var(--text-3);';

  async function mnhLoadLibrary(offset) {
    mnhLibOffset = offset;
    mnhLibGrid.innerHTML = '';
    mnhLibLoad.style.display = '';
    mnhLibLoad.textContent = '読み込み中…';

    const params = new URLSearchParams({ limit: LIB_PER_PAGE, offset });
    const q = mnhLibSearch?.value?.trim();
    if (q) params.set('q', q);
    const sec = mnhLibSection?.value;
    if (sec) params.set('section', sec);

    try {
      const res = await fetch(`../api/media.php?${params}`);
      const data = await res.json();
      const items = data.items || [];
      const total = data.total || 0;
      mnhLibLoad.style.display = 'none';

      items.forEach(item => {
        const fullUrl = '<?= UPLOAD_URL_PREFIX ?>' + item.path;
        const dir = item.path.substring(0, item.path.lastIndexOf('/') + 1);
        const thumbUrl = '<?= UPLOAD_URL_PREFIX ?>' + dir + 'thumb_' + item.filename + '.webp';
        const div = document.createElement('div');
        div.className = 'media-lib-item';
        div.innerHTML = `<img src="${esc(thumbUrl)}" alt="" loading="lazy" onerror="this.src='${esc(fullUrl)}'">`;
        div.addEventListener('click', () => {
          if (mnhLibTarget) {
            document.getElementById(mnhLibTarget.addBtnId)?.click();
            const list = document.getElementById(mnhLibTarget.listId);
            setMediaSrc(list, fullUrl, item.width || 0, item.height || 0);
            show_toast('画像を追加しました', 'success');
          }
        });
        mnhLibGrid.appendChild(div);
      });

      if (!items.length) {
        mnhLibLoad.style.display = '';
        mnhLibLoad.textContent = 'メディアがありません';
      }

      const page = Math.floor(offset / LIB_PER_PAGE) + 1;
      const pages = Math.ceil(total / LIB_PER_PAGE);
      mnhLibPageInfo.textContent = `${page} / ${pages}（${total}件）`;
      mnhLibPrev.disabled = offset === 0;
      mnhLibNext.disabled = offset + LIB_PER_PAGE >= total;
    } catch {
      mnhLibLoad.textContent = '読み込みに失敗しました';
    }
  }

  // ページネーション追加
  let mnhPager = mnhLibModal?.querySelector('.media-lib-pager');
  if (!mnhPager && mnhLibModal) {
    mnhPager = document.createElement('div');
    mnhPager.className = 'media-lib-pager';
    mnhPager.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:var(--s-4);padding:var(--s-3);';
    mnhPager.append(mnhLibPrev, mnhLibPageInfo, mnhLibNext);
    mnhLibModal.querySelector('.modal__body')?.appendChild(mnhPager);
  }

  mnhLibPrev.addEventListener('click', () => mnhLoadLibrary(Math.max(0, mnhLibOffset - LIB_PER_PAGE)));
  mnhLibNext.addEventListener('click', () => mnhLoadLibrary(mnhLibOffset + LIB_PER_PAGE));
  if (mnhLibSearch) mnhLibSearch.addEventListener('input', () => { clearTimeout(mnhLibSearch._t); mnhLibSearch._t = setTimeout(() => mnhLoadLibrary(0), 300); });
  if (mnhLibSection) mnhLibSection.addEventListener('change', () => mnhLoadLibrary(0));

  function openMnhLibrary(listId, addBtnId) {
    mnhLibTarget = { listId, addBtnId };
    mnhLibModal.style.display = '';
    requestAnimationFrame(() => mnhLibModal.classList.add('is-visible'));
    mnhLoadLibrary(0);
  }

  function closeMnhLibrary() {
    mnhLibModal.classList.remove('is-visible');
    setTimeout(() => { mnhLibModal.style.display = 'none'; }, 200);
  }

  if (mnhLibClose) mnhLibClose.addEventListener('click', closeMnhLibrary);
  if (mnhLibModal) mnhLibModal.addEventListener('click', (e) => { if (e.target === mnhLibModal) closeMnhLibrary(); });

  document.getElementById('mnh-media-pick')?.addEventListener('click', () => openMnhLibrary('media-list', 'media-add'));
  document.getElementById('mnh-kv-pick')?.addEventListener('click', () => openMnhLibrary('kv-list', 'kv-add'));

  // 削除ボタン
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message || '削除しますか？', () => {
        const form = document.getElementById('mnh-form');
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
