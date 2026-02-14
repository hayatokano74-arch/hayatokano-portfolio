/**
 * Timeline 削除・下書き機能 — WP プラグイン修正パッチ
 *
 * class-rest-timeline.php に以下を追加する:
 *
 * ===== 1. register_routes() に DELETE ルート追加 =====
 */

// register_routes() 内に追加:
register_rest_route( 'hayato/v1', '/timeline/(?P<id>\d+)', array(
    array(
        'methods'             => 'DELETE',
        'callback'            => array( $this, 'delete_item' ),
        'permission_callback' => array( $this, 'check_permission' ),
        'args'                => array(
            'id' => array(
                'required'          => true,
                'validate_callback' => function( $param ) {
                    return is_numeric( $param );
                },
            ),
        ),
    ),
) );

// register_routes() 内に追加（下書き一覧）:
register_rest_route( 'hayato/v1', '/timeline/drafts', array(
    array(
        'methods'             => 'GET',
        'callback'            => array( $this, 'get_drafts' ),
        'permission_callback' => array( $this, 'check_permission' ),
    ),
) );

/**
 * ===== 2. delete_item() メソッドを追加 =====
 */

public function delete_item( $request ) {
    $post_id = (int) $request['id'];
    $post    = get_post( $post_id );

    if ( ! $post || $post->post_type !== 'hayato_timeline' ) {
        return new WP_Error( 'not_found', '投稿が見つかりません', array( 'status' => 404 ) );
    }

    $result = wp_delete_post( $post_id, true ); // true = 完全削除（ゴミ箱を経由しない）

    if ( ! $result ) {
        return new WP_Error( 'delete_failed', '削除に失敗しました', array( 'status' => 500 ) );
    }

    return rest_ensure_response( array( 'ok' => true, 'deleted' => $post_id ) );
}

/**
 * ===== 3. get_drafts() メソッドを追加 =====
 */

public function get_drafts( $request ) {
    $posts = get_posts( array(
        'post_type'   => 'hayato_timeline',
        'post_status' => 'draft',
        'numberposts' => 50,
        'orderby'     => 'date',
        'order'       => 'DESC',
    ) );

    $items = array();
    foreach ( $posts as $post ) {
        $items[] = $this->format_post( $post );
    }

    return rest_ensure_response( $items );
}

/**
 * ===== 4. update_item() の修正（既存メソッド） =====
 * statusフィールドの処理を追加:
 */

// update_item() 内、投稿データ更新の前に追加:
if ( ! empty( $params['status'] ) ) {
    $allowed_statuses = array( 'publish', 'draft' );
    if ( in_array( $params['status'], $allowed_statuses, true ) ) {
        wp_update_post( array(
            'ID'          => $post_id,
            'post_status' => $params['status'],
        ) );
    }
}

/**
 * ===== 5. create_item() の修正（既存メソッド） =====
 * statusフィールドの処理を追加:
 */

// create_item() 内、wp_insert_post() の引数に追加:
// 'post_status' => ( ! empty( $params['status'] ) && $params['status'] === 'draft' ) ? 'draft' : 'publish',
