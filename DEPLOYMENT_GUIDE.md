# 🚀 OrderSwap FREE Deployment Guide

Complete guide to deploy OrderSwap for **FREE** - both Frontend and Backend.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup (Neon PostgreSQL)](#1-database-setup-neon-postgresql)
4. [Backend Deployment (Railway)](#2-backend-deployment-railway)
5. [Frontend Deployment (Vercel)](#3-frontend-deployment-vercel)
6. [Post-Deployment Configuration](#4-post-deployment-configuration)
7. [Testing Your Deployment](#5-testing-your-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Cost Breakdown](#cost-breakdown)

---

## Overview

### Deployment Stack (100% FREE)

| Component | Platform | Free Tier Limits |
|-----------|----------|------------------|
| **Frontend** | Vercel | Unlimited (100GB bandwidth/month) |
| **Backend** | Railway | $5 credit/month (~500 hours) |
| **Database** | Neon | 500 MB storage, 10 projects |

**Monthly Cost:** $0 (Railway gives $5 free credit monthly)

---

## Prerequisites

Before starting, ensure you have:

- [x] GitHub account (required for all platforms)
- [x] Your code pushed to a GitHub repository
- [x] Solana wallet for testing
- [x] 30 minutes of time

### Push Your Code to GitHub

```bash
# Initialize git if not already done
cd /path/to/OrderSwap
git init

# Create .gitignore files
echo "node_modules/
.env
.env.local
dist/
.next/
*.log" > .gitignore

# Commit and push
git add .
git commit -m "Initial commit - OrderSwap"
git branch -M main

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/OrderSwap.git
git push -u origin main
```

---

## 1. Database Setup (Neon PostgreSQL)

### ✅ You're Already Using Neon!

Your current database URL:
```
postgresql://neondb_owner:npg_U1olLnkQK2pe@ep-shiny-cell-adjh74cj-pooler.c-2.us-east-1.aws.neon.tech/neondb
```

**You can keep using this, or create a new production database:**

### Option A: Keep Current Database (Fastest)
Skip to step 2! Your database is ready.

### Option B: Create New Production Database

1. **Go to:** https://neon.tech
2. **Sign in** with GitHub
3. **Create New Project:**
   - Name: `orderswap-prod`
   - Region: Choose closest to your users (US East recommended)
   - PostgreSQL Version: 15 or 16
4. **Copy Database URL** from dashboard
5. **Save for later** - you'll need this for Railway

---

## 2. Backend Deployment (Railway)

Railway provides $5/month credit for free - perfect for your backend!

### Step 2.1: Sign Up for Railway

1. **Go to:** https://railway.app
2. **Click:** "Login" → "Login with GitHub"
3. **Authorize** Railway to access your GitHub
4. **Verify email** if prompted

### Step 2.2: Create New Project

1. **Click:** "New Project"
2. **Select:** "Deploy from GitHub repo"
3. **Choose:** Your `OrderSwap` repository
4. **Configure:**
   - Root Directory: `OrderSwap Backend`
   - Name: `orderswap-backend`

### Step 2.3: Configure Build Settings

Railway will auto-detect Node.js, but let's configure it properly:

1. **Click** on your service
2. **Go to:** "Settings" tab
3. **Set Build Command:**
   ```bash
   npm install && npx prisma generate && npm run build
   ```
4. **Set Start Command:**
   ```bash
   npm run start:prod
   ```
5. **Set Root Directory:** `/OrderSwap Backend`

### Step 2.4: Add Environment Variables

1. **Click:** "Variables" tab
2. **Add each variable below:**

```env
# Application
NODE_ENV=production
PORT=3001

# Database (from Neon)
DATABASE_URL=postgresql://neondb_owner:npg_U1olLnkQK2pe@ep-shiny-cell-adjh74cj-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT (Generate new secret - see below)
JWT_SECRET=GENERATE_NEW_SECRET_HERE
JWT_EXPIRATION=7d

# Solana Mainnet
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/Zmyt1gt3AmgL_ziL45fQ_
SOLANA_NETWORK=mainnet-beta

# Jupiter API
JUPITER_API_URL=https://lite-api.jup.ag/swap/v1
JUPITER_TOKEN_API_URL=https://lite-api.jup.ag/tokens/v2
JUPITER_PRICE_API_URL=https://lite-api.jup.ag/price/v3

# Price Oracles
PYTH_PROGRAM_ID=gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s
DEXSCREENER_API_URL=https://api.dexscreener.com/latest

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Monitoring
MONITORING_INTERVAL=5000
PRICE_CHECK_BATCH_SIZE=50
LOG_LEVEL=info
```

**🔐 Generate JWT_SECRET:**
```bash
# On Mac/Linux/Git Bash:
openssl rand -base64 32

# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Or use: https://generate-secret.vercel.app/32
```

### Step 2.5: Add CORS Origin (Important!)

After frontend deployment, you'll add:
```env
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
APP_URL=https://orderswap-backend.railway.app
FRONTEND_URL=https://your-app.vercel.app
```

### Step 2.6: Deploy

1. **Click:** "Deploy"
2. **Wait** for build to complete (2-5 minutes)
3. **Copy your URL:** Will be like `https://orderswap-backend.railway.app`
4. **Test:** Visit `https://your-backend-url.railway.app/api/docs` to see Swagger API docs

### Step 2.7: Run Database Migration

1. **Go to:** Railway dashboard → Your service
2. **Click:** "Settings" → "Service" → "Deploy Logs"
3. **Open** a "Shell" tab
4. **Run:**
   ```bash
   npx prisma migrate deploy
   ```

If shell doesn't work, add this to your start command:
```bash
npx prisma migrate deploy && npm run start:prod
```

---

## 3. Frontend Deployment (Vercel)

Vercel is made for Next.js - deployment is seamless!

### Step 3.1: Sign Up for Vercel

1. **Go to:** https://vercel.com
2. **Click:** "Sign Up" → "Continue with GitHub"
3. **Authorize** Vercel

### Step 3.2: Import Project

1. **Click:** "Add New..." → "Project"
2. **Import** your GitHub repository
3. **Configure:**
   - Framework: Next.js (auto-detected)
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 3.3: Configure Environment Variables

**Click** "Environment Variables" and add:

```env
# Backend API (Railway URL from Step 2.6)
NEXT_PUBLIC_API_URL=https://orderswap-backend.railway.app
NEXT_PUBLIC_WS_URL=https://orderswap-backend.railway.app

# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Step 3.4: Deploy

1. **Click:** "Deploy"
2. **Wait** 1-2 minutes for build
3. **Get your URL:** Will be like `https://orderswap-abc123.vercel.app`
4. **Optional:** Add custom domain in "Settings" → "Domains"

---

## 4. Post-Deployment Configuration

### Step 4.1: Update CORS in Backend

1. **Go to:** Railway dashboard
2. **Click:** Your backend service → "Variables"
3. **Update/Add:**
   ```env
   CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```
4. **Save** - Railway will auto-redeploy

### Step 4.2: Update Frontend API URLs

If you didn't set them correctly in Step 3.3:

1. **Go to:** Vercel dashboard → Your project
2. **Click:** "Settings" → "Environment Variables"
3. **Update:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
   NEXT_PUBLIC_WS_URL=https://your-railway-backend.railway.app
   ```
4. **Redeploy:** Go to "Deployments" → Click "..." → "Redeploy"

### Step 4.3: Verify WebSocket Connection

WebSocket runs on the same port as your API in NestJS, so no extra config needed!

Test WebSocket:
```javascript
// Open browser console on your Vercel app
const socket = io('https://your-railway-backend.railway.app');
socket.on('connect', () => console.log('WebSocket connected!'));
```

---

## 5. Testing Your Deployment

### Test Backend

**Open your backend URL + /api/docs:**
```
https://your-railway-backend.railway.app/api/docs
```

You should see Swagger API documentation.

**Test Health Check:**
```bash
curl https://your-railway-backend.railway.app
```

### Test Frontend

1. **Open:** Your Vercel URL in browser
2. **Connect Wallet:** Click "Connect Wallet" and connect Phantom
3. **Check Console:** Press F12, should see no errors
4. **Test Features:**
   - View tokens
   - Navigate to Swap page
   - Navigate to Strategies page
   - Check WebSocket connection status

### Test Full Integration

1. **Create a test strategy** (use small amounts!)
2. **Monitor** in dashboard
3. **Check** backend logs in Railway
4. **Verify** WebSocket updates work

---

## Troubleshooting

### ❌ Backend won't start

**Problem:** Build fails or service crashes

**Solutions:**
1. Check Railway logs: Dashboard → Service → "Logs"
2. Verify all environment variables are set
3. Make sure `DATABASE_URL` is correct
4. Check Prisma migrations ran: `npx prisma migrate deploy`

**Common Issue:** Missing `prisma generate`
```bash
# In Railway, update Build Command to:
npm install && npx prisma generate && npm run build
```

### ❌ Frontend can't connect to backend

**Problem:** API calls fail with CORS errors

**Solutions:**
1. Check `CORS_ORIGINS` in Railway includes your Vercel URL
2. Verify `NEXT_PUBLIC_API_URL` in Vercel matches Railway URL
3. Check Railway service is running (green status)
4. Make sure URLs don't have trailing slashes

### ❌ WebSocket connection fails

**Problem:** Real-time updates don't work

**Solutions:**
1. Verify `NEXT_PUBLIC_WS_URL` is set correctly
2. Check Railway allows WebSocket connections (it does by default)
3. Open browser console and look for WebSocket errors
4. Test connection manually (see Step 4.3)

### ❌ Database connection fails

**Problem:** "Can't connect to database"

**Solutions:**
1. Verify `DATABASE_URL` format:
   ```
   postgresql://user:password@host/database?sslmode=require
   ```
2. Check Neon database is running (Neon dashboard)
3. Verify `?sslmode=require` is at the end
4. Test connection from Railway shell: `npx prisma db push`

### ❌ Wallet won't connect

**Problem:** Phantom wallet connection fails

**Solutions:**
1. Make sure you're on the correct network (mainnet-beta)
2. Check `NEXT_PUBLIC_SOLANA_NETWORK` environment variable
3. Clear browser cache
4. Try incognito mode
5. Check Phantom extension is updated

### ❌ Railway service sleeps/stops

**Problem:** Free tier limitations

**Solutions:**
- Railway's free tier gives $5/month credit
- Your app uses ~$0.20/day (~$6/month if always on)
- To stay free: Add sleep mode or deploy to Render
- Or: Keep Railway active by pinging it every 10 minutes

**Keep Railway Awake (Free):**
Use UptimeRobot (free):
1. Sign up at https://uptimerobot.com
2. Add monitor: Your Railway URL
3. Check interval: 5 minutes

---

## Cost Breakdown

### Current Setup (FREE)

| Service | Plan | Monthly Cost | Usage |
|---------|------|--------------|-------|
| **Vercel** | Hobby | $0 | 100GB bandwidth, unlimited projects |
| **Railway** | Trial | $0 | $5 credit (enough for small apps) |
| **Neon** | Free | $0 | 500MB storage, 10 projects |
| **Total** | | **$0** | |

### Future Scaling (When Needed)

When your app grows beyond free tiers:

| Service | Next Tier | Cost | When to Upgrade |
|---------|-----------|------|----------------|
| **Vercel** | Pro | $20/month | >100GB bandwidth or need teams |
| **Railway** | Pay-as-you-go | $5-20/month | When $5 credit isn't enough |
| **Neon** | Pro | $19/month | >500MB database or >1M requests |
| **Alchemy RPC** | Growth | $49/month | >300M compute units/month |

**Estimated cost at scale:** $50-100/month for ~1000 active users

---

## Maintenance & Updates

### Deploy Updates

**Backend:**
1. Push code to GitHub
2. Railway auto-deploys from `main` branch
3. Check logs for any issues

**Frontend:**
1. Push code to GitHub
2. Vercel auto-deploys from `main` branch
3. Preview deployments for PRs

### Monitor Your App

**Railway Logs:**
- Dashboard → Service → "Logs"
- Filter by error/warning
- Set up log alerts

**Vercel Analytics:**
- Dashboard → Project → "Analytics"
- Free real-time analytics included
- Track performance and errors

### Database Management

**View/Edit Data:**
```bash
# From your local machine:
cd "OrderSwap Backend"
DATABASE_URL="your-neon-url" npx prisma studio
```

Or use Neon's built-in SQL editor.

### Backup Strategy

**Database Backups:**
1. Neon auto-backups on paid plan
2. Free tier: Manual exports
3. Run this weekly:
   ```bash
   pg_dump YOUR_DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

---

## Next Steps

### Now That You're Deployed

✅ **Basic Setup Complete!** Your app is live and free!

**Immediate Actions:**
1. Test all features thoroughly
2. Connect with your real wallet (use small amounts!)
3. Monitor Railway and Vercel dashboards
4. Share your app with friends for testing

**Future Enhancements:**
1. Add custom domain ($12/year on Namecheap)
2. Set up monitoring (Sentry for errors)
3. Add analytics (Vercel Analytics is free!)
4. Implement CI/CD with GitHub Actions
5. Add E2E testing (Playwright)

---

## 🎉 Congratulations!

Your OrderSwap app is now live and running:

- ✅ **Frontend:** Fast, global CDN via Vercel
- ✅ **Backend:** Scalable NestJS on Railway
- ✅ **Database:** Reliable PostgreSQL on Neon
- ✅ **WebSocket:** Real-time updates working
- ✅ **Cost:** $0/month (free tier)

**Your URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`
- API Docs: `https://your-backend.railway.app/api/docs`

---

## Support & Resources

**Official Docs:**
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Neon Docs](https://neon.tech/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)

**Need Help?**
- Check Railway logs for backend issues
- Check Vercel logs for frontend issues
- Check browser console for client-side issues
- Test API endpoints with Swagger docs

**Pro Tips:**
- Use Railway's CLI for faster debugging: `railway login`
- Set up Vercel CLI: `npm i -g vercel`
- Monitor your free tier usage to avoid surprises
- Set up UptimeRobot to keep Railway alive

---

## Security Checklist

Before sharing publicly:

- [ ] Changed `JWT_SECRET` from default
- [ ] Set strong database password
- [ ] Configured CORS properly
- [ ] Using HTTPS everywhere (Vercel/Railway provide this)
- [ ] Not exposing private keys anywhere
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Tested with small amounts first
- [ ] Solana RPC has rate limits configured
- [ ] Environment variables not in code

---

**Made with ❤️ for OrderSwap**

*Last Updated: October 2025*

