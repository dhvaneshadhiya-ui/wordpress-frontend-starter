<?php
/**
 * Plugin Name: iGeeksBlog Redirects API
 * Description: Exposes Redirection plugin rules via REST API for headless frontend
 * Version: 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Register REST endpoint: /wp-json/igeeksblog/v1/redirect?url=/old-post-slug
add_action('rest_api_init', function() {
    register_rest_route('igeeksblog/v1', '/redirect', array(
        'methods' => 'GET',
        'callback' => 'igb_check_redirect',
        'permission_callback' => '__return_true',
        'args' => array(
            'url' => array(
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ),
        ),
    ));
});

/**
 * Check if a URL has a redirect rule in the Redirection plugin
 */
function igb_check_redirect($request) {
    global $wpdb;
    $url = $request->get_param('url');
    
    // Normalize URL (ensure leading slash, remove trailing slash)
    $url = '/' . trim($url, '/');
    
    // Check if Redirection plugin table exists
    $table = $wpdb->prefix . 'redirection_items';
    $table_exists = $wpdb->get_var($wpdb->prepare(
        "SHOW TABLES LIKE %s",
        $table
    ));
    
    if (!$table_exists) {
        return array(
            'found' => false,
            'url' => $url,
            'error' => 'Redirection plugin not installed or table not found',
        );
    }
    
    // Query Redirection plugin's table for matching redirect
    $redirect = $wpdb->get_row($wpdb->prepare(
        "SELECT url, action_data, action_code, action_type 
         FROM $table 
         WHERE url = %s AND status = 'enabled'
         LIMIT 1",
        $url
    ));
    
    if (!$redirect) {
        return array(
            'found' => false,
            'url' => $url,
        );
    }
    
    return array(
        'found' => true,
        'url' => $url,
        'target' => $redirect->action_data,      // New URL for 301/302, empty for 410
        'code' => (int) $redirect->action_code,  // 301, 302, 410, etc.
        'type' => $redirect->action_type,        // 'url', 'error', 'random', etc.
    );
}
