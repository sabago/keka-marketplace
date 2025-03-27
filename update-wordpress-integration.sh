#!/bin/bash

# Script to update the WordPress plugin files on the server
# This script assumes you have SSH access to the server and know the path to the WordPress plugins directory

# Configuration - Update these variables with your server details
SERVER_USER="your-server-username"
SERVER_HOST="your-server-hostname"
WORDPRESS_PLUGINS_PATH="/path/to/wordpress/wp-content/plugins"

# Local plugin files
LOCAL_PHP_FILE="marketplace-auth/marketplace-auth.php"
LOCAL_JS_FILE="marketplace-auth/marketplace-auth.js"

# Check if files exist locally
if [ ! -f "$LOCAL_PHP_FILE" ] || [ ! -f "$LOCAL_JS_FILE" ]; then
    echo "Error: Local plugin files not found. Make sure you're running this script from the correct directory."
    exit 1
fi

echo "Updating WordPress plugin files on the server..."

# Create a temporary directory for the plugin
echo "Creating temporary directory..."
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $WORDPRESS_PLUGINS_PATH/marketplace-auth-temp"

# Upload the files
echo "Uploading PHP file..."
scp "$LOCAL_PHP_FILE" $SERVER_USER@$SERVER_HOST:"$WORDPRESS_PLUGINS_PATH/marketplace-auth-temp/marketplace-auth.php"

echo "Uploading JS file..."
scp "$LOCAL_JS_FILE" $SERVER_USER@$SERVER_HOST:"$WORDPRESS_PLUGINS_PATH/marketplace-auth-temp/marketplace-auth.js"

# Move the files to the plugin directory
echo "Moving files to plugin directory..."
ssh $SERVER_USER@$SERVER_HOST "
    # Backup existing files
    if [ -d '$WORDPRESS_PLUGINS_PATH/marketplace-auth' ]; then
        cp -r '$WORDPRESS_PLUGINS_PATH/marketplace-auth' '$WORDPRESS_PLUGINS_PATH/marketplace-auth-backup'
    fi
    
    # Move new files
    mkdir -p '$WORDPRESS_PLUGINS_PATH/marketplace-auth'
    mv '$WORDPRESS_PLUGINS_PATH/marketplace-auth-temp/marketplace-auth.php' '$WORDPRESS_PLUGINS_PATH/marketplace-auth/'
    mv '$WORDPRESS_PLUGINS_PATH/marketplace-auth-temp/marketplace-auth.js' '$WORDPRESS_PLUGINS_PATH/marketplace-auth/'
    
    # Clean up
    rm -rf '$WORDPRESS_PLUGINS_PATH/marketplace-auth-temp'
    
    # Set permissions
    chmod 644 '$WORDPRESS_PLUGINS_PATH/marketplace-auth/marketplace-auth.php'
    chmod 644 '$WORDPRESS_PLUGINS_PATH/marketplace-auth/marketplace-auth.js'
"

echo "WordPress plugin updated successfully!"
echo "Note: You may need to clear your browser cache or use incognito mode to see the changes."
echo "If you encounter any issues, a backup of the original plugin is available at $WORDPRESS_PLUGINS_PATH/marketplace-auth-backup"
