<?php
/**
 * Plugin Name: iGeeksBlog Deploy Webhook
 * Description: Automatically triggers site rebuild when posts are published, updated, or deleted. Works with Vercel, Netlify, AWS Amplify, or any webhook-based deployment.
 * Version: 1.2.0
 * Author: iGeeksBlog
 * 
 * Configuration (add to wp-config.php):
 * define('IGB_WEBHOOK_URL', 'https://your-deploy-hook-url');
 * define('IGB_WEBHOOK_SECRET', 'your-secure-secret-key'); // Optional
 * 
 * Supported platforms:
 * - Vercel: https://api.vercel.com/v1/integrations/deploy/xxx/yyy
 * - Netlify: https://api.netlify.com/build_hooks/xxx
 * - AWS Amplify: https://webhooks.amplify.{region}.amazonaws.com/prod/webhooks?id=xxx&token=yyy
 */

if (!defined('ABSPATH')) exit;

/**
 * Send webhook notification to trigger deployment
 */
function igb_trigger_webhook($action, $post_id, $post = null) {
    $webhook_url = defined('IGB_WEBHOOK_URL') ? IGB_WEBHOOK_URL : '';
    $webhook_secret = defined('IGB_WEBHOOK_SECRET') ? IGB_WEBHOOK_SECRET : '';
    
    if (empty($webhook_url)) {
        error_log('iGeeksBlog Webhook: URL not configured in wp-config.php');
        return false;
    }
    
    // Get post object if not provided
    if (!$post && $post_id) {
        $post = get_post($post_id);
    }
    
    // Only trigger for posts (not pages, attachments, revisions, etc.)
    if ($post && $post->post_type !== 'post') {
        return false;
    }
    
    // Build payload
    $payload = array(
        'action'      => $action,
        'post_id'     => $post_id,
        'post_type'   => $post ? $post->post_type : 'post',
        'post_status' => $post ? $post->post_status : 'publish',
        'post_title'  => $post ? $post->post_title : '',
        'post_slug'   => $post ? $post->post_name : '',
        'timestamp'   => current_time('c'),
        'site_url'    => get_site_url(),
    );
    
    // Build headers
    $headers = array(
        'Content-Type' => 'application/json',
    );
    
    if (!empty($webhook_secret)) {
        $headers['X-Webhook-Secret'] = $webhook_secret;
    }
    
    // Send async request (non-blocking)
    $response = wp_remote_post($webhook_url, array(
        'headers'  => $headers,
        'body'     => json_encode($payload),
        'timeout'  => 5,
        'blocking' => false, // Don't wait for response
    ));
    
    if (is_wp_error($response)) {
        error_log('iGeeksBlog Webhook Error: ' . $response->get_error_message());
        return false;
    }
    
    error_log('iGeeksBlog Webhook: Triggered ' . $action . ' for post ID ' . $post_id);
    return true;
}

/**
 * Hook: Post is published (new or from draft)
 */
add_action('publish_post', function($post_id, $post) {
    igb_trigger_webhook('publish', $post_id, $post);
}, 10, 2);

/**
 * Hook: Published post is updated
 */
add_action('post_updated', function($post_id, $post_after, $post_before) {
    // Only trigger if post was and still is published
    if ($post_after->post_status === 'publish' && $post_before->post_status === 'publish') {
        // Skip if it's an autosave or revision
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }
        igb_trigger_webhook('update', $post_id, $post_after);
    }
}, 10, 3);

/**
 * Hook: Post is trashed
 */
add_action('wp_trash_post', function($post_id) {
    $post = get_post($post_id);
    if ($post && $post->post_type === 'post' && $post->post_status === 'publish') {
        igb_trigger_webhook('trash', $post_id, $post);
    }
});

/**
 * Hook: Post is permanently deleted
 */
add_action('before_delete_post', function($post_id) {
    $post = get_post($post_id);
    if ($post && $post->post_type === 'post') {
        igb_trigger_webhook('delete', $post_id, $post);
    }
});

/**
 * Hook: Category is edited
 */
add_action('edited_category', function($term_id) {
    igb_trigger_webhook('category_update', $term_id);
});

/**
 * Hook: Tag is edited
 */
add_action('edited_post_tag', function($term_id) {
    igb_trigger_webhook('tag_update', $term_id);
});

/**
 * Admin notice if webhook URL is not configured
 */
add_action('admin_notices', function() {
    if (!defined('IGB_WEBHOOK_URL') || empty(IGB_WEBHOOK_URL)) {
        echo '<div class="notice notice-warning"><p>';
        echo '<strong>iGeeksBlog Deploy Webhook:</strong> Deploy hook URL not configured. ';
        echo 'Add <code>define(\'IGB_WEBHOOK_URL\', \'your-url\');</code> to wp-config.php';
        echo '</p></div>';
    }
});
