# PostgreSQL Migration Deployment Checklist

This checklist ensures the PostgreSQL migration is properly deployed to Vercel.

## ✅ Pre-Deployment Completed

- [x] Prisma schema created with 7 models
- [x] Database utilities (`lib/db.ts`) created
- [x] Storage layer refactored (30+ functions)
- [x] API routes updated with await (40+ routes)
- [x] Build configuration updated

## 🔧 Vercel Environment Variables

Set these in the Vercel project dashboard:

### Required Database Variables

```bash
# Pooled connection (for queries)
DATABASE_URL="postgresql://neondb_owner:npg_Rqaxe3nS5Dgr@ep-solitary-leaf-ae2tpydp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=5&pool_timeout=20"

# Direct connection (for migrations)
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:npg_Rqaxe3nS5Dgr@ep-solitary-leaf-ae2tpydp.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Optional Variables

```bash
# Admin access (if using admin portal)
ADMIN_XPUB="<your-admin-wallet-xpub>"

# Base URL (auto-detected if not set)
NEXT_PUBLIC_BASE_URL="<your-domain>"

# Environment
NODE_ENV="production"
```

## 🚀 Build Configuration

The build command is configured in `package.json`:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && prisma generate && next build"
  }
}
```

This ensures:
1. Database migrations are applied
2. Prisma client is generated
3. Next.js builds the application

## 📋 Deployment Steps

### 1. Verify Local Build

```bash
# Test the build locally
npm run build

# Start production server locally
npm run start
```

### 2. Push to Repository

```bash
git add .
git commit -m "Migrate to PostgreSQL with Prisma"
git push origin main
```

### 3. Vercel Auto-Deploy

Vercel will automatically:
- Install dependencies
- Run migrations (`prisma migrate deploy`)
- Generate Prisma client
- Build Next.js application

### 4. Monitor Deployment

Watch the Vercel deployment logs for:
- ✅ Migration success
- ✅ Prisma client generation
- ✅ Build completion
- ❌ Any errors

## 🧪 Post-Deployment Verification

### Database Verification

Run these queries in Neon dashboard:

```sql
-- Check users table exists
SELECT COUNT(*) FROM users;

-- Check domains table exists
SELECT COUNT(*) FROM domains;

-- Check auth sessions cleanup
SELECT COUNT(*) FROM auth_sessions WHERE expires_at < EXTRACT(EPOCH FROM NOW()) * 1000;

-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables:
- `users`
- `domains`
- `usage_stats`
- `activity_logs`
- `auth_sessions`
- `featured_wallets`
- `contact_submissions`

### Application Verification

Test these flows:

1. **User Creation**
   - Sign in with Lightning wallet
   - Verify user created in database
   - Check `users` table

2. **Domain Management**
   - Add a domain
   - Verify domain in `domains` table
   - Verify domain verification flow

3. **Analytics**
   - Record a login
   - Check `usage_stats` updated
   - Verify stats persist across requests

4. **Activity Logs**
   - Perform actions (add domain, etc.)
   - Check `activity_logs` table

5. **Auth Sessions**
   - Complete auth flow
   - Verify k1→xpub mapping works
   - Check session cleanup runs

### Performance Verification

- Response times < 500ms
- No connection pool errors
- Prisma query logs (check Vercel logs)
- Neon dashboard connection count

## 🔄 Rollback Plan

If issues occur:

```bash
# Immediate rollback
git revert HEAD
git push origin main

# Vercel will auto-deploy previous version
# In-memory storage will be restored
```

## 📊 Monitoring

### Vercel Dashboard
- Check deployment logs
- Monitor function execution time
- Watch for errors

### Neon Dashboard
- Monitor connection count
- Check query performance
- Watch database size growth

### Application Logs
- Check for Prisma errors
- Monitor auth session cleanup
- Verify data persistence

## 🎯 Success Criteria

✅ All 7 database tables created
✅ No data loss on deployment
✅ Response times < 500ms
✅ No connection pool errors
✅ All existing tests pass
✅ Auth flow works
✅ Domain verification works
✅ Analytics track correctly
✅ Backup cookies still function

## 🐛 Common Issues

### Issue: Connection Pool Exhausted

**Solution:**
- Prisma client uses singleton pattern in `lib/db.ts`
- Connection limit set to 5 in DATABASE_URL
- Using Neon's pooled endpoint

### Issue: Migration Fails

**Solution:**
- Check DATABASE_URL_UNPOOLED is set
- Verify Neon database is accessible
- Check migration files in `prisma/migrations/`

### Issue: "PrismaClient is not generated"

**Solution:**
- Run `npx prisma generate` locally
- Verify `postinstall` script in package.json
- Check build logs for generation step

### Issue: Stale Data After Restart

**Success!** This is what we fixed - data now persists in PostgreSQL

## 📝 Notes

- **Connection Pooling**: Using Neon's pooled endpoint with 5 connection limit
- **Backup Cookies**: Still functioning as fallback mechanism
- **Data Migration**: Fresh start - no data migration from in-memory storage
- **Auth Sessions**: Automatically cleaned up (10% chance per auth request)
- **Analytics**: Stored as JSON fields (can optimize later)

## 🔮 Future Optimizations

After successful migration:

1. **Redis for Auth Sessions**: Migrate to Vercel KV
2. **Analytics Optimization**: Denormalize hot data
3. **Caching Layer**: Add Redis cache for frequently accessed users
4. **Query Optimization**: Add indexes based on slow query log
5. **Separate Analytics DB**: Move to ClickHouse/TimescaleDB
