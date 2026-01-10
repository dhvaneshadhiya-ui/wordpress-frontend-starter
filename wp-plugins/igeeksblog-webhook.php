<?php
/**
 * Plugin Name: iGeeksBlog Deploy Webhook
 * Description: Automatically triggers site rebuild when posts are published, updated, or deleted. 
 *              Supports GitHub Actions for content sync + direct deploy hooks for Amplify/Netlify/Vercel.
 * Version: 2.0.0
 * Author: iGeeksBlog
 * 
 * Configuration (add to wp-config.php):
 * 
 * Option 1: GitHub Actions (Recommended - enables incremental content sync)
 * define('IGB_GITHUB_TOKEN', 'ghp_xxxx');           // GitHub PAT with 'repo' scope
 * define('IGB_GITHUB_REPO', 'username/repo-name');  // Your GitHub repository
 * 
 * Option 2: Direct Deploy Hook (Amplify/Netlify/Vercel)
 * define('IGB_WEBHOOK_URL', 'https://your-deploy-hook-url');
 * define('IGB_WEBHOOK_SECRET', 'your-secure-secret-key'); // Optional
 * 
 * You can use both options together for redundancy:
 * - GitHub Action updates content cache (src/data/posts.json)
 * - Direct webhook triggers immediate build
 */

if (!defined('ABSPATH')) exit;

/**
 * Trigger GitHub Action via repository_dispatch
 * This updates src/data/posts.json before Amplify builds
 */
function igb_trigger_github_action($action, $post_id, $post = null) {
    $github_token = defined('IGB_GITHUB_TOKEN') ? IGB_GITHUB_TOKEN : '';
    $github_repo = defined('IGB_GITHUB_REPO') ? IGB_GITHUB_REPO : '';
    
    if (empty($github_token) || empty($github_repo)) {
        return false; // GitHub not configured, skip silently
    }
    
    $api_url = 'https://api.github.com/repos/' . $github_repo . '/dispatches';
    
    // Build payload for GitHub Action
    $payload = array(
        'event_type' => 'wordpress_content_update',
        'client_payload' => array(
            'action'      => $action,
            'post_id'     => $post_id,
            'post_title'  => $post ? $post->post_title : '',
            'post_slug'   => $post ? $post->post_name : '',
            'timestamp'   => current_time('c'),
        ),
    );
    
    $response = wp_remote_post($api_url, array(
        'headers' => array(
            'Accept'        => 'application/vnd.github.v3+json',
            'Authorization' => 'token ' . $github_token,
            'User-Agent'    => 'iGeeksBlog-WordPress-Plugin',
            'Content-Type'  => 'application/json',
        ),
        'body'     => json_encode($payload),
        'timeout'  => 10,
        'blocking' => false, // Non-blocking for speed
    ));
    
    if (is_wp_error($response)) {
        error_log('iGeeksBlog GitHub Action Error: ' . $response->get_error_message());
        return false;
    }
    
    error_log('iGeeksBlog GitHub Action: Triggered ' . $action . ' for post ID ' . $post_id);
    return true;
}

/**
 * Send webhook notification to trigger deployment (Amplify/Netlify/Vercel)
 */
function igb_trigger_webhook($action, $post_id, $post = null) {
    // First, trigger GitHub Action for content sync
    igb_trigger_github_action($action, $post_id, $post);
    
    // Then, trigger direct deploy webhook if configured
    $webhook_url = defined('IGB_WEBHOOK_URL') ? IGB_WEBHOOK_URL : '';
    $webhook_secret = defined('IGB_WEBHOOK_SECRET') ? IGB_WEBHOOK_SECRET : '';
    
    if (empty($webhook_url)) {
        // No direct webhook configured, GitHub Action alone is sufficient
        return true;
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
 * Admin notice for configuration status
 */
add_action('admin_notices', function() {
    $github_configured = defined('IGB_GITHUB_TOKEN') && !empty(IGB_GITHUB_TOKEN) 
                       && defined('IGB_GITHUB_REPO') && !empty(IGB_GITHUB_REPO);
    $webhook_configured = defined('IGB_WEBHOOK_URL') && !empty(IGB_WEBHOOK_URL);
    
    // Show warning only if neither is configured
    if (!$github_configured && !$webhook_configured) {
        echo '<div class="notice notice-warning"><p>';
        echo '<strong>iGeeksBlog Deploy Webhook:</strong> No deployment trigger configured.<br>';
        echo 'Add to wp-config.php:<br>';
        echo '<code>define(\'IGB_GITHUB_TOKEN\', \'ghp_xxx\');</code><br>';
        echo '<code>define(\'IGB_GITHUB_REPO\', \'username/repo\');</code><br>';
        echo 'Or: <code>define(\'IGB_WEBHOOK_URL\', \'your-deploy-hook-url\');</code>';
        echo '</p></div>';
    }
    
    // Show success notice on settings pages
    if (($github_configured || $webhook_configured) && 
        (isset($_GET['page']) && strpos($_GET['page'], 'options') !== false)) {
        $methods = array();
        if ($github_configured) $methods[] = 'GitHub Actions';
        if ($webhook_configured) $methods[] = 'Direct Webhook';
        
        echo '<div class="notice notice-success"><p>';
        echo '<strong>iGeeksBlog Deploy Webhook:</strong> Active via ' . implode(' + ', $methods);
        echo '</p></div>';
    }
});
