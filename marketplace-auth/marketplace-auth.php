<?php
/**
 * Plugin Name: Marketplace Authentication
 * Description: JWT Authentication for the custom Node.js marketplace
 * Version: 1.0.0
 * Author: Sandra A. Casey
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Simple JWT implementation - no external libraries required
 */
class Simple_JWT {
    /**
     * Generate a JWT token
     *
     * @param array $payload The data to encode
     * @param string $key The secret key
     * @return string The JWT token
     */
    public static function generate($payload, $key) {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        
        // Encode Header
        $header_encoded = self::base64url_encode(json_encode($header));
        
        // Encode Payload
        $payload_encoded = self::base64url_encode(json_encode($payload));
        
        // Create Signature
        $signature_data = "$header_encoded.$payload_encoded";
        $signature = hash_hmac('sha256', $signature_data, $key, true);
        $signature_encoded = self::base64url_encode($signature);
        
        // Create JWT
        return "$header_encoded.$payload_encoded.$signature_encoded";
    }
    
    /**
     * Verify and decode a JWT token
     *
     * @param string $token The JWT token
     * @param string $key The secret key
     * @return array|false The decoded payload or false if invalid
     */
    public static function verify($token, $key) {
        $parts = explode('.', $token);
        
        // Check if token has 3 parts
        if (count($parts) != 3) {
            return false;
        }
        
        list($header_encoded, $payload_encoded, $signature_encoded) = $parts;
        
        // Verify signature
        $signature_data = "$header_encoded.$payload_encoded";
        $signature = hash_hmac('sha256', $signature_data, $key, true);
        $signature_check = self::base64url_encode($signature);
        
        if ($signature_encoded !== $signature_check) {
            return false;
        }
        
        // Decode payload
        $payload = json_decode(self::base64url_decode($payload_encoded), true);
        
        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        return $payload;
    }
    
    /**
     * Base64URL encode (JWT specific encoding)
     *
     * @param string $data The data to encode
     * @return string The encoded data
     */
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Base64URL decode
     *
     * @param string $data The data to decode
     * @return string The decoded data
     */
    private static function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }
}

/**
 * Generate JWT token for current user
 *
 * @return string|false Token string or false if user not logged in
 */
function mpauth_generate_jwt() {
    if (!is_user_logged_in()) {
        return false;
    }
    
    $user = wp_get_current_user();
    
    // Get secret key from WordPress options
    $secret_key = get_option('mpauth_secret_key');
    if (!$secret_key) {
        // Generate a random key if none exists
        $secret_key = bin2hex(openssl_random_pseudo_bytes(32));
        update_option('mpauth_secret_key', $secret_key);
    }
    
    // Define token expiration (1 hour)
    $issued_at = time();
    $expiration = $issued_at + (60 * 60);
    
    // Create token payload
    $payload = [
        'iss' => get_site_url(),                 // Issuer
        'iat' => $issued_at,                     // Issued at time
        'exp' => $expiration,                    // Expiration time
        'user_id' => $user->ID,                  // WordPress user ID
        'email' => $user->user_email,            // User email
        'display_name' => $user->display_name,   // Display name
        'roles' => $user->roles                  // User roles
    ];
    
    // Create JWT
    return Simple_JWT::generate($payload, $secret_key);
}

/**
 * REST API endpoint for authentication
 */
add_action('rest_api_init', function() {
    register_rest_route('marketplace/v1', '/auth', [
        'methods' => 'GET',
        'callback' => 'mpauth_get_token',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ]);
});

/**
 * Callback function for the API endpoint
 */
function mpauth_get_token() {
    $token = mpauth_generate_jwt();
    if (!$token) {
        return new WP_Error('not_logged_in', 'User not logged in', ['status' => 401]);
    }
    
    return ['token' => $token];
}

/**
 * Add admin menu
 */
add_action('admin_menu', 'mpauth_add_admin_menu');
function mpauth_add_admin_menu() {
    add_options_page(
        'Marketplace Auth Settings',
        'Marketplace Auth',
        'manage_options',
        'marketplace-auth',
        'mpauth_settings_page'
    );
}

/**
 * Settings page content
 */
function mpauth_settings_page() {
    // Save settings if form is submitted
    if (isset($_POST['mpauth_save_settings']) && check_admin_referer('mpauth_settings_nonce')) {
        if (isset($_POST['regenerate_key']) && $_POST['regenerate_key'] == '1') {
            $new_key = bin2hex(openssl_random_pseudo_bytes(32));
            update_option('mpauth_secret_key', $new_key);
        }
        
        // Save marketplace URL if provided
        if (isset($_POST['marketplace_url'])) {
            update_option('mpauth_marketplace_url', esc_url_raw($_POST['marketplace_url']));
        }
        
        add_settings_error('mpauth_messages', 'mpauth_message', 'Settings Saved', 'updated');
    }
    
    // Get current key
    $secret_key = get_option('mpauth_secret_key', '');
    if (empty($secret_key)) {
        $secret_key = bin2hex(openssl_random_pseudo_bytes(32));
        update_option('mpauth_secret_key', $secret_key);
    }
    
    // Get marketplace URL
    $marketplace_url = get_option('mpauth_marketplace_url', '');
    
    // Display settings form
    ?>
    <div class="wrap">
        <h1>Marketplace Authentication Settings</h1>
        <?php settings_errors('mpauth_messages'); ?>
        
        <form method="post">
            <?php wp_nonce_field('mpauth_settings_nonce'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">Secret Key</th>
                    <td>
                        <input type="text" readonly value="<?php echo esc_attr($secret_key); ?>" class="regular-text" />
                        <p class="description">This key is used to sign JWT tokens. Keep it secure and use it in your Node.js application.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Marketplace URL</th>
                    <td>
                        <input type="url" name="marketplace_url" value="<?php echo esc_attr($marketplace_url); ?>" class="regular-text" />
                        <p class="description">The URL of your Node.js marketplace application</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Regenerate Key</th>
                    <td>
                        <label>
                            <input type="checkbox" name="regenerate_key" value="1" />
                            Regenerate secret key (warning: this will invalidate all existing tokens)
                        </label>
                    </td>
                </tr>
            </table>
            
            <p class="submit">
                <input type="submit" name="mpauth_save_settings" class="button-primary" value="Save Changes" />
            </p>
        </form>
        
        <h2>Integration Instructions</h2>
        <p>Add this shortcode to your marketplace page to display the marketplace with authentication:</p>
        <code>[marketplace_auth]</code>
        
        <h3>Node.js Application Configuration</h3>
        <p>In your Node.js application, you need to:</p>
        <ol>
            <li>Install jsonwebtoken: <code>npm install jsonwebtoken</code></li>
            <li>Use this secret key to verify tokens: <code><?php echo esc_html($secret_key); ?></code></li>
            <li>Check for the token in query string or Authorization header</li>
        </ol>
        
        <pre style="background:#f4f4f4; padding:10px; overflow:hidden;">
// Example Node.js code
const jwt = require('jsonwebtoken');
const SECRET_KEY = '<?php echo esc_js($secret_key); ?>';

const authenticateUser = (req, res, next) => {
  const token = req.query.token || 
                req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Use middleware for protected routes
app.post('/cart/add', authenticateUser, (req, res) => {
  // Handle adding to cart
});
        </pre>
    </div>
    <?php
}

/**
 * Create marketplace shortcode
 */
add_shortcode('marketplace_auth', 'mpauth_shortcode');
function mpauth_shortcode($atts) {
    // Extract attributes
    $atts = shortcode_atts([
        'height' => '800px',
    ], $atts);
    
    // Enqueue script
    wp_enqueue_script('mpauth-script');
    
    ob_start();
    ?>
    <div id="marketplace-container" style="width:100%; min-height:<?php echo esc_attr($atts['height']); ?>; max-width:100%; margin:0 auto;">
        <div class="loading" style="text-align:center; padding:20px;">
            <p>Loading marketplace...</p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Enqueue scripts and styles
 */
add_action('wp_enqueue_scripts', 'mpauth_enqueue_scripts');
function mpauth_enqueue_scripts() {
    // Register and enqueue script
    wp_register_script(
        'mpauth-script',
        plugin_dir_url(__FILE__) . 'marketplace-auth.js',
        ['jquery'],
        '1.0.0',
        true
    );
    
    // Pass WordPress data to script
    wp_localize_script(
        'mpauth-script',
        'mpauthData',
        [
            'apiUrl' => esc_url_raw(rest_url('marketplace/v1/auth')),
            'marketplaceUrl' => get_option('mpauth_marketplace_url', ''),
            'loginUrl' => wp_login_url(get_permalink()),
            'isLoggedIn' => is_user_logged_in(),
            'nonce' => wp_create_nonce('wp_rest')
        ]
    );
    
    // Add inline CSS for full-width iframe
    wp_add_inline_style('wp-block-library', '
        #marketplace-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        #marketplace-iframe {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            display: block !important;
        }
        /* Override theme container widths */
        .entry-content .wp-block-group__inner-container #marketplace-container,
        .entry-content > #marketplace-container,
        .site-content #marketplace-container,
        .content-area #marketplace-container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 auto !important;
        }
    ');
}

/**
 * Handle WordPress logout
 */
add_action('wp_logout', 'mpauth_handle_logout');
function mpauth_handle_logout() {
    // Set a cookie to indicate logout
    setcookie('wp_marketplace_logout', '1', time() + 3600, '/', '', is_ssl(), true);
}

/**
 * Create JS file on plugin activation
 */
register_activation_hook(__FILE__, 'mpauth_create_js_file');
function mpauth_create_js_file() {
    $js_content = <<<EOT
(function(\$) {
    "use strict";
    
    \$(document).ready(function() {
        var container = \$("#marketplace-container");
        
        // Always load the marketplace, but with or without token based on login status
        var marketplaceUrl = mpauthData.marketplaceUrl;
        
        // If user is logged in, get auth token and add it to the URL
        if (mpauthData.isLoggedIn) {
            \$.ajax({
                url: mpauthData.apiUrl,
                method: "GET",
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', mpauthData.nonce);
                },
                success: function(data) {
                    if (data.token) {
                        // Store token in sessionStorage (more secure than localStorage)
                        sessionStorage.setItem("wp_marketplace_token", data.token);
                        
                        // Add token to marketplace URL
                        if (marketplaceUrl.indexOf("?") > -1) {
                            marketplaceUrl += "&token=" + encodeURIComponent(data.token);
                        } else {
                            marketplaceUrl += "?token=" + encodeURIComponent(data.token);
                        }
                        
                        // Load marketplace in iframe with token
                        loadMarketplaceIframe(marketplaceUrl);
                    }
                },
                error: function(xhr) {
                    // If token retrieval fails, still load marketplace but without token
                    loadMarketplaceIframe(marketplaceUrl);
                    console.error("Failed to get authentication token:", xhr);
                }
            });
        } else {
            // User is not logged in, load marketplace without token
            loadMarketplaceIframe(marketplaceUrl);
        }
        
        // Function to load the marketplace iframe
        function loadMarketplaceIframe(url) {
            container.html(
                '<iframe src="' + url + '" ' +
                'id="marketplace-iframe" ' +
                'width="100%" ' +
                'height="800" ' +
                'style="border:none; min-height:800px; width:100%; max-width:100%; overflow:hidden;" ' +
                'allow="clipboard-read; clipboard-write" ' +
                'scrolling="yes" ' +
                '></iframe>'
            );
            
            // Setup message listener for iframe communication
            window.addEventListener('message', function(event) {
                // Verify origin
                var marketplaceOrigin = new URL(mpauthData.marketplaceUrl).origin;
                if (event.origin !== marketplaceOrigin) return;
                
                // Handle login required message
                if (event.data.action === 'requireLogin') {
                    window.location.href = mpauthData.loginUrl;
                }
                
                // Handle resize iframe
                if (event.data.action === 'resize' && event.data.height) {
                    \$('#marketplace-iframe').height(event.data.height);
                }
            });
        }
    });
})(jQuery);
EOT;
    
    $js_file = plugin_dir_path(__FILE__) . 'marketplace-auth.js';
    file_put_contents($js_file, $js_content);
    
    // Also update the JS file immediately to ensure it's updated without requiring reactivation
    $js_file_url = plugin_dir_url(__FILE__) . 'marketplace-auth.js';
    wp_enqueue_script('mpauth-script-update', $js_file_url, ['jquery'], time(), true);
}

/**
 * Update JS file on plugin load to ensure it's always up to date
 */
add_action('plugins_loaded', 'mpauth_update_js_file');
function mpauth_update_js_file() {
    // Call the create function to ensure the JS file is up to date
    mpauth_create_js_file();
}
