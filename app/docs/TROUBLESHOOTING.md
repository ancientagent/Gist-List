# GISTer Troubleshooting Guide

## Overview
This guide documents all issues encountered during Pass A setup and their solutions. Use this as a reference for future troubleshooting.

---

## Database Connection Issues

### Issue 1: Connection Pool Timeout

**Error Message:**
```
Invalid `prisma.user.findUnique()` invocation:
Timed out fetching a new connection from the connection pool.
More info: http://pris.ly/d/connection-pool
(Current connection pool timeout: 10, connection limit: 33)
```

**Cause:**
- WSL2 to hosted PostgreSQL database has 20-30 second query latency
- Default pool timeout (10s) too short for slow connections
- Multiple concurrent requests exhaust connection pool

**Solution:**
Update DATABASE_URL in `.env` with optimized parameters:

```env
DATABASE_URL='postgresql://user:pass@host:5432/db?connect_timeout=60&pool_timeout=60&connection_limit=1&statement_cache_size=0'
```

**Parameters explained:**
- `connect_timeout=60`: Allow 60 seconds for initial connection
- `pool_timeout=60`: Allow 60 seconds to acquire connection from pool
- `connection_limit=1`: Single connection (prevents pool exhaustion)
- `statement_cache_size=0`: Disable caching (reduces overhead)

**Alternative:**
Test on production (https://gistlist.abacusai.app) where database connection is fast.

---

### Issue 2: Database Validation Error

**Error Message:**
```
Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`.
```

**Cause:**
Conflicting `.env.local` file with SQLite URL overriding `.env` PostgreSQL URL.

**Solution:**
```bash
rm -f .env.local
# Restart dev server
npm run dev
```

**Prevention:**
Next.js precedence for env files:
1. `.env.local` (highest priority)
2. `.env.development` / `.env.production`
3. `.env` (lowest priority)

Only use `.env.local` for local overrides that shouldn't be committed.

---

## Prisma Client Issues

### Issue 3: Prisma Client Not Initialized

**Error Message:**
```
Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
```

**Cause:**
WSL2 path resolution mismatch:
- Prisma generates to: `/home/ubuntu/gist_list/app/node_modules/.prisma/client/`
- App expects it at: `/mnt/c/Gist-List/app/node_modules/.prisma/client/`

**Root Cause:**
`prisma/schema.prisma` has hardcoded output path:
```prisma
generator client {
  provider = "prisma-client-js"
  output = "/home/ubuntu/gist_list/app/node_modules/.prisma/client"
}
```

**Solution:**

**Step 1**: Generate Prisma client
```bash
cd /mnt/c/Gist-List/app
npx prisma generate
```

**Step 2**: Copy to correct location
```bash
cp -r /home/ubuntu/gist_list/app/node_modules/.prisma/client/* /mnt/c/Gist-List/app/node_modules/.prisma/client/
```

**Step 3**: Clear Next.js cache
```bash
rm -rf .next
```

**Step 4**: Restart dev server
```bash
npm run dev
```

**Verification:**
```bash
ls -la /mnt/c/Gist-List/app/node_modules/.prisma/client/ | grep libquery
```

Should see:
```
libquery_engine-debian-openssl-3.0.x.so.node
libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node
schema.prisma
```

---

### Issue 4: Permission Denied Creating /home/ubuntu

**Error Message:**
```
EACCES: permission denied, mkdir '/home/ubuntu'
```

**Cause:**
Prisma trying to create `/home/ubuntu` directory but user lacks permissions.

**Solution:**
```bash
sudo mkdir -p /home/ubuntu
sudo chown $USER:$USER /home/ubuntu
```

Then regenerate Prisma client:
```bash
npx prisma generate
```

---

## TypeScript Compilation Issues

### Issue 5: Implicit Any Type Error

**Error Message:**
```
app/api/user/costs/route.ts:66
Parameter 'listing' implicitly has an 'any' type.
```

**Location:** `app/api/user/costs/route.ts` line 66

**Cause:**
Missing type annotation on map function parameter.

**Solution:**

**Before:**
```typescript
recentListings: listings.map(listing => ({
  id: listing.id,
  title: listing.title || 'Untitled',
  // ...
}))
```

**After:**
```typescript
recentListings: listings.map((listing: typeof listings[0]) => ({
  id: listing.id,
  title: listing.title || 'Untitled',
  // ...
}))
```

**Verification:**
```bash
npm run typecheck
```

---

## Dependency Installation Issues

### Issue 6: Peer Dependency Conflicts

**Error Message:**
```
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! While resolving: gist-list@0.1.0
npm ERR! Found: react@18.2.0
```

**Cause:**
Project uses Yarn (yarn.lock exists) but dependencies have peer conflicts with npm.

**Solution:**
```bash
npm install --legacy-peer-deps
```

**Why this works:**
`--legacy-peer-deps` tells npm to ignore peer dependency conflicts and use npm v6 behavior.

**Note:** Do NOT use `npm ci` - there's no package-lock.json.

---

## Authentication Issues

### Issue 7: Slow Sign-in/Sign-up (20-30 seconds)

**Symptom:**
- Sign-in form hangs for 20-30 seconds
- Eventually returns 500 or 401 error
- Console shows database timeout errors

**Cause:**
Each authentication query to hosted PostgreSQL takes 20-30 seconds from WSL2.

**Solution:**
This is expected behavior for WSL2 local development.

**Options:**
1. **Wait it out**: Queries will complete, just slowly
2. **Use production**: Test at https://gistlist.abacusai.app
3. **Create test account on production**: Sign up once on production, then test there

**Not a Solution:**
- Increasing timeouts further (already at 60s)
- Adding more connections (makes it worse)

---

### Issue 8: 401 Unauthorized on Sign-in

**Error:**
```
POST /api/auth/callback/credentials 401 in 28140ms
```

**Cause:**
Either:
1. Wrong credentials entered
2. User account doesn't exist in database yet

**Solution:**

**If no account exists:**
1. Create account via production: https://gistlist.abacusai.app/signup
2. Then sign in locally (will still be slow but will work)

**If account exists:**
- Verify email/password are correct
- Check for typos (especially in password)

---

## Next.js Build Issues

### Issue 9: Stale Build Cache

**Symptom:**
- Changes not reflecting
- Old errors persisting after fixes
- Prisma changes not taking effect

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node module cache
rm -rf node_modules/.cache

# Restart dev server
npm run dev
```

**When to use:**
- After Prisma client regeneration
- After environment variable changes
- When seeing stale/cached behavior

---

## Development Server Issues

### Issue 10: Port 3000 Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause:**
Multiple dev servers running or orphaned process.

**Solution:**

**Option 1: Find and kill process**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

**Option 2: Use different port**
```bash
PORT=3001 npm run dev
```

---

## WSL2-Specific Issues

### Issue 11: Windows Path vs. WSL Path

**Symptom:**
- Files exist in Windows but can't be found in WSL
- Permission errors on Windows directories

**Cause:**
WSL mounts Windows drives at `/mnt/c/`, `/mnt/d/`, etc.

**Solution:**

**Windows path:**
```
C:\Gist-List\app
```

**WSL path:**
```bash
/mnt/c/Gist-List/app
```

**Always use WSL paths** in commands:
```bash
cd /mnt/c/Gist-List/app  # Correct
cd C:\Gist-List\app       # Wrong
```

---

### Issue 12: File Permissions in WSL

**Symptom:**
```
EACCES: permission denied
```

**Cause:**
WSL default file permissions for Windows files.

**Solution:**

**For directories:**
```bash
sudo chown -R $USER:$USER /path/to/directory
```

**For single files:**
```bash
sudo chmod +x /path/to/file
```

**Check permissions:**
```bash
ls -la /path/to/file
```

---

## Environment Variable Issues

### Issue 13: .env Not Loading

**Symptom:**
- Environment variables undefined
- Database connection fails with "invalid URL"

**Cause:**
1. `.env` file doesn't exist
2. Wrong file name (`.env.example` instead of `.env`)
3. Syntax errors in `.env`

**Solution:**

**Check file exists:**
```bash
ls -la .env
```

**Verify contents:**
```bash
cat .env
```

**Common syntax errors:**
```env
# Wrong (spaces around =)
DATABASE_URL = 'postgresql://...'

# Wrong (missing quotes for special chars)
DATABASE_URL=postgresql://user:pass@host:5432/db?timeout=60

# Correct
DATABASE_URL='postgresql://user:pass@host:5432/db?timeout=60'
```

**Verify loading:**
```bash
# In dev server output, should see:
# - Environments: .env
```

---

## Diagnostic Commands

### Check System State

```bash
# Node version (should be v20.19.5)
node --version

# Current directory
pwd

# List files
ls -la

# Check if dev server running
curl http://localhost:3000

# Check Prisma client
ls -la node_modules/.prisma/client/

# Verify database URL in env
cat .env | grep DATABASE_URL
```

### Check Dev Server

```bash
# View running background processes
jobs

# Check port usage
lsof -ti:3000

# Kill all node processes (use carefully)
killall node
```

### Full Reset

If all else fails:

```bash
# Kill all dev servers
killall node

# Clear all caches
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
npm install --legacy-peer-deps

# Regenerate Prisma
npx prisma generate
cp -r /home/ubuntu/gist_list/app/node_modules/.prisma/client/* /mnt/c/Gist-List/app/node_modules/.prisma/client/

# Start fresh
npm run dev
```

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Copy Prisma to correct location
cp -r /home/ubuntu/gist_list/app/node_modules/.prisma/client/* /mnt/c/Gist-List/app/node_modules/.prisma/client/

# Clear cache
rm -rf .next

# Type check
npm run typecheck

# Start dev server
npm run dev

# Kill dev server
killall node
```

### File Paths

```bash
# Project root
/mnt/c/Gist-List/app

# Environment
/mnt/c/Gist-List/app/.env

# Prisma schema
/mnt/c/Gist-List/app/prisma/schema.prisma

# Prisma client (expected)
/mnt/c/Gist-List/app/node_modules/.prisma/client/

# Prisma client (generated)
/home/ubuntu/gist_list/app/node_modules/.prisma/client/

# Next.js cache
/mnt/c/Gist-List/app/.next
```

---

## Getting Help

**For setup issues:**
- Reference: `/docs/LOCAL_SETUP.md`
- This file: `/docs/TROUBLESHOOTING.md`

**For feature questions:**
- Reference: `/docs/INDEX.md`
- Changelog: `/docs/overview/CHANGELOG.md`

**For team process:**
- Reference: `/docs/TEAM_WORKFLOW.md`

**For production issues:**
- Contact: DeepAgent
- URL: https://gistlist.abacusai.app

---

## Contributing to This Guide

Encountered a new issue? Document it:

1. Add issue to appropriate section
2. Include error message (exact text)
3. Explain cause
4. Provide solution with commands
5. Test solution works
6. Update Quick Reference if needed

**Format:**
```markdown
### Issue X: Brief Description

**Error Message:**
```
Exact error text
```

**Cause:**
Why this happens

**Solution:**
How to fix it
```
