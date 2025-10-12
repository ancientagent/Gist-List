# GISTer Local Development Setup

## Overview
This document covers setting up the GISTer application for local development and testing. This was documented during Pass A implementation and testing.

## Team Roles
- **GPT-5 Web Model**: Designed Pass A features and architecture
- **GPT-5 Codex Medium (Cursor)**: Executed Pass A implementation
- **Claude Code**: Local environment setup and troubleshooting
- **DeepAgent**: Production deployment and Sweep B execution

## Environment Requirements

### Prerequisites
- Node.js v20.19.5 (confirmed working)
- WSL2 (for Windows development)
- npm (with `--legacy-peer-deps` flag for installation)

### Database Architecture
**Important**: This project uses a **hosted PostgreSQL database** for all environments (development and production). There is no local database setup.

- Production DB: `db-a53f7d09.db002.hosteddb.reai.io:5432`
- No migrations folder (develops directly against hosted DB)
- Connection from local WSL2 has high latency (20-30 second queries)

## Initial Setup

### 1. Clone and Install
```bash
cd /mnt/c/Gist-List/app
npm install --legacy-peer-deps
```

**Why `--legacy-peer-deps`?**
- Project uses Yarn (yarn.lock present) but npm for package management
- Peer dependency conflicts require this flag

### 2. Prisma Client Generation

The Prisma client must be generated in the correct location due to WSL2 path resolution:

```bash
# Generate Prisma client
npx prisma generate

# If permission errors occur (EACCES /home/ubuntu):
sudo mkdir -p /home/ubuntu
sudo chown $USER:$USER /home/ubuntu
npx prisma generate

# Copy to correct location if needed:
cp -r /home/ubuntu/gist_list/app/node_modules/.prisma/client/* /mnt/c/Gist-List/app/node_modules/.prisma/client/
```

**Known Issue**: Prisma output path in schema.prisma points to `/home/ubuntu/gist_list/app/node_modules/.prisma/client`, but the app expects it in the `/mnt/c/Gist-List/app` path.

### 3. Environment Configuration

Copy and configure `.env`:

```bash
cp .env.example .env
```

**Key environment variables:**

```env
# Hosted PostgreSQL (optimized for WSL2 local dev)
DATABASE_URL='postgresql://role_a53f7d09:_tQx1uAwdjsgVf10NWaxxAPoue4laRYt@db-a53f7d09.db002.hosteddb.reai.io:5432/a53f7d09?connect_timeout=60&pool_timeout=60&connection_limit=1&statement_cache_size=0'

# Local development
NEXTAUTH_URL=http://localhost:3000

# AWS S3 Storage
AWS_PROFILE=hosted_storage
AWS_REGION=us-west-2
AWS_BUCKET_NAME=abacusai-apps-60489b261efb879fe22c0930-us-west-2
AWS_FOLDER_PREFIX=3735/

# Auth
NEXTAUTH_SECRET=214vOb0bvYVaiAgFqArErXJACUO9F9Vv

# Abacus AI
ABACUSAI_API_KEY=cb1509e22e114322a2c5452adb7c381f
```

**Database URL Parameters Explained:**
- `connect_timeout=60`: Increased for slow WSL2→hosted DB connection
- `pool_timeout=60`: Prevents pool exhaustion
- `connection_limit=1`: Single connection to avoid pool issues with slow queries
- `statement_cache_size=0`: Reduces connection overhead

### 4. TypeScript Fixes

Fixed type error in costs API route:

**File**: `app/api/user/costs/route.ts:66`

```typescript
// Before (implicit any error):
recentListings: listings.map(listing => ({

// After (explicit type):
recentListings: listings.map((listing: typeof listings[0]) => ({
```

### 5. Start Development Server

```bash
npm run dev
```

Server runs on http://localhost:3000

## Known Issues and Solutions

### Issue 1: Database Connection Timeout

**Symptom:**
```
Invalid prisma.user.findUnique() invocation: Timed out fetching a new connection from the connection pool
```

**Cause**: High network latency between WSL2 and hosted PostgreSQL database (20-30 seconds per query)

**Solution**: Already implemented in `.env` with optimized connection parameters. Queries will be slow but should not timeout.

**Alternative**: Test on production site (https://gistlist.abacusai.app) for faster performance.

### Issue 2: Prisma Client Path Mismatch

**Symptom:**
```
@prisma/client did not initialize yet. Please run "prisma generate"
```

**Cause**: WSL2 path resolution issues - Prisma generates to `/home/ubuntu/...` but app expects `/mnt/c/...`

**Solution**:
```bash
cp -r /home/ubuntu/gist_list/app/node_modules/.prisma/client/* /mnt/c/Gist-List/app/node_modules/.prisma/client/
rm -rf .next  # Clear Next.js cache
npm run dev   # Restart server
```

### Issue 3: Slow Sign-in/Sign-up (20-30 seconds)

**Symptom**: Authentication takes 20-30 seconds to complete

**Cause**: Each database query from WSL2 to hosted DB has high latency

**Solution**: This is expected behavior for local WSL2 development. For faster testing, use production environment.

### Issue 4: ESLint Configuration Prompt

**Symptom**: Interactive prompt during `npm run lint`

**Solution**: Skip linting during initial setup, configure ESLint later if needed

## Build Process

```bash
# Type checking
npm run typecheck

# Linting (skip interactive prompts)
npm run lint

# Production build
npm run build
```

**Note**: Production build may fail with Prisma errors if client not properly generated.

## Testing Workflow

1. **Local Testing**: Use http://localhost:3000 (slow but works with production data)
2. **Production Testing**: Use https://gistlist.abacusai.app (recommended for Pass A feature testing)
3. **Pass A Features to Test**:
   - Section-scoped chips (❗ Alerts, ❓ Actions, 💡 Insights)
   - Mood engine with 8 personas
   - Quick Facts panel
   - INSIGHT type notifications

## File Structure

```
/mnt/c/Gist-List/app/
├── app/
│   ├── api/
│   │   └── user/costs/route.ts (fixed TypeScript error)
│   └── listing/[id]/_components/listing-detail.tsx
├── src/
│   ├── notifications/
│   │   ├── types.ts (Pass A type definitions)
│   │   ├── moods.ts (8 persona mood engine)
│   │   ├── rules.json (notification rules)
│   │   └── flags.ts (feature flags)
│   └── components/
│       ├── ChipsRow.tsx (section-scoped chips UI)
│       └── QuickFactsPanel.tsx (buyer disclosure panel)
├── prisma/
│   └── schema.prisma (PostgreSQL schema)
├── docs/
│   ├── INDEX.md (documentation hub)
│   ├── LOCAL_SETUP.md (this file)
│   └── overview/
│       └── CHANGELOG.md (Pass A changes)
├── .env (environment config)
└── package.json
```

## Next Steps

After successful local testing:
1. Verify all Pass A features working
2. Document any bugs or issues
3. Hand off to GPT-5 Codex Medium (Cursor) for Sweep B implementation
4. Claude Code will assist with Sweep B troubleshooting
5. DeepAgent handles final production deployment

## Troubleshooting Commands

```bash
# Check Node version
node --version  # Should be v20.19.5

# Verify Prisma client exists
ls -la /mnt/c/Gist-List/app/node_modules/.prisma/client/ | grep libquery

# Test database connection
npx prisma db pull  # Will timeout but confirms connectivity

# Clear all caches and restart
rm -rf .next
rm -rf node_modules/.cache
npm run dev

# Check running dev server
curl http://localhost:3000
```

## Production Database Access

**Note**: The hosted PostgreSQL database is the single source of truth for all environments. There is no separate local database setup. DeepAgent and production deployments use the same database with better network connectivity.

## Additional Resources

- Pass A Feature Spec: `/docs/INDEX.md`
- Pass A Changes: `/docs/overview/CHANGELOG.md`
- Team Workflow: `/docs/TEAM_WORKFLOW.md`
- Cost Tracking: `/COST_TRACKING_GUIDE.md`
- External APIs: `/EXTERNAL_API_SETUP.md`
