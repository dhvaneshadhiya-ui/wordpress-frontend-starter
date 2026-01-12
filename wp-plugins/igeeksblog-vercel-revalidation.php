<?php
/**
 * Plugin Name: iGeeksBlog Vercel Revalidation
 * Plugin URI: https://igeeksblog.com
 * Description: Triggers Vercel on-demand ISR revalidation when posts are published, updated, or deleted
 * Version: 1.0.0
 * Author: iGeeksBlog
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Trigger Vercel revalidation for a post
 * 
 * @param int $post_id The post ID
 * @param string $action The action being performed (publish, update, delete)
 * @param WP_Post|null $post The post object
 */
function igb_trigger_vercel_revalidation($post_id, $action = 'update', $post = null) {
    // Get Vercel revalidation URL and secret from wp-config.php
    $vercel_revalidate_url = defined('IGB_VERCEL_REVALIDATE_URL') ? IGB_VERCEL_REVALIDATE_URL : '';
    $revalidate_secret = defined('IGB_REVALIDATE_SECRET') ? IGB_REVALIDATE_SECRET : '';
    
    if (empty($vercel_revalidate_url)) {
        return false;
    }
    
    // Get the post if not provided
    if (!$post) {
        $post = get_post($post_id);
    }
    
    if (!$post || $post->post_type !== 'post') {
        return false;
    }
    
    // Get post categories
    $categories = wp_get_post_categories($post_id, array('fields' => 'slugs'));
    $primary_category = !empty($categories) ? $categories[0] : null;
    
    // Get post tags
    $tags = wp_get_post_tags($post_id, array('fields' => 'slugs'));
    $primary_tag = !empty($tags) ? $tags[0] : null;
    
    // Get author slug
    $author = get_the_author_meta('user_nicename', $post->post_author);
    
    // Build payload
    $payload = array(
        'action' => $action,
        'postId' => $post_id,
        'slug' => $post->post_name,
        'categorySlug' => $primary_category,
        'categorySlugs' => $categories,
        'tagSlug' => $primary_tag,
        'tagSlugs' => $tags,
        'authorSlug' => $author,
        'timestamp' => current_time('c'),
    );
    
    // Send revalidation request
    $response = wp_remote_post($vercel_revalidate_url, array(
        'timeout' => 10,
        'blocking' => false, // Non-blocking for faster admin experience
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-revalidate-secret' => $revalidate_secret,
        ),
        'body' => json_encode($payload),
    ));
    
    // Log for debugging
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log('[iGB Vercel] Revalidation triggered for post ' . $post_id . ' (' . $action . ')');
        if (is_wp_error($response)) {
            error_log('[iGB Vercel] Error: ' . $response->get_error_message());
        }
    }
    
    return !is_wp_error($response);
}

/**
 * Hook: Post published
 */
add_action('publish_post', function($post_id, $post) {
    igb_trigger_vercel_revalidation($post_id, 'publish', $post);
}, 10, 2);

/**
 * Hook: Post updated (only for published posts)
 */
add_action('post_updated', function($post_id, $post_after, $post_before) {
    // Only trigger if the post is currently published
    if ($post_after->post_status === 'publish') {
        igb_trigger_vercel_revalidation($post_id, 'update', $post_after);
    }
}, 10, 3);

/**
 * Hook: Post trashed
 */
add_action('wp_trash_post', function($post_id) {
    $post = get_post($post_id);
    if ($post && $post->post_status === 'publish') {
        igb_trigger_vercel_revalidation($post_id, 'delete', $post);
    }
});

/**
 * Hook: Post permanently deleted
 */
add_action('before_delete_post', function($post_id) {
    $post = get_post($post_id);
    if ($post && $post->post_type === 'post') {
        igb_trigger_vercel_revalidation($post_id, 'delete', $post);
    }
});

/**
 * Hook: Category updated - revalidate category archive pages
 */
add_action('edited_category', function($term_id, $tt_id) {
    $vercel_revalidate_url = defined('IGB_VERCEL_REVALIDATE_URL') ? IGB_VERCEL_REVALIDATE_URL : '';
    $revalidate_secret = defined('IGB_REVALIDATE_SECRET') ? IGB_REVALIDATE_SECRET : '';
    
    if (empty($vercel_revalidate_url)) {
        return;
    }
    
    $category = get_category($term_id);
    if (!$category) {
        return;
    }
    
    $payload = array(
        'action' => 'category_update',
        'categorySlug' => $category->slug,
        'timestamp' => current_time('c'),
    );
    
    wp_remote_post($vercel_revalidate_url, array(
        'timeout' => 10,
        'blocking' => false,
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-revalidate-secret' => $revalidate_secret,
        ),
        'body' => json_encode($payload),
    ));
}, 10, 2);

/**
 * Hook: Tag updated - revalidate tag archive pages
 */
add_action('edited_post_tag', function($term_id, $tt_id) {
    $vercel_revalidate_url = defined('IGB_VERCEL_REVALIDATE_URL') ? IGB_VERCEL_REVALIDATE_URL : '';
    $revalidate_secret = defined('IGB_REVALIDATE_SECRET') ? IGB_REVALIDATE_SECRET : '';
    
    if (empty($vercel_revalidate_url)) {
        return;
    }
    
    $tag = get_tag($term_id);
    if (!$tag) {
        return;
    }
    
    $payload = array(
        'action' => 'tag_update',
        'tagSlug' => $tag->slug,
        'timestamp' => current_time('c'),
    );
    
    wp_remote_post($vercel_revalidate_url, array(
        'timeout' => 10,
        'blocking' => false,
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-revalidate-secret' => $revalidate_secret,
        ),
        'body' => json_encode($payload),
    ));
}, 10, 2);

/**
 * Admin notice if not configured
 */
add_action('admin_notices', function() {
    if (!current_user_can('manage_options')) {
        return;
    }
    
    $vercel_url = defined('IGB_VERCEL_REVALIDATE_URL') ? IGB_VERCEL_REVALIDATE_URL : '';
    $secret = defined('IGB_REVALIDATE_SECRET') ? IGB_REVALIDATE_SECRET : '';
    
    if (empty($vercel_url) || empty($secret)) {
        echo '<div class="notice notice-warning"><p>';
        echo '<strong>iGeeksBlog Vercel Revalidation:</strong> ';
        echo 'Plugin is active but not configured. Add <code>IGB_VERCEL_REVALIDATE_URL</code> and <code>IGB_REVALIDATE_SECRET</code> to wp-config.php';
        echo '</p></div>';
    }
});

/**
 * Manual revalidation button on post edit screen
 */
add_action('post_submitbox_misc_actions', function($post) {
    if ($post->post_type !== 'post' || $post->post_status !== 'publish') {
        return;
    }
    
    $vercel_url = defined('IGB_VERCEL_REVALIDATE_URL') ? IGB_VERCEL_REVALIDATE_URL : '';
    if (empty($vercel_url)) {
        return;
    }
    
    ?>
    <div class="misc-pub-section">
        <span class="dashicons dashicons-update" style="color: #0073aa;"></span>
        <a href="#" id="igb-revalidate-btn" style="color: #0073aa;">
            Revalidate on Vercel
        </a>
        <span id="igb-revalidate-status" style="display: none; margin-left: 5px;"></span>
    </div>
    <script>
    jQuery(function($) {
        $('#igb-revalidate-btn').on('click', function(e) {
            e.preventDefault();
            var $btn = $(this);
            var $status = $('#igb-revalidate-status');
            
            $btn.text('Revalidating...');
            $status.hide();
            
            $.post(ajaxurl, {
                action: 'igb_manual_revalidate',
                post_id: <?php echo $post->ID; ?>,
                nonce: '<?php echo wp_create_nonce('igb_revalidate_' . $post->ID); ?>'
            }, function(response) {
                $btn.text('Revalidate on Vercel');
                if (response.success) {
                    $status.text('✓').css('color', 'green').show();
                } else {
                    $status.text('✗').css('color', 'red').show();
                }
                setTimeout(function() { $status.fadeOut(); }, 3000);
            });
        });
    });
    </script>
    <?php
});

/**
 * AJAX handler for manual revalidation
 */
add_action('wp_ajax_igb_manual_revalidate', function() {
    $post_id = intval($_POST['post_id'] ?? 0);
    $nonce = $_POST['nonce'] ?? '';
    
    if (!wp_verify_nonce($nonce, 'igb_revalidate_' . $post_id)) {
        wp_send_json_error('Invalid nonce');
    }
    
    if (!current_user_can('edit_post', $post_id)) {
        wp_send_json_error('Permission denied');
    }
    
    $result = igb_trigger_vercel_revalidation($post_id, 'manual');
    
    if ($result) {
        wp_send_json_success('Revalidation triggered');
    } else {
        wp_send_json_error('Revalidation failed');
    }
});
