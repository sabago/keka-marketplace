#!/bin/bash

# This script helps update the environment variables in Railway for WordPress integration

# Exit on error
set -e

echo "🚀 WordPress Integration Setup"
echo "=============================="
echo ""
echo "This script will help you update the environment variables in Railway for WordPress integration."
echo ""

# Prompt for WordPress secret key
echo "Enter the WordPress JWT Secret Key from the WordPress plugin settings:"
read -p "> " WP_JWT_SECRET

# Prompt for WordPress domain
echo ""
echo "Enter the WordPress domain (without https:// or trailing slash, e.g. masteringhomecare.com):"
read -p "> " WORDPRESS_DOMAIN

# Confirm the values
echo ""
echo "Please confirm these values:"
echo "WordPress JWT Secret Key: $WP_JWT_SECRET"
echo "WordPress Domain: $WORDPRESS_DOMAIN"
echo ""
read -p "Are these values correct? (y/n) " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
  echo "Aborting. Please run the script again with the correct values."
  exit 1
fi

# Create a temporary .env file with the new variables
echo "Creating temporary .env file with the new variables..."
cat > .env.wordpress << EOL
# WordPress Integration
WP_JWT_SECRET=$WP_JWT_SECRET
NEXT_PUBLIC_WORDPRESS_DOMAIN=$WORDPRESS_DOMAIN
ALLOWED_ORIGINS=https://$WORDPRESS_DOMAIN
EOL

echo ""
echo "✅ Created .env.wordpress file with the following variables:"
cat .env.wordpress
echo ""

# Instructions for updating Railway variables
echo "To update the environment variables in Railway:"
echo ""
echo "Option 1: Use the Railway CLI (if installed):"
echo "  railway variables set --from-file .env.wordpress"
echo ""
echo "Option 2: Manually add these variables in the Railway dashboard:"
echo "  1. Go to https://railway.app/dashboard"
echo "  2. Select your project (keka-marketplace)"
echo "  3. Click on the 'Variables' tab"
echo "  4. Add the following variables:"
echo "     - WP_JWT_SECRET=$WP_JWT_SECRET"
echo "     - NEXT_PUBLIC_WORDPRESS_DOMAIN=$WORDPRESS_DOMAIN"
echo "     - ALLOWED_ORIGINS=https://$WORDPRESS_DOMAIN"
echo ""
echo "After updating the variables, deploy the application again to apply the changes."
echo ""
echo "To test the integration, visit:"
echo "  https://keka-marketplace-production.up.railway.app/test-wordpress-login"
echo ""
echo "Then add the shortcode to your WordPress page:"
echo "  [marketplace_auth height=\"800px\"]"
