# Testing Docker Setup Locally

This guide shows how to test the Docker deployment locally before pushing to Railway.

## 🧪 Prerequisites

Make sure you have installed:
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes docker-compose)
- Running Docker daemon

Check if Docker is running:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Quick Start - Test Full Setup

### 1. Make Scripts Executable

```bash
chmod +x docker-entrypoint.sh
```

### 2. Build and Start Everything

```bash
# Build and start both PostgreSQL and the app
docker-compose up --build
```

This will:
- ✅ Start PostgreSQL container
- ✅ Build your Next.js app
- ✅ Wait for database to be ready
- ✅ Run Prisma migrations
- ✅ Import all 125 articles
- ✅ Start the server

### 3. Test the Application

Visit: **http://localhost:3002/knowledge-base**

You should see all 125 articles with categories!

### 4. Stop When Done

```bash
# Stop containers (keeps data)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

---

## 🔍 Step-by-Step Testing

### Option 1: Test Just the Build (Faster)

```bash
# Build the Docker image only
docker build -t marketplace-test .

# This tests:
# - Dependencies install correctly
# - Prisma generates properly
# - Next.js builds successfully
# - All files are copied correctly
```

### Option 2: Test with Fresh Database

```bash
# Start fresh PostgreSQL
docker-compose up -d postgres

# Wait 5 seconds for DB to be ready
sleep 5

# Build and run app
docker-compose up --build app
```

### Option 3: Test Import Script Only

```bash
# Start just the database
docker-compose up -d postgres

# Run import script against Docker database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/marketplace_docker" \
npx prisma migrate deploy

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/marketplace_docker" \
npx tsx scripts/import-content-to-db.ts
```

---

## 📊 Monitoring and Debugging

### View Logs

```bash
# Follow logs from both containers
docker-compose logs -f

# Just app logs
docker-compose logs -f app

# Just database logs
docker-compose logs -f postgres
```

### Check Container Status

```bash
# List running containers
docker-compose ps

# Detailed status
docker ps
```

### Connect to Database

```bash
# From your host machine
psql postgresql://postgres:postgres@localhost:5433/marketplace_docker

# Inside container
docker-compose exec postgres psql -U postgres -d marketplace_docker

# Check articles
SELECT COUNT(*), category FROM "KnowledgeBaseArticle" GROUP BY category;
```

### Shell into Container

```bash
# Access app container shell
docker-compose exec app sh

# Then you can run:
ls -la /app
cat /app/.env
npx prisma studio
```

---

## 🐛 Common Issues & Solutions

### Issue: "Port already in use"

**Solution:** Change ports in `docker-compose.yml`:
```yaml
ports:
  - "3003:3000"  # Change 3002 to 3003
```

### Issue: "Database connection failed"

**Check:**
1. PostgreSQL container is running: `docker-compose ps`
2. Health check is passing: `docker-compose logs postgres`
3. Wait longer for DB startup (increase sleep time)

**Solution:**
```bash
# Restart with fresh state
docker-compose down -v
docker-compose up --build
```

### Issue: "Import script fails"

**Check logs:**
```bash
docker-compose logs app | grep "Import"
```

**Common causes:**
- Content files not in Docker image → Check `.dockerignore`
- Database not ready → Entrypoint script should wait
- Prisma Client not generated → Check build logs

**Solution:**
```bash
# Rebuild without cache
docker-compose build --no-cache app
docker-compose up app
```

### Issue: "node_modules or .next missing"

This means the standalone build didn't work properly.

**Solution:**
Check `next.config.ts` has:
```typescript
output: 'standalone'
```

Then rebuild:
```bash
docker-compose build --no-cache app
```

---

## ✅ Testing Checklist

Before deploying to Railway, verify:

- [ ] Docker build completes without errors
- [ ] PostgreSQL container starts and is healthy
- [ ] Prisma migrations run successfully
- [ ] Import script completes (see "✅ Import complete!")
- [ ] Server starts on port 3000
- [ ] Can access http://localhost:3002
- [ ] All 125 articles appear in `/knowledge-base`
- [ ] Categories work and show correct counts
- [ ] Sidebar navigation functions
- [ ] Individual articles load correctly
- [ ] No errors in docker logs

---

## 🔄 Testing Changes

After making changes to code:

```bash
# Rebuild and restart
docker-compose up --build

# Or, rebuild without cache if issues persist
docker-compose build --no-cache
docker-compose up
```

After making changes to content:

```bash
# Articles will auto-import on container start
docker-compose restart app

# Or force fresh import
docker-compose up --build app
```

---

## 📈 Performance Testing

```bash
# Time the build
time docker build -t marketplace-test .

# Check image size
docker images marketplace-test

# Monitor resource usage while running
docker stats
```

Typical metrics:
- **Build time:** 3-5 minutes
- **Image size:** 500-800 MB
- **Memory usage:** 300-500 MB
- **Startup time:** 30-60 seconds (including import)

---

## 🎯 What Gets Tested

Running `docker-compose up --build` tests:

1. ✅ **Build Process**
   - All dependencies install
   - TypeScript compiles
   - Next.js builds
   - Prisma generates

2. ✅ **Runtime Environment**
   - Container starts successfully
   - Database connection works
   - Environment variables load

3. ✅ **Deployment Scripts**
   - Entrypoint script executes
   - Migrations run
   - Import script works
   - Server starts

4. ✅ **Application**
   - Routes are accessible
   - Data is in database
   - UI renders correctly

This is **identical** to what will run on Railway!

---

## 🚀 Ready to Deploy?

Once all tests pass:

```bash
# Clean up local test environment
docker-compose down -v

# Commit and deploy to Railway
git add .
git commit -m "Add Docker deployment with automated import"
git push origin main
```

Railway will use the **exact same** Dockerfile and process! 🎉
