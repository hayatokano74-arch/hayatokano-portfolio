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

        // details: 動的キー・バリューペア
        $det_keys   = $_POST['det_key']   ?? [];
        $det_values = $_POST['det_value'] ?? [];
        $details = [];
        foreach ($det_keys as $i => $k) {
            $k = trim($k);
            $v = trim($det_values[$i] ?? '');
            if ($k === '' && $v === '') continue; // 空行はスキップ
            $details[$k ?: '_blank_' . $i] = $v;
        }

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
            $original_slug = trim($_POST['_original_slug'] ?? '');
            $existing = $original_slug ? db_find_by_slug('works', $original_slug) : null;

            if ($existing) {
                // 既存レコードを更新（スラッグ変更にも対応）
                $stmt = $db->prepare("UPDATE works SET slug=?, title=?, date=?, year=?, tags=?, excerpt=?, pinned=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$slug, $title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json, $original_slug]);
            } else {
                // 新規作成
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
$media   = $data['media']   ?? [];

// 詳細情報をカテゴリ別に整理
$det_categories = [
    '展示・イベント' => [
        ['exhibition_type',   '形式',         '例: Solo Exhibition / Group Exhibition / Art Festival'],
        ['exhibition_title',  '展覧会名',     '展覧会・芸術祭・フェア名（作品タイトルと異なる場合）'],
        ['artist',            'アーティスト', ''],
        ['artists',           '出展作家',     'グループ展の場合（カンマ区切り）'],
        ['period',            '会期',         '例: 2023.04.08 - 2023.06.04'],
        ['venue',             '会場',         '例: Glvanize gallery'],
        ['address',           '住所',         ''],
        ['access',            'アクセス',     '例: JR石巻駅より徒歩10分'],
        ['hours',             '開場時間',     '例: 12:00 - 18:00'],
        ['closed',            '休廊日',       '例: 月・火・水'],
        ['admission',         '入場料',       '例: 無料'],
        ['organizer',         '主催',         ''],
        ['curator',           'キュレーター', ''],
        ['supported_by',      '後援・協賛',   ''],
    ],
    'クライアント・コミッション' => [
        ['client',            'クライアント', '企業名・団体名'],
        ['project_type',      '案件種別',     '例: 撮影 / 映像制作 / デザイン / ディレクション'],
        ['role',              '担当',         '例: 撮影 / ディレクション / 企画'],
        ['collaborators',     '協働者',       ''],
    ],
    '出版・寄稿' => [
        ['publisher',         '出版社',       ''],
        ['publication_title', '掲載誌名',     '寄稿先の雑誌名・ウェブメディア名'],
        ['isbn',              'ISBN',         ''],
        ['pages',             'ページ数',     ''],
        ['binding',           '製本',         '例: ソフトカバー / ハードカバー'],
        ['price',             '価格',         '例: ¥3,000+tax'],
        ['contribution_type', '寄稿種別',     '例: 写真 / テキスト / インタビュー / 書評'],
    ],
    '作品情報' => [
        ['medium',            '素材・技法',   '例: Inkjet Print, Lenticular Lens'],
        ['dimensions',        'サイズ',       '例: 1200 x 900 mm'],
        ['edition',           'エディション', '例: 1/5 + AP'],
        ['series',            'シリーズ名',   ''],
        ['duration',          '上映時間',     '例: 12分30秒（映像作品の場合）'],
        ['format',            'フォーマット', '例: 16mm / 4K / シングルチャンネル'],
    ],
    'クレジット' => [
        ['credit_photo',      '写真',         ''],
        ['credit_design',     'デザイン',     ''],
        ['credit_text',       'テキスト',     ''],
        ['credit_sound',      '音響',         ''],
        ['credit_video',      '映像',         ''],
        ['credit_translation','翻訳',         ''],
        ['credit_cooperation','協力',         ''],
    ],
    '実績・その他' => [
        ['award',             '受賞',         ''],
        ['grant',             '助成',         '例: ○○財団助成金'],
        ['residency',         'レジデンス',   '例: ○○アーティスト・イン・レジデンス（2024）'],
        ['collection',        '所蔵',         '例: ○○美術館'],
        ['url',               'ウェブサイト', 'https://...'],
        ['related_url',       '関連リンク',   '記事・レビュー等のURL'],
    ],
];

// 全フィールドのキーを収集
$all_det_keys = [];
foreach ($det_categories as $fields) {
    foreach ($fields as [$key]) {
        $all_det_keys[] = $key;
    }
}

$f_det = [];
foreach ($all_det_keys as $key) {
    $f_det[$key] = htmlspecialchars($details[$key] ?? '', ENT_QUOTES);
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

    <!-- ── 詳細情報 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">詳細情報</h3>
      <p class="form-hint">必要な項目だけ入力してください。空の項目はサイトに表示されません。</p>

      <?php
        // 標準項目の定義（カテゴリ別）
        $standard_fields = [
            '展示・イベント' => [
                'Type'         => '例: Solo Exhibition / Group Exhibition / Art Festival',
                'Artist'       => '',
                'Artists'      => 'グループ展の場合（カンマ区切り）',
                'Period'       => '例: 2023.04.08 - 2023.06.04',
                'Venue'        => '',
                'Address'      => '',
                'Access'       => '',
                'Hours'        => '例: 12:00 - 18:00',
                'Closed'       => '例: 月・火・水',
                'Admission'    => '例: 無料',
                'Organizer'    => '',
                'Curator'      => '',
                'Supported by' => '',
            ],
            'クライアント' => [
                'Client'       => '企業名・団体名',
                'Project Type' => '例: 撮影 / 映像制作 / ディレクション',
                'Role'         => '',
                'Collaborators'=> '',
            ],
            '出版・寄稿' => [
                'Publisher'    => '',
                'Publication'  => '雑誌名・メディア名',
                'Issue'        => '例: No.3 / Vol.12',
                'Published'    => '例: 2025.06.15',
                'Pages'        => '',
                'Binding'      => '例: ソフトカバー',
                'Price'        => '',
                'ISBN'         => '',
                'Contribution' => '例: Photography / Text / Interview',
            ],
            '作品' => [
                'Medium'       => '例: Inkjet Print, Lenticular Lens',
                'Dimensions'   => '例: 1200 x 900 mm',
                'Edition'      => '例: 1/5 + AP',
                'Series'       => '',
                'Duration'     => '映像の場合（例: 12分30秒）',
                'Format'       => '例: 16mm / 4K / シングルチャンネル',
            ],
            'クレジット' => [
                'Photo'        => '',
                'Design'       => '',
                'Text'         => '',
                'Sound'        => '',
                'Video'        => '',
                'Translation'  => '',
                'Cooperation'  => '',
            ],
            '実績・リンク' => [
                'Award'        => '',
                'Grant'        => '例: ○○財団助成金',
                'Residency'    => '',
                'Collection'   => '例: ○○美術館',
                'URL'          => 'https://...',
                'Base'         => '例: Sendai / Tokyo',
            ],
        ];

        // 既存データをキーの大文字小文字無視でマッチング
        $det_lower = [];
        foreach ($details as $k => $v) {
            $det_lower[strtolower($k)] = $v;
        }

        // 標準項目にない既存のカスタムキーを収集
        $standard_keys_lower = [];
        foreach ($standard_fields as $fields) {
            foreach ($fields as $key => $ph) {
                $standard_keys_lower[strtolower($key)] = true;
            }
        }
        $custom_details = [];
        foreach ($details as $k => $v) {
            if (!isset($standard_keys_lower[strtolower($k)])) {
                $custom_details[$k] = $v;
            }
        }
      ?>

      <?php foreach ($standard_fields as $cat_label => $fields):
        $has_value = false;
        foreach ($fields as $key => $ph) {
            if (!empty($det_lower[strtolower($key)])) { $has_value = true; break; }
        }
      ?>
      <details class="det-category" <?= $has_value ? 'open' : '' ?>>
        <summary class="det-category__summary">
          <span><?= $cat_label ?></span>
          <?php if ($has_value): ?>
          <span class="det-category__badge">入力済み</span>
          <?php endif; ?>
        </summary>
        <div class="det-category__body">
          <?php foreach ($fields as $key => $ph):
            $val = $det_lower[strtolower($key)] ?? '';
          ?>
          <div class="det-field">
            <label class="det-field__label"><?= $key ?></label>
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

      <!-- カスタム項目追加 -->
      <div id="det-custom-area">
        <div id="det-custom-list-new"></div>
      </div>
      <button type="button" class="btn btn-sm btn-ghost" id="det-add-custom" style="margin-top:var(--s-2);">+ カスタム項目を追加</button>
    </div>

    <!-- ── 作品画像（media） ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">作品画像</h3>
      <p class="form-hint">先頭の画像がサムネイルになります。</p>
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

<!-- メディアライブラリモーダル -->
<div class="modal-backdrop" id="media-library-modal" style="display:none">
  <div class="modal" style="width:min(900px,95vw);max-height:85vh;display:flex;flex-direction:column;">
    <div class="modal__header">
      <h3 class="modal__title">メディアライブラリ</h3>
      <button type="button" class="modal__close" id="media-lib-close">✕</button>
    </div>
    <div class="modal__body" style="overflow-y:auto;flex:1;">
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

  // ── カスタム項目の追加・削除 ──
  {
    const customList = document.getElementById('det-custom-list-new');
    const addBtn = document.getElementById('det-add-custom');

    addBtn.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'det-custom-row';
      row.innerHTML = `
        <input type="text" name="det_key[]" class="form-control" placeholder="項目名">
        <input type="text" name="det_value[]" class="form-control" placeholder="内容">
        <button type="button" class="det-row-remove" title="削除">✕</button>
      `;
      customList.appendChild(row);
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.det-row-remove')) {
        e.target.closest('.det-custom-row').remove();
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

    async function loadLibrary(offset) {
      libOffset = offset;
      libGrid.innerHTML = '';
      libLoad.style.display = '';
      libLoad.textContent = '読み込み中…';

      try {
        const res = await fetch(`../api/media.php?limit=${LIB_PER_PAGE}&offset=${offset}`);
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
