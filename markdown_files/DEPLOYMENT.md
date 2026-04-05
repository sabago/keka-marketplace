# Deployment Guide - Automated Content Import

This project uses Docker for deployment with automatic content import on Railway.

## 🚀 How It Works

When you deploy to Railway, the following happens automatically:

1. **Docker Build** - Railway builds the Docker image using `Dockerfile`
2. **Database Migration** - Prisma migrations run automatically
3. **Content Import** - All 125 articles from `src/content/massachusetts/` are imported
4. **Server Start** - Next.js server starts and serves the app

## 📋 Deployment Steps

### 1. Commit and Push

```bash
git add .
git commit -m "Deploy with automated content import"
git push origin main
```

### 2. Railway Auto-Deploys

Railway will automatically:
- Detect the `railway.json` config
- Build using the `Dockerfile`
- Run the `docker-entrypoint.sh` script which:
  - Waits for database to be ready
  - Runs Prisma migrations
  - Imports all content articles
  - Starts the server

### 3. Verify Deployment

Once deployment completes:
- Visit your Railway URL
- Navigate to `/knowledge-base`
- You should see all 125 articles with categories

## 🔄 Updating Content

To add or update articles:

1. Edit/add markdown files in `src/content/massachusetts/`
2. Commit and push:
   ```bash
   git add src/content/
   git commit -m "Update content articles"
   git push origin main
   ```
3. Railway will redeploy and automatically re-import all content

## 📁 Files Added for Docker Deployment

- `Dockerfile` - Multi-stage Docker build configuration
- `docker-entrypoint.sh` - Startup script that runs migrations and import
- `.dockerignore` - Excludes unnecessary files from Docker image
- `railway.json` - Tells Railway to use Docker instead of Nixpacks
- `next.config.ts` - Updated with `output: 'standalone'` for Docker

## ⚙️ Environment Variables

Make sure these are set in Railway:

- `DATABASE_URL` - PostgreSQL connection string (Railway provides this automatically)
- `NODE_ENV=production`
- Any other env vars from your `.env` file

## 🐛 Troubleshooting

### Deployment Fails at Import Step

Check Railway logs. If the import fails:
- Ensure `src/content/massachusetts/` is committed to git
- Verify DATABASE_URL is accessible from the container
- Check that Prisma migrations completed successfully

### Articles Not Showing Up

1. Check Railway logs for import script output
2. Verify the script completed: Look for "✅ Import complete!"
3. Check database directly using Railway's PostgreSQL console

### Need to Re-Import Manually

If you need to manually trigger a re-import:

1. SSH into Railway container (if available)
2. Or, connect to Railway database from local:
   ```bash
   DATABASE_URL="your-railway-database-url" \
   npx tsx scripts/import-content-to-db.ts
   ```

## 🎯 Benefits of This Approach

✅ **Automated** - Content imports on every deployment
✅ **Consistent** - Same process every time
✅ **No Manual Steps** - Push code and you're done
✅ **Always In Sync** - Content matches your codebase version
✅ **Reproducible** - Works the same locally and in production

## 🔐 Security Notes

- The import script only runs during container startup
- It uses the same DATABASE_URL that the app uses
- No credentials are hardcoded in the Dockerfile
- Content files are part of the Docker image (private repo)
