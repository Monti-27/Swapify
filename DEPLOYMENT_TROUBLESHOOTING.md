# 🔧 Deployment Troubleshooting Guide

Common issues when deploying OrderSwap and how to fix them.

---

## 🚨 Backend Issues (Railway)

### Issue 1: Build Fails - "Cannot find module '@prisma/client'"

**Symptoms:**
```
Error: Cannot find module '@prisma/client'
Build failed
```

**Cause:** Prisma client not generated during build

**Solution:**
1. Go to Railway → Your Service → Settings
2. Update **Build Command** to:
   ```bash
   npm install && npx prisma generate && npm run build
   ```
3. Redeploy

---

### Issue 2: "Database connection failed" or "Connection refused"

**Symptoms:**
```
Error: Can't reach database server
P1001: Can't reach database server
```

**Causes & Solutions:**

#### A. Wrong DATABASE_URL format
**Check your URL format:**
```bash
# ✅ Correct (for Neon):
postgresql://user:password@host/database?sslmode=require

# ❌ Wrong (missing sslmode):
postgresql://user:password@host/database
```

**Fix:**
1. Go to Railway → Variables
2. Find `DATABASE_URL`
3. Add `?sslmode=require` at the end
4. Save (auto-redeploys)

#### B. Database not accessible
**Test connection:**
1. Go to Railway → Your Service
2. Click "..." → "Shell"
3. Run: `npx prisma db push`
4. If fails, check Neon dashboard

#### C. Database URL has special characters in password
**URL encode password:**
```bash
# If password is: p@ss!word
# Encode to: p%40ss%21word
```

---

### Issue 3: Migrations Not Running

**Symptoms:**
```
Table "User" does not exist
PrismaClientValidationError
```

**Solution 1: Run migrations manually**
1. Railway Dashboard → Service → "..." → Shell
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

**Solution 2: Auto-run on startup**
1. Railway → Settings → Start Command
2. Update to:
   ```bash
   npx prisma migrate deploy && npm run start:prod
   ```

**Solution 3: Reset and re-migrate (⚠️ deletes data)**
```bash
# In Railway shell:
npx prisma migrate reset --force
npx prisma migrate deploy
```

---

### Issue 4: Service Crashes or Won't Start

**Symptoms:**
- Railway shows red "Failed" status
- Logs show crash errors

**Steps to diagnose:**

1. **Check logs:**
   - Railway → Service → "Logs" tab
   - Look for error messages

2. **Common errors:**

   **Error: `Port already in use`**
   ```
   Solution: Railway assigns port automatically
   In your code, use: process.env.PORT || 3001
   ```

   **Error: `MODULE_NOT_FOUND`**
   ```bash
   Solution: Missing dependency
   1. Check package.json
   2. Run: npm install <missing-package>
   3. Commit and push
   ```

   **Error: `Cannot start service`**
   ```bash
   Solution: Check start command
   Railway → Settings → Start Command:
   npm run start:prod
   ```

3. **Verify environment variables:**
   - All required variables set?
   - No typos in variable names?
   - No extra spaces or quotes?

---

### Issue 5: WebSocket Not Working

**Symptoms:**
- Frontend shows "WebSocket connection failed"
- No real-time updates

**Solutions:**

1. **Check WebSocket is enabled on Railway:**
   Railway supports WebSocket by default, but verify:
   - Railway → Service → Settings
   - Should show HTTP and WS support

2. **Verify frontend WS_URL:**
   ```bash
   # Should be same as API URL:
   NEXT_PUBLIC_WS_URL=https://your-backend.railway.app
   ```

3. **Check CORS:**
   ```bash
   # In Railway variables:
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

4. **Test WebSocket manually:**
   ```javascript
   // In browser console (on your frontend):
   const socket = io('https://your-backend.railway.app');
   socket.on('connect', () => console.log('Connected!'));
   socket.on('connect_error', (e) => console.log('Error:', e));
   ```

---

### Issue 6: Railway Runs Out of Credit

**Symptoms:**
- Service stops working
- "Usage limit reached" message

**Solutions:**

1. **Check usage:**
   - Railway Dashboard → Usage
   - See how much of $5 credit used

2. **Optimize resource usage:**
   - Add sleep endpoint
   - Reduce logging
   - Optimize database queries

3. **Keep service awake (free):**
   - Use UptimeRobot: https://uptimerobot.com
   - Ping your service every 5 minutes
   - Prevents cold starts

4. **Alternative: Deploy to Render:**
   - Free tier with more generous limits
   - Service sleeps after 15 min inactivity
   - Wakes up on request (takes 30-60s)

---

## 🎨 Frontend Issues (Vercel)

### Issue 1: Build Fails - Environment Variables Not Found

**Symptoms:**
```
Error: NEXT_PUBLIC_API_URL is not defined
Build failed
```

**Solution:**
1. Vercel Dashboard → Your Project → Settings
2. Go to "Environment Variables"
3. Add all required variables:
   ```
   NEXT_PUBLIC_API_URL
   NEXT_PUBLIC_WS_URL
   NEXT_PUBLIC_SOLANA_NETWORK
   NEXT_PUBLIC_SOLANA_RPC_URL
   ```
4. Important: Check "Production", "Preview", and "Development"
5. Go to "Deployments" → Latest → "..." → "Redeploy"

---

### Issue 2: API Calls Fail with CORS Error

**Symptoms:**
```
Access to fetch at 'https://backend.railway.app/api/...'
from origin 'https://yourapp.vercel.app' has been blocked by CORS
```

**Solution:**
1. **Update backend CORS:**
   ```bash
   # In Railway variables:
   CORS_ORIGINS=https://yourapp.vercel.app,http://localhost:3000
   ```

2. **Verify frontend API URL:**
   ```bash
   # In Vercel variables:
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   # ⚠️ NO trailing slash!
   ```

3. **Check Railway redeployed:**
   - Should auto-redeploy after variable change
   - Verify "Latest deployment" timestamp

4. **Still not working? Check backend logs:**
   - Railway → Logs
   - Look for CORS-related errors

---

### Issue 3: Images or Fonts Not Loading

**Symptoms:**
- Broken images
- Default fonts showing
- 404 errors in console

**Solution:**

1. **Check public folder:**
   ```bash
   frontend/public/
     ├── fonts/
     ├── partners/
     └── images/
   ```

2. **Verify file paths:**
   ```tsx
   // ✅ Correct:
   <Image src="/WeSwap-logo.png" />
   
   // ❌ Wrong:
   <Image src="public/WeSwap-logo.png" />
   ```

3. **Check Next.js Image config:**
   ```tsx
   // In next.config.ts:
   images: {
     remotePatterns: [
       // Add external image domains here
     ],
   }
   ```

---

### Issue 4: Wallet Connection Fails

**Symptoms:**
- "Connect Wallet" button does nothing
- Phantom doesn't open
- Console shows errors

**Solutions:**

1. **Check Solana network:**
   ```bash
   # In Vercel variables:
   NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
   # or for testing:
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   ```

2. **Verify wallet adapter installed:**
   ```bash
   # Should be in package.json:
   "@solana/wallet-adapter-react"
   "@solana/wallet-adapter-wallets"
   ```

3. **Check Phantom extension:**
   - Extension installed?
   - Extension enabled?
   - On correct network?

4. **Try different wallet:**
   - Test with Solflare
   - Test with Backpack

5. **Check browser console:**
   - F12 → Console
   - Look for specific errors
   - Common: "Wallet not found" = extension not installed

---

### Issue 5: Page Shows White Screen or 500 Error

**Symptoms:**
- Blank white page
- Internal Server Error
- No content loads

**Diagnosis:**

1. **Check Vercel logs:**
   - Vercel Dashboard → Deployments → Click latest
   - View "Function Logs" or "Edge Logs"
   - Look for runtime errors

2. **Common causes:**

   **A. Missing environment variables**
   ```bash
   Solution: Add all NEXT_PUBLIC_* variables
   ```

   **B. Server component error**
   ```bash
   Solution: Check if using hooks in server components
   Add 'use client' at top of component file
   ```

   **C. API not reachable**
   ```bash
   Solution: Verify backend is running
   Test: curl https://your-backend.railway.app
   ```

3. **Test locally:**
   ```bash
   cd frontend
   npm run build
   npm run start
   ```
   If works locally, issue is with Vercel config.

---

## 🔗 Integration Issues

### Issue 1: Frontend Can't Connect to Backend

**Symptoms:**
- All API calls fail
- "Network error" in console
- Can't fetch data

**Debugging steps:**

1. **Test backend directly:**
   ```bash
   curl https://your-backend.railway.app/api/docs
   # Should return HTML
   ```

2. **Check both services running:**
   - Railway: Green status?
   - Vercel: Deployment successful?

3. **Verify URLs match:**
   ```bash
   # Frontend (Vercel):
   NEXT_PUBLIC_API_URL=https://backend.railway.app
   
   # Backend (Railway):
   CORS_ORIGINS=https://frontend.vercel.app
   ```

4. **Test from browser console:**
   ```javascript
   // On your Vercel site, open console:
   fetch('https://your-backend.railway.app/tokens/popular')
     .then(r => r.json())
     .then(d => console.log(d))
     .catch(e => console.error(e));
   ```

5. **Check HTTPS:**
   - Both must use HTTPS (Vercel/Railway do this automatically)
   - Mixed content (HTTPS → HTTP) will be blocked

---

### Issue 2: Real-Time Updates Not Working

**Symptoms:**
- Strategy triggers don't show immediately
- Price updates delayed
- WebSocket status shows disconnected

**Solutions:**

1. **Check WebSocket connection:**
   ```javascript
   // Browser console:
   import { wsClient } from '@/lib/websocket';
   console.log('Connected?', wsClient.isConnected());
   ```

2. **Verify WS_URL:**
   ```bash
   # Should be SAME as API URL:
   NEXT_PUBLIC_WS_URL=https://backend.railway.app
   ```

3. **Check backend WebSocket server:**
   - Railway logs should show: "WebSocket gateway initialized"
   - No errors about socket.io

4. **Test WebSocket directly:**
   ```bash
   # Use a WS testing tool:
   wscat -c wss://your-backend.railway.app/socket.io/?transport=websocket
   ```

5. **Fallback to polling:**
   - WebSocket should fallback to polling automatically
   - Check network tab for polling requests

---

## 🗄️ Database Issues

### Issue 1: Database Tables Don't Exist

**Symptoms:**
```
Error: Table "users" does not exist
Prisma error P2021
```

**Solution:**
```bash
# Railway shell:
npx prisma migrate deploy

# Or add to start command:
npx prisma migrate deploy && npm run start:prod
```

---

### Issue 2: Prisma Client Out of Sync

**Symptoms:**
```
Error: Prisma Client is outdated
```

**Solution:**
```bash
# Railway shell:
npx prisma generate

# Or add to build command:
npm install && npx prisma generate && npm run build
```

---

### Issue 3: Database Connection Limit Reached

**Symptoms:**
```
Error: Too many connections
P1000: Authentication failed
```

**Solutions:**

1. **Use connection pooling (already configured in Neon URL)**
   ```
   postgresql://...@....neon.tech/db?sslmode=require
   ```

2. **Add pooler to URL:**
   ```
   # In Neon dashboard, use "Pooled connection" URL
   postgresql://...@...-pooler.neon.tech/db
   ```

3. **Upgrade Neon plan:**
   - Free tier: 10 concurrent connections
   - Paid tier: More connections

---

### Issue 4: Migration Failed

**Symptoms:**
```
Error: Migration `20231004_init` failed to apply
```

**Solutions:**

1. **Check migration file:**
   ```bash
   # View migration:
   cat prisma/migrations/[migration-name]/migration.sql
   ```

2. **Apply manually:**
   ```bash
   # Railway shell:
   npx prisma db push --force-reset
   ```

3. **Reset and reapply (⚠️ deletes all data):**
   ```bash
   npx prisma migrate reset --force
   npx prisma migrate deploy
   ```

---

## 🔐 Security Issues

### Issue 1: JWT Authentication Fails

**Symptoms:**
- Can't login
- "Unauthorized" errors
- Token validation fails

**Solutions:**

1. **Check JWT_SECRET:**
   ```bash
   # Must be same in Railway
   # Must be at least 32 characters
   # Must not have special chars that need escaping
   ```

2. **Regenerate JWT_SECRET:**
   ```bash
   openssl rand -base64 32
   # Copy output to Railway variables
   ```

3. **Check JWT expiration:**
   ```bash
   JWT_EXPIRATION=7d  # or 30d, 1h, etc.
   ```

---

### Issue 2: Wallet Signature Verification Fails

**Symptoms:**
- Can't authenticate with wallet
- "Invalid signature" errors

**Solutions:**

1. **Check Solana network match:**
   ```bash
   # Frontend and backend must match:
   NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
   SOLANA_NETWORK=mainnet-beta
   ```

2. **Verify RPC URL:**
   ```bash
   # Must be accessible:
   curl https://api.mainnet-beta.solana.com
   ```

3. **Check wallet adapter:**
   - Extension updated?
   - Wallet connected?
   - On correct network?

---

## ⚡ Performance Issues

### Issue 1: Slow API Responses

**Symptoms:**
- API calls take > 5 seconds
- Timeouts

**Solutions:**

1. **Check database queries:**
   ```bash
   # Enable query logging:
   LOG_LEVEL=debug
   ```

2. **Add database indexes:**
   ```prisma
   // In schema.prisma:
   @@index([userId])
   @@index([createdAt])
   ```

3. **Use caching:**
   - Price cache already implemented
   - Check cache hit rate in logs

4. **Optimize Solana RPC:**
   - Use premium RPC (Alchemy, QuickNode)
   - Batch requests where possible

---

### Issue 2: Frontend Loads Slowly

**Symptoms:**
- White screen for 5+ seconds
- Slow time to interactive

**Solutions:**

1. **Check Vercel deployment:**
   - Using Edge Network?
   - Deployed to correct region?

2. **Optimize images:**
   ```tsx
   // Use Next.js Image:
   import Image from 'next/image';
   <Image src="/logo.png" width={100} height={100} />
   ```

3. **Code splitting:**
   ```tsx
   // Dynamic imports:
   const Strategy = dynamic(() => import('@/components/Strategy'));
   ```

4. **Reduce bundle size:**
   ```bash
   npm run build
   # Check output size
   # Remove unused dependencies
   ```

---

## 🆘 Emergency Fixes

### Nuclear Option 1: Redeploy Everything

```bash
# 1. Backend (Railway):
Railway Dashboard → Service → "..." → "Restart"

# 2. Frontend (Vercel):
Vercel Dashboard → Deployments → Latest → "..." → "Redeploy"

# 3. Database (Neon):
# Usually doesn't need restart
# But can reset connection pooling
```

---

### Nuclear Option 2: Reset Database (⚠️ DELETES ALL DATA)

```bash
# Railway shell:
npx prisma migrate reset --force
npx prisma migrate deploy
npx prisma db seed  # if you have seed data
```

---

### Nuclear Option 3: Delete and Recreate Project

**Last resort if nothing works:**

1. **Backup important data**
2. **Delete Railway service**
3. **Delete Vercel project**
4. **Follow deployment guide from scratch**

---

## 📞 Getting Help

### Before Asking for Help

Collect this information:

1. **Error message** (full text)
2. **Logs** (Railway + Vercel)
3. **Environment variables** (redact secrets!)
4. **Steps to reproduce**
5. **What you've tried**

### Where to Get Help

1. **Check docs:**
   - [Railway Docs](https://docs.railway.app)
   - [Vercel Docs](https://vercel.com/docs)
   - [Prisma Docs](https://www.prisma.io/docs)

2. **Community:**
   - Railway Discord
   - Vercel Discord
   - Stack Overflow

3. **Status pages:**
   - https://railway.app/status
   - https://vercel.com/status
   - https://neon.tech/status

---

## ✅ Verification Checklist

After fixing issues, verify:

- [ ] Backend responds: `curl https://backend.railway.app`
- [ ] API docs load: `https://backend.railway.app/api/docs`
- [ ] Frontend loads: `https://frontend.vercel.app`
- [ ] No console errors (F12)
- [ ] Wallet connects successfully
- [ ] API calls work
- [ ] WebSocket connects
- [ ] Database queries succeed
- [ ] No errors in Railway logs
- [ ] No errors in Vercel logs

---

**Still stuck?** 

Double-check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step instructions.

Try [QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md) for a fresh start.

