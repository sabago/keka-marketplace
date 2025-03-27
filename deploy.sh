#!/bin/bash

# This script automates the deployment process for the marketplace app to Railway

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# 1. Commit changes
echo "📝 Committing changes..."
git add .
git commit -m "Deploy: Update database configuration for Railway" || true

# 2. Push to GitHub
echo "📤 Pushing to GitHub..."
echo "Note: Pushing to GitHub will automatically trigger a deployment on Railway if GitHub integration is set up"
git push

# 3. Wait for Railway to deploy
echo "⏳ Waiting for Railway to deploy..."
echo "Note: Railway should automatically detect the changes and start a new deployment"
echo "You can check the status of the deployment in the Railway dashboard: https://railway.app/dashboard"

# 4. Apply database migrations to Railway
echo "🔄 Applying database migrations to Railway..."
echo "Note: This step is handled automatically by Railway during deployment"

# 5. Seed the database if needed
echo "🌱 Seeding the database..."
echo "Note: You can run the seed script manually if needed:"
echo "node src/scripts/seed-categories.js"
echo "node src/scripts/seed-projects.js"

# Manual deployment instructions
echo ""
echo "📋 If automatic deployment doesn't work, you can manually deploy from the Railway dashboard:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Select your project (keka-marketplace)"
echo "3. Click on the 'Deploy' or 'Redeploy' button"
echo ""

echo "✅ Deployment process completed!"
echo "🌐 Your app should be available at: https://keka-marketplace-production.up.railway.app"
echo "⏱️ It may take a few minutes for the changes to propagate."
echo ""
echo "🔍 To verify the database connection, visit: https://keka-marketplace-production.up.railway.app/api/test-db"
