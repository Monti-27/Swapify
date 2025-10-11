# ⚡ Quick Start Deployment (5 Minutes)

**Get OrderSwap running live in 5 minutes!**

## Prerequisites ✅

- GitHub account
- Code pushed to GitHub

## Steps

### 1️⃣ Database (1 minute)

**Already using Neon? Skip this!**

Otherwise:
1. Go to https://neon.tech
2. Sign in with GitHub
3. Copy database URL

### 2️⃣ Backend - Railway (2 minutes)

1. **Go to:** https://railway.app
2. **Login** with GitHub
3. **New Project** → Deploy from GitHub
4. **Select:** Your repo
5. **Root Directory:** `OrderSwap Backend`
6. **Add Variables:**
   ```env
   DATABASE_URL=your-neon-url
   JWT_SECRET=run-this: openssl rand -base64 32
   NODE_ENV=production
   PORT=3001
   SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/Zmyt1gt3AmgL_ziL45fQ_
   SOLANA_NETWORK=mainnet-beta
   JUPITER_API_URL=https://lite-api.jup.ag/swap/v1
   JUPITER_TOKEN_API_URL=https://lite-api.jup.ag/tokens/v2
   JUPITER_PRICE_API_URL=https://lite-api.jup.ag/price/v3
   PYTH_PROGRAM_ID=gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s
   DEXSCREENER_API_URL=https://api.dexscreener.com/latest
   RATE_LIMIT_TTL=60
   RATE_LIMIT_MAX=100
   MONITORING_INTERVAL=5000
   PRICE_CHECK_BATCH_SIZE=50
   LOG_LEVEL=info
   ```
7. **Deploy** and copy your URL

### 3️⃣ Frontend - Vercel (2 minutes)

1. **Go to:** https://vercel.com
2. **Login** with GitHub
3. **Import** your repo
4. **Root Directory:** `frontend`
5. **Add Variables:**
   ```env
   NEXT_PUBLIC_API_URL=your-railway-url-from-step-2
   NEXT_PUBLIC_WS_URL=your-railway-url-from-step-2
   NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```
6. **Deploy** and copy your URL

### 4️⃣ Final Config (30 seconds)

**Update Railway CORS:**
1. Go back to Railway
2. Add these variables:
   ```env
   CORS_ORIGINS=your-vercel-url
   FRONTEND_URL=your-vercel-url
   APP_URL=your-railway-url
   ```
3. Save (auto-redeploys)

## 🎉 Done!

**Your app is live:**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`
- API Docs: `https://your-backend.railway.app/api/docs`

**Test it:**
1. Open your Vercel URL
2. Connect wallet
3. Try creating a strategy

## 💰 Cost

**$0/month** - All free tier!

---

## Need Help?

**Common Issues:**

❌ **Build fails:**
- Check Railway logs
- Verify DATABASE_URL is correct
- Make sure all env vars are set

❌ **Can't connect wallet:**
- Check NEXT_PUBLIC_SOLANA_NETWORK is set
- Clear browser cache
- Try incognito mode

❌ **CORS errors:**
- Make sure CORS_ORIGINS in Railway includes your Vercel URL
- No trailing slashes in URLs
- Redeploy after adding CORS

---

For detailed guide, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

