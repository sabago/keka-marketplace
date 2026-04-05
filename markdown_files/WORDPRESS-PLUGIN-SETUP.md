# WordPress Plugin Setup for Marketplace Authentication

This guide explains how to set up the WordPress plugin for authentication with the custom marketplace.

## Plugin Overview

The "Marketplace Authentication" plugin provides JWT-based authentication between a WordPress site and the custom marketplace. It:

1. Generates JWT tokens for logged-in WordPress users
2. Provides a shortcode to embed the marketplace with authentication
3. Handles the authentication flow between WordPress and the marketplace

## Installation

1. Upload the `marketplace-auth` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure the plugin settings

## Configuration

### 1. Access Plugin Settings

Navigate to **Settings > Marketplace Auth** in the WordPress admin dashboard.

### 2. Configure Settings

- **Secret Key**: This is automatically generated. Copy this key to use in your marketplace application.
- **Marketplace URL**: Enter the URL of your marketplace application (e.g., `http://localhost:3000` for local development or your production URL).
- **Regenerate Key**: Check this box if you need to generate a new secret key (warning: this will invalidate all existing tokens).

### 3. Save Changes

Click the "Save Changes" button to store your settings.

## Using the Plugin

### Add the Shortcode

Add the `[marketplace_auth]` shortcode to any WordPress page where you want to embed the marketplace.

Example:
```
[marketplace_auth height="800px"]
```

The `height` parameter is optional and defaults to 800px.

### Custom Login Page

To create a custom login page that redirects to the marketplace:

1. Create a new page in WordPress
2. Add the following content:

```html
<div class="login-container">
  <h2>Login to Access the Marketplace</h2>
  
  <?php if (!is_user_logged_in()): ?>
    <?php
      // Get the current page URL
      $redirect = get_permalink();
      
      // Display the login form with redirect
      $args = array(
        'redirect' => $redirect,
        'form_id' => 'marketplace-login-form',
        'label_username' => 'Email or Username',
        'label_password' => 'Password',
        'label_remember' => 'Remember Me',
        'label_log_in' => 'Log In',
      );
      wp_login_form($args);
    ?>
    
    <p class="register-link">
      Don't have an account? <a href="<?php echo wp_registration_url(); ?>">Register here</a>
    </p>
  <?php else: ?>
    <p>You are already logged in.</p>
    <p><a href="<?php echo get_permalink(get_option('mpauth_marketplace_page')); ?>">Go to Marketplace</a></p>
  <?php endif; ?>
</div>
```

3. Style the login form as needed with CSS

## Marketplace Configuration

In your marketplace application, you need to:

1. Set the same secret key in the environment variables:
   ```
   WP_JWT_SECRET=your_secret_key_from_wordpress_settings
   ```

2. Implement token verification in your API routes

## How the Authentication Flow Works

1. User visits the WordPress page with the `[marketplace_auth]` shortcode
2. If not logged in, they see a login prompt
3. After logging in, the WordPress plugin:
   - Generates a JWT token with user information
   - Passes the token to the marketplace via URL parameter
4. The marketplace:
   - Verifies the token
   - Extracts user information
   - Provides a personalized experience (member discounts, etc.)

## Testing the Integration

1. Configure the plugin with your marketplace URL
2. Add the shortcode to a WordPress page
3. Visit the page while logged out - you should see a login prompt
4. Log in with a WordPress account
5. You should be redirected to the marketplace with authentication

## Troubleshooting

### Token Verification Fails

- Ensure the secret key is the same in both WordPress and the marketplace
- Check that the token hasn't expired (default is 1 hour)
- Verify that the marketplace URL is correct in the plugin settings

### Iframe Not Loading

- Check browser console for CORS errors
- Ensure the marketplace URL is accessible from the WordPress site
- Verify that the marketplace is properly handling the token parameter

### Other Issues

- Check the WordPress error log for PHP errors
- Check the browser console for JavaScript errors
- Verify that the plugin is properly activated

## Security Considerations

- Keep your secret key secure and don't expose it in client-side code
- Use HTTPS for both WordPress and marketplace sites in production
- Regularly update the plugin and marketplace code
- Consider implementing token refresh for long user sessions
