# Testing WordPress Login Integration with the Marketplace

This guide explains how to test the WordPress login integration with the custom marketplace.

## Prerequisites

- Node.js 18.18.0 or higher (required by Next.js)
- A running WordPress site with the custom login plugin at https://masteringhomecare.com/login-custom/

## Setup

1. Make sure you have the correct Node.js version installed:
   ```bash
   node --version
   ```
   If it's below 18.18.0, you'll need to upgrade Node.js.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Testing Options

### Option 1: Using the Test Page (Recommended for Development)

1. Navigate to http://localhost:3000/test-wordpress-login
2. Fill in the test user details (or use the defaults)
3. Click "Generate Token" to create a test JWT token
4. Click "Verify Token" to check if the token is valid
5. Click "Simulate Login Redirect" to test the login flow with the marketplace
6. After redirect, check if the marketplace recognizes you as logged in:
   - The header should show your username
   - The member discount badge should be visible
   - Product prices should display member discounts

### Option 2: Using the WordPress Login Flow (Real Integration)

1. Start the marketplace development server
2. Visit https://masteringhomecare.com/login-custom/
3. Log in with your WordPress credentials
4. The WordPress site should redirect you back to the marketplace with a JWT token
5. The marketplace should recognize you as logged in and show member discounts

## How It Works

1. **WordPress Authentication**:
   - When a user logs in on the WordPress site, the custom plugin generates a JWT token
   - The token contains user information (ID, email, display name, roles)
   - The WordPress site redirects back to the marketplace with the token as a query parameter

2. **Marketplace Authentication**:
   - The marketplace's `AuthProvider` component detects the token in the URL
   - It verifies the token and extracts the user information
   - If valid, it stores the token in sessionStorage and updates the authentication state
   - The UI updates to show the user as logged in and applies member discounts

3. **Member Discounts**:
   - The `memberDiscountPercentage` setting controls the discount percentage for logged-in users
   - This can be configured in the admin settings page
   - The `ProductCard` component applies this discount to product prices for logged-in users

## Troubleshooting

### Token Verification Issues

If the token verification fails, check:
- The `WP_JWT_SECRET` environment variable matches between WordPress and the marketplace
- The token hasn't expired (default expiration is 1 hour)
- The token is properly formatted and contains all required fields

### Login Flow Issues

If the login flow doesn't work:
- Check the WordPress plugin configuration
- Ensure the redirect URL is correct
- Check browser console for any errors
- Verify that the token is being passed correctly in the URL

### Discount Not Showing

If member discounts aren't showing:
- Verify that you're logged in (check the header)
- Check the `memberDiscountPercentage` setting in the admin panel
- Look at the browser console for any errors

## WordPress Plugin Integration

The WordPress plugin should:
1. Handle user authentication on the WordPress side
2. Generate a JWT token with user information
3. Redirect to the marketplace with the token as a query parameter

Example redirect URL:
```
http://localhost:3000/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Testing with the WordPress Plugin

To test with the actual WordPress plugin:

1. Configure the plugin with the correct redirect URL (your marketplace URL)
2. Set the same JWT secret in both the WordPress plugin and the marketplace
3. Log in through the WordPress site
4. You should be redirected to the marketplace with a valid token
5. The marketplace should recognize you as logged in
