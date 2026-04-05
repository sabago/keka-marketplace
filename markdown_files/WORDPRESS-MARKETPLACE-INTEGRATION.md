# Integrating the Custom Marketplace with WordPress

This guide explains how to render the custom marketplace on your WordPress site at https://masteringhomecare.com/marketplace/.

## Overview

The integration between WordPress and the custom marketplace uses:
1. A WordPress plugin (`marketplace-auth`) that handles authentication
2. JWT tokens to securely pass user information
3. An iframe to embed the marketplace within the WordPress page

## Step 1: Install and Configure the WordPress Plugin

1. **Upload the plugin**:
   - Upload the `marketplace-auth` folder to `/wp-content/plugins/` on your WordPress site
   - Activate the plugin through the WordPress admin dashboard

2. **Configure the plugin settings**:
   - Go to **Settings > Marketplace Auth** in the WordPress admin
   - Set the **Marketplace URL** to your deployed Railway application:
     ```
     https://keka-marketplace-production.up.railway.app
     ```
   - Copy the **Secret Key** - you'll need this for the marketplace application

## Step 2: Configure the Marketplace Application

1. **Set the JWT secret key**:
   - Add the secret key from the WordPress plugin to your Railway environment variables:
   - In the Railway dashboard, go to your project
   - Click on the "Variables" tab
   - Add a new variable:
     ```
     WP_JWT_SECRET=your_secret_key_from_wordpress_plugin
     ```

2. **Configure CORS settings**:
   - Ensure your marketplace application allows requests from your WordPress domain
   - In the Railway dashboard, add these environment variables:
     ```
     NEXT_PUBLIC_WORDPRESS_DOMAIN=masteringhomecare.com
     ALLOWED_ORIGINS=https://masteringhomecare.com
     ```

3. **Deploy the changes**:
   - Push these changes to GitHub or manually deploy from the Railway dashboard
   - Wait for the deployment to complete

## Step 3: Add the Marketplace to WordPress

1. **Create or edit the marketplace page**:
   - Go to the WordPress admin dashboard
   - Navigate to Pages > All Pages
   - Edit the page at `/marketplace/` or create a new page

2. **Add the shortcode**:
   - Add the following shortcode to the page content:
     ```
     [marketplace_auth height="800px"]
     ```
   - Adjust the height as needed for your design

3. **Publish or update the page**

## Step 4: Test the Integration

1. **Test as a logged-out user**:
   - Visit https://masteringhomecare.com/marketplace/ in an incognito window
   - You should see a login prompt

2. **Test as a logged-in user**:
   - Log in to WordPress
   - Visit https://masteringhomecare.com/marketplace/
   - The marketplace should load in an iframe
   - You should be automatically authenticated (no login required)
   - Member discounts should be applied if configured

## How It Works

1. When a user visits the marketplace page on WordPress:
   - If not logged in, they see a login prompt
   - If logged in, the WordPress plugin generates a JWT token with their user information

2. The token is passed to the marketplace via URL parameter:
   ```
   https://keka-marketplace-production.up.railway.app?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. The marketplace application:
   - Detects the token in the URL
   - Verifies it using the shared secret key
   - Extracts user information (ID, email, display name, roles)
   - Provides a personalized experience with member discounts

## Troubleshooting

### Marketplace Not Loading

If the marketplace doesn't load in the iframe:

1. **Check the WordPress plugin settings**:
   - Ensure the Marketplace URL is correct
   - Verify the secret key matches what's in your Railway environment variables

2. **Check for CORS issues**:
   - Open browser developer tools (F12)
   - Look for CORS errors in the Console tab
   - Ensure your marketplace application allows requests from masteringhomecare.com

3. **Verify the token**:
   - Use the test page at `/test-wordpress-login` on your marketplace
   - Generate a test token and verify it works

### Authentication Issues

If users aren't being authenticated properly:

1. **Check the secret keys**:
   - Ensure the secret key in WordPress matches the `WP_JWT_SECRET` in Railway

2. **Check token expiration**:
   - The default token expiration is 1 hour
   - If users are active for longer, they may need to refresh the page

3. **Verify the WordPress plugin is active**:
   - Check that the plugin is properly activated in WordPress

## Customizing the Integration

### Adjusting the Iframe Height

You can change the height of the iframe by modifying the shortcode:
```
[marketplace_auth height="1000px"]
```

### Styling the Login Prompt

You can customize the login prompt by adding CSS to your WordPress theme:
```css
.login-required {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.login-required h3 {
  color: #333;
  margin-bottom: 20px;
}

.login-required a {
  display: inline-block;
  background-color: #0073aa;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
}

.login-required a:hover {
  background-color: #005177;
}
```

### Creating a Custom Login Page

For a better user experience, you can create a custom login page:

1. Create a new page in WordPress
2. Add the custom login form code from the WORDPRESS-PLUGIN-SETUP.md document
3. Style it to match your site's design
4. Configure the plugin to redirect to this page for login

## Security Considerations

- Always use HTTPS for both WordPress and the marketplace
- Regularly update the WordPress plugin and marketplace application
- Consider regenerating the secret key periodically (note: this will log out all users)
- Monitor for suspicious activity in both WordPress and marketplace logs
