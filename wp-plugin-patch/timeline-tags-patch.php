/**
 * Timeline タグ機能 — WP プラグイン修正パッチ
 *
 * class-rest-timeline.php の以下2箇所を修正する:
 *
 * ===== 1. create_item() に追加 =====
 * $params['tags'] を受け取り、post_meta に保存する。
 * 投稿作成処理の後（$post_id が確定した後）に以下を追加:
 */

// create_item() 内、$post_id 確定後に追加:
if ( ! empty( $params['tags'] ) && is_array( $params['tags'] ) ) {
    $tags = array_map( 'sanitize_text_field', $params['tags'] );
    $tags = array_values( array_filter( $tags ) );
    update_post_meta( $post_id, 'hayato_timeline_tags', $tags );
}

/**
 * ===== 2. format_post() に追加 =====
 * レスポンスに tags フィールドを含める。
 * $result 配列を構築している箇所に以下を追加:
 */

// format_post() 内、$result 配列に追加:
$tags = get_post_meta( $post->ID, 'hayato_timeline_tags', true );
if ( is_array( $tags ) && ! empty( $tags ) ) {
    $result['tags'] = $tags;
} else {
    $result['tags'] = array();
}
