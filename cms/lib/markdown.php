<?php
/**
 * Markdown → HTML 変換
 *
 * Garden のコンテンツ用。以下を処理する:
 *   - 画像: ![alt](url) → <img>
 *   - ブラケットリンク: [[テキスト]] → <a class="garden-link">
 *   - ハッシュタグ: #タグ → <a class="garden-hashtag">
 *   - 太字: **text** → <strong>
 *   - イタリック: *text* → <em>
 *   - リンク: [text](url) → <a>
 *   - 段落: 空行で分割 → <p>
 *   - 改行: 行末 → <br>
 *
 * HTMLが既に含まれている場合（Quillエディタで作成）はそのまま返す。
 */

function markdown_to_html(string $body): string {
    $body = trim($body);
    if ($body === '') return '';

    // HTMLタグが含まれていればQuillエディタで作成済み → そのまま返す
    // ただし画像のmarkdownだけが混在している場合は処理する
    if (preg_match('/<(?:p|div|h[1-6]|ul|ol|blockquote|table)\b/i', $body)) {
        // HTML内の残存マークダウン画像を変換
        $body = convert_markdown_images($body);
        // HTML内のブラケットリンクを変換
        $body = convert_bracket_links($body);
        return $body;
    }

    // 純粋なMarkdown → HTML変換

    // 画像
    $body = convert_markdown_images($body);

    // ブラケットリンク [[テキスト]]
    $body = convert_bracket_links($body);

    // ハッシュタグ #タグ
    $body = preg_replace(
        '/(?<=\s|^)#([\p{L}\p{N}_]+)/u',
        '<a href="/garden/$1" class="garden-hashtag">#$1</a>',
        $body
    );

    // 太字 **text**
    $body = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $body);

    // イタリック *text*（太字の後に処理）
    $body = preg_replace('/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s', '<em>$1</em>', $body);

    // リンク [text](url)
    $body = preg_replace(
        '/\[([^\]]+)\]\(([^)]+)\)/',
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        $body
    );

    // 段落: 空行で分割
    $paragraphs = preg_split('/\n{2,}/', $body);
    $html_parts = [];
    foreach ($paragraphs as $p) {
        $p = trim($p);
        if ($p === '') continue;
        // 既にブロック要素（<img>, <div>等）で始まる場合はpで囲まない
        if (preg_match('/^<(?:img|div|figure|picture|blockquote|ul|ol|h[1-6]|table|hr)\b/i', $p)) {
            $html_parts[] = $p;
        } else {
            // 行内改行を<br>に
            $p = preg_replace('/\n/', '<br>', $p);
            $html_parts[] = '<p>' . $p . '</p>';
        }
    }

    return implode("\n", $html_parts);
}

/** ![alt](url) → <img> */
function convert_markdown_images(string $body): string {
    return preg_replace_callback(
        '/!\[([^\]]*)\]\(([^)]+)\)/',
        function ($m) {
            $alt = htmlspecialchars($m[1], ENT_QUOTES);
            $src = htmlspecialchars($m[2], ENT_QUOTES);
            return '<img src="' . $src . '" alt="' . $alt . '" '
                 . 'loading="lazy" style="max-width:100%;height:auto;display:block;'
                 . 'margin:var(--space-5,20px) 0;border-radius:4px;" '
                 . 'class="garden-img loaded">';
        },
        $body
    );
}

/** [[テキスト]] → <a class="garden-link"> */
function convert_bracket_links(string $body): string {
    return preg_replace_callback(
        '/\[\[([^\]]+)\]\]/',
        function ($m) {
            $text = $m[1];
            $slug = title_to_slug($text);
            $href = '/garden/' . rawurlencode($slug) . '/';
            return '<a href="' . htmlspecialchars($href, ENT_QUOTES) . '" class="garden-link">'
                 . htmlspecialchars($text, ENT_QUOTES) . '</a>';
        },
        $body
    );
}

/** タイトル → slug（JS の titleToSlug と同じロジック） */
function title_to_slug(string $title): string {
    $s = mb_strtolower(trim($title), 'UTF-8');
    $s = preg_replace('/\s+/', '-', $s);
    // Unicode letter/number/hyphen以外を削除
    $s = preg_replace('/[^\p{L}\p{N}\-]/u', '', $s);
    $s = preg_replace('/-+/', '-', $s);
    return trim($s, '-');
}
