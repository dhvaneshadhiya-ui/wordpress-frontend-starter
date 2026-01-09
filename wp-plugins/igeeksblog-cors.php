<?php
/**
 * Plugin Name: iGeeksBlog CORS Headers
 * Plugin URI: https://igeeksblog.com
 * Description: Add CORS headers for headless frontend access from Lovable preview and production domains
 * Version: 1.0.0
 * Author: iGeeksBlog
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * List of allowed origins for CORS
 */
function igb_get_allowed_origins() {
    return array(
        'https://dev.igeeksblog.com',
        'https://wp.dev.igeeksblog.com',
        'https://igeeksblog.com',
        'https://www.igeeksblog.com',
    );
}

/**
 * Check if an origin matches Lovable preview domains
 */
function igb_is_lovable_origin($origin) {
    // Match *.lovableproject.com
    if (preg_match('/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/', $origin)) {
        return true;
    }
    // Match *.lovable.app
    if (preg_match('/^https:\/\/[a-z0-9-]+\.lovable\.app$/', $origin)) {
        return true;
    }
    return false;
}

/**
 * Check if an origin is allowed
 */
function igb_is_allowed_origin($origin) {
    if (empty($origin)) {
        return false;
    }
    
    // Check static allowed origins
    if (in_array($origin, igb_get_allowed_origins())) {
        return true;
    }
    
    // Check Lovable preview domains
    if (igb_is_lovable_origin($origin)) {
        return true;
    }
    
    return false;
}

/**
 * Add CORS headers early in the request lifecycle
 * This handles preflight OPTIONS requests before WordPress processes them
 */
add_action('init', function() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (!igb_is_allowed_origin($origin)) {
        return;
    }
    
    // Set CORS headers
    header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
}, 1); // Priority 1 = run very early

/**
 * Add CORS headers to REST API responses
 * This ensures headers are set even if the init hook doesn't catch them
 */
add_action('rest_api_init', function() {
    // Remove WordPress default CORS handler
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    
    // Add our custom CORS handler
    add_filter('rest_pre_serve_request', function($value) {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        
        if (igb_is_allowed_origin($origin)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce');
            header('Access-Control-Allow-Credentials: true');
        }
        
        return $value;
    }, 15);
}, 15);

/**
 * Add CORS headers to non-REST API responses (e.g., admin-ajax.php)
 */
add_action('send_headers', function() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (igb_is_allowed_origin($origin)) {
        header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        header('Access-Control-Allow-Credentials: true');
    }
});

/**
 * Log CORS requests for debugging (only when WP_DEBUG is enabled)
 */
if (defined('WP_DEBUG') && WP_DEBUG) {
    add_action('init', function() {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : 'no-origin';
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = $_SERVER['REQUEST_URI'];
        
        if (strpos($uri, '/wp-json/') !== false || strpos($uri, 'admin-ajax.php') !== false) {
            error_log("[iGB CORS] {$method} {$uri} from {$origin} - " . 
                (igb_is_allowed_origin($origin) ? 'ALLOWED' : 'BLOCKED'));
        }
    }, 0);
}
