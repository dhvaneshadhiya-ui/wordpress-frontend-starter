<?php
/**
 * Plugin Name: iGeeksBlog Preview
 * Plugin URI: https://igeeksblog.com
 * Description: Enables draft preview on headless React frontend
 * Version: 1.0.0
 * Author: iGeeksBlog
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Generate secure preview token
 * Uses HMAC-SHA256 with expiration
 */
function igb_generate_preview_token($post_id) {
    $secret = defined('IGB_PREVIEW_SECRET') ? IGB_PREVIEW_SECRET : 'change-this-secret-key';
    $expiry = time() + 3600; // 1 hour expiration
    $data = $post_id . '|' . $expiry;
    $signature = hash_hmac('sha256', $data, $secret);
    return base64_encode($data . '|' . $signature);
}

/**
 * Validate preview token
 */
function igb_validate_preview_token($token, $post_id) {
    $secret = defined('IGB_PREVIEW_SECRET') ? IGB_PREVIEW_SECRET : 'change-this-secret-key';
    
    $decoded = base64_decode($token);
    if (!$decoded) {
        return false;
    }
    
    $parts = explode('|', $decoded);
    if (count($parts) !== 3) {
        return false;
    }
    
    list($token_post_id, $expiry, $signature) = $parts;
    
    // Validate post ID matches
    if (intval($token_post_id) !== intval($post_id)) {
        return false;
    }
    
    // Check expiration
    if (time() > intval($expiry)) {
        return false;
    }
    
    // Verify signature
    $expected = hash_hmac('sha256', $token_post_id . '|' . $expiry, $secret);
    return hash_equals($expected, $signature);
}

/**
 * Register preview REST API endpoint
 */
add_action('rest_api_init', function() {
    register_rest_route('igeeksblog/v1', '/preview', array(
        'methods' => 'GET',
        'callback' => 'igb_get_preview_post',
        'permission_callback' => '__return_true',
        'args' => array(
            'id' => array(
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint',
            ),
            'token' => array(
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ));
});

/**
 * Handle preview request - fetch draft post with token validation
 */
function igb_get_preview_post($request) {
    $post_id = $request->get_param('id');
    $token = $request->get_param('token');
    
    // Validate token
    if (!igb_validate_preview_token($token, $post_id)) {
        return new WP_Error(
            'invalid_token',
            'Invalid or expired preview token. Please generate a new preview link.',
            array('status' => 403)
        );
    }
    
    // Get the post (including drafts, pending, etc.)
    $post = get_post($post_id);
    if (!$post) {
        return new WP_Error(
            'not_found',
            'Post not found',
            array('status' => 404)
        );
    }
    
    // Get author data
    $author = get_userdata($post->post_author);
    $author_data = null;
    if ($author) {
        $author_data = array(
            'id' => $author->ID,
            'name' => $author->display_name,
            'slug' => $author->user_nicename,
            'avatar_urls' => array(
                '48' => get_avatar_url($author->ID, array('size' => 48)),
                '96' => get_avatar_url($author->ID, array('size' => 96)),
            ),
            'description' => $author->description,
        );
    }
    
    // Get featured image
    $featured_media = array();
    $thumbnail_id = get_post_thumbnail_id($post->ID);
    if ($thumbnail_id) {
        $image = wp_get_attachment_image_src($thumbnail_id, 'full');
        $image_large = wp_get_attachment_image_src($thumbnail_id, 'large');
        $image_medium = wp_get_attachment_image_src($thumbnail_id, 'medium');
        
        $featured_media[] = array(
            'source_url' => $image ? $image[0] : '',
            'alt_text' => get_post_meta($thumbnail_id, '_wp_attachment_image_alt', true),
            'media_details' => array(
                'sizes' => array(
                    'full' => array('source_url' => $image ? $image[0] : ''),
                    'large' => array('source_url' => $image_large ? $image_large[0] : ''),
                    'medium' => array('source_url' => $image_medium ? $image_medium[0] : ''),
                ),
            ),
        );
    }
    
    // Get categories and tags
    $categories = wp_get_post_categories($post->ID, array('fields' => 'all'));
    $tags = wp_get_post_tags($post->ID, array('fields' => 'all'));
    
    $category_terms = array();
    foreach ($categories as $cat) {
        $category_terms[] = array(
            'id' => $cat->term_id,
            'name' => $cat->name,
            'slug' => $cat->slug,
            'taxonomy' => 'category',
        );
    }
    
    $tag_terms = array();
    foreach ($tags as $tag) {
        $tag_terms[] = array(
            'id' => $tag->term_id,
            'name' => $tag->name,
            'slug' => $tag->slug,
            'taxonomy' => 'post_tag',
        );
    }
    
    // Return post data in WP REST API format
    return array(
        'id' => $post->ID,
        'slug' => $post->post_name ?: 'draft-' . $post->ID,
        'status' => $post->post_status,
        'title' => array('rendered' => $post->post_title),
        'content' => array('rendered' => apply_filters('the_content', $post->post_content)),
        'excerpt' => array('rendered' => $post->post_excerpt ?: wp_trim_words($post->post_content, 55)),
        'date' => $post->post_date,
        'modified' => $post->post_modified,
        'featured_media' => $thumbnail_id ?: 0,
        'author' => $post->post_author,
        'categories' => wp_list_pluck($categories, 'term_id'),
        'tags' => wp_list_pluck($tags, 'term_id'),
        '_embedded' => array(
            'author' => $author_data ? array($author_data) : array(),
            'wp:featuredmedia' => $featured_media,
            'wp:term' => array($category_terms, $tag_terms),
        ),
    );
}

/**
 * Redirect WordPress preview button to headless frontend
 */
add_filter('preview_post_link', function($link, $post) {
    // Get frontend URL from constant or default
    $frontend_url = defined('IGB_FRONTEND_URL') ? IGB_FRONTEND_URL : 'https://dev.igeeksblog.com';
    
    // Generate secure token
    $token = igb_generate_preview_token($post->ID);
    
    // Build preview URL
    return $frontend_url . '/preview?id=' . $post->ID . '&token=' . urlencode($token);
}, 10, 2);

/**
 * Add CORS headers for preview endpoint
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origin = get_http_origin();
        $allowed_origins = array(
            'https://dev.igeeksblog.com',
            'https://igeeksblog.com',
        );
        
        // Also allow Lovable preview domains for development
        if (preg_match('/\.lovableproject\.com$/', $origin)) {
            $allowed_origins[] = $origin;
        }
        
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET, OPTIONS');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
        }
        
        return $value;
    });
}, 15);
