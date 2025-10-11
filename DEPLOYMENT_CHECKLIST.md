# ✅ OrderSwap Deployment Checklist

Use this checklist to ensure everything is set up correctly for deployment.

## Pre-Deployment

### Code Preparation
- [ ] All code committed to Git
- [ ] Pushed to GitHub
- [ ] `.env` files are in `.gitignore` (✅ Already done)
- [ ] All tests passing locally
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] Backend builds successfully: `cd "OrderSwap Backend" && npm run build`

### Environment Variables Prepared
- [ ] Generated new JWT_SECRET (use: `openssl rand -base64 32`)
- [ ] Database URL ready (Neon or other PostgreSQL)
- [ ] Solana RPC URL ready (for production use Alchemy/QuickNode)
- [ ] All API keys secured and ready

---

## Database Setup (Neon)

- [ ] **Signed up** at https://neon.tech
- [ ] **Created project** named `orderswap-prod`
- [ ] **Copied DATABASE_URL** from dashboard
- [ ] **Saved DATABASE_URL** securely for Railway setup

**Your Database URL format:**
```
postgresql://user:password@host/database?sslmode=require
```

---

## Backend Deployment (Railway)

### Account Setup
- [ ] **Signed up** at https://railway.app with GitHub
- [ ] **Verified email** address

### Project Configuration
- [ ] **Created new project** from GitHub repo
- [ ] **Selected correct repository** (OrderSwap)
- [ ] **Set root directory** to: `OrderSwap Backend`

### Build Configuration
- [ ] **Build Command** set to:
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- [ ] **Start Command** set to:
  ```bash
  npx prisma migrate deploy && npm run start:prod
  ```

### Environment Variables
All variables added in Railway dashboard:

#### Required Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `DATABASE_URL` (from Neon)
- [ ] `JWT_SECRET` (generated, 32+ characters)
- [ ] `JWT_EXPIRATION=7d`
- [ ] `SOLANA_RPC_URL` (production RPC)
- [ ] `SOLANA_NETWORK=mainnet-beta`

#### API URLs
- [ ] `JUPITER_API_URL=https://lite-api.jup.ag/swap/v1`
- [ ] `JUPITER_TOKEN_API_URL=https://lite-api.jup.ag/tokens/v2`
- [ ] `JUPITER_PRICE_API_URL=https://lite-api.jup.ag/price/v3`
- [ ] `PYTH_PROGRAM_ID=gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s`
- [ ] `DEXSCREENER_API_URL=https://api.dexscreener.com/latest`

#### Configuration
- [ ] `RATE_LIMIT_TTL=60`
- [ ] `RATE_LIMIT_MAX=100`
- [ ] `MONITORING_INTERVAL=5000`
- [ ] `PRICE_CHECK_BATCH_SIZE=50`
- [ ] `LOG_LEVEL=info`

### Deployment
- [ ] **Clicked Deploy** button
- [ ] **Build completed** successfully (check logs)
- [ ] **Service is running** (green indicator)
- [ ] **Copied Railway URL** (e.g., `https://orderswap-backend.railway.app`)

### Verification
- [ ] API docs accessible: `https://your-backend.railway.app/api/docs`
- [ ] Health check works: `curl https://your-backend.railway.app`
- [ ] Database connected (check Railway logs for "Database connected")
- [ ] No errors in Railway logs

---

## Frontend Deployment (Vercel)

### Account Setup
- [ ] **Signed up** at https://vercel.com with GitHub
- [ ] **Verified email** address

### Project Import
- [ ] **Clicked "Import Project"**
- [ ] **Selected** OrderSwap repository
- [ ] **Set root directory** to: `frontend`
- [ ] **Framework** detected as Next.js

### Environment Variables
All variables added in Vercel dashboard:

- [ ] `NEXT_PUBLIC_API_URL` (Railway URL from above)
- [ ] `NEXT_PUBLIC_WS_URL` (Same as API URL)
- [ ] `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
- [ ] `NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`

### Deployment
- [ ] **Clicked Deploy** button
- [ ] **Build completed** successfully (1-3 minutes)
- [ ] **Copied Vercel URL** (e.g., `https://orderswap.vercel.app`)

### Verification
- [ ] Website loads without errors
- [ ] No console errors (press F12)
- [ ] Images load correctly
- [ ] Navigation works

---

## Post-Deployment Configuration

### Update Backend CORS
Go back to Railway and add these variables:

- [ ] `CORS_ORIGINS` = Your Vercel URL (e.g., `https://orderswap.vercel.app`)
- [ ] `FRONTEND_URL` = Your Vercel URL
- [ ] `APP_URL` = Your Railway URL

### Redeploy
- [ ] Railway auto-redeployed after adding CORS
- [ ] New deployment successful
- [ ] No errors in logs

---

## Testing & Verification

### Backend Tests
- [ ] **API Documentation** accessible at `/api/docs`
- [ ] **Health endpoint** returns 200
- [ ] **Database** migrations applied successfully
- [ ] **Logs** show no critical errors
- [ ] **WebSocket** connection available

### Frontend Tests
- [ ] **Home page** loads correctly
- [ ] **No console errors** (F12 → Console)
- [ ] **Wallet connection** button visible
- [ ] **All pages** load (Dashboard, Swap, Strategies, Pools)

### Integration Tests
- [ ] **Connect Wallet:**
  - [ ] Click "Connect Wallet"
  - [ ] Phantom wallet opens
  - [ ] Successfully connected
  - [ ] Wallet address displayed

- [ ] **View Tokens:**
  - [ ] Navigate to Swap page
  - [ ] Token list loads
  - [ ] Search works

- [ ] **WebSocket:**
  - [ ] Open browser console
  - [ ] See "Socket.IO connected" message
  - [ ] Real-time updates working

- [ ] **Create Strategy:**
  - [ ] Navigate to Strategies
  - [ ] Click "Create Strategy"
  - [ ] Form loads without errors
  - [ ] Can fill out form

### Production Readiness
- [ ] **SSL/HTTPS** enabled on both frontend and backend (automatic on Vercel/Railway)
- [ ] **CORS** properly configured
- [ ] **Rate limiting** enabled
- [ ] **Error handling** working
- [ ] **Logging** functional

---

## Security Checklist

- [ ] **JWT_SECRET** is strong and random (not default)
- [ ] **Database password** is strong
- [ ] **.env files** not committed to Git
- [ ] **CORS** only allows your frontend domain
- [ ] **Rate limiting** enabled to prevent abuse
- [ ] **HTTPS** enforced on all endpoints
- [ ] **No private keys** in code or database
- [ ] **Environment variables** used for all secrets
- [ ] **API authentication** working correctly
- [ ] **Input validation** on all endpoints

---

## Monitoring Setup

### Railway Monitoring
- [ ] **Logs** accessible in Railway dashboard
- [ ] **Metrics** visible (CPU, Memory, Network)
- [ ] **Alerts** configured (optional)
- [ ] **Usage tracking** enabled to monitor free tier limits

### Vercel Monitoring
- [ ] **Analytics** enabled
- [ ] **Logs** accessible
- [ ] **Build logs** reviewed
- [ ] **Usage tracking** enabled

### Optional: External Monitoring
- [ ] **UptimeRobot** configured to keep Railway alive
  - Create account at https://uptimerobot.com
  - Add monitor for Railway URL
  - Set check interval to 5 minutes
- [ ] **Sentry** for error tracking (optional)
- [ ] **LogRocket** for session replay (optional)

---

## Documentation

- [ ] **Deployment URLs** saved:
  - Frontend: `_______________________________`
  - Backend: `_______________________________`
  - API Docs: `_______________________________`
  
- [ ] **Credentials secured:**
  - JWT_SECRET: ✅ Saved in password manager
  - Database URL: ✅ Saved securely
  - API Keys: ✅ Saved securely

- [ ] **Team notified** of deployment (if applicable)
- [ ] **README updated** with production URLs
- [ ] **DEPLOYMENT_GUIDE.md** reviewed

---

## Custom Domain (Optional)

### Vercel Custom Domain
- [ ] **Domain purchased** (e.g., from Namecheap, ~$12/year)
- [ ] **Added to Vercel:** Settings → Domains
- [ ] **DNS configured** (Vercel provides instructions)
- [ ] **SSL certificate** auto-generated by Vercel
- [ ] **Domain verified** and working

### Railway Custom Domain
- [ ] **Subdomain added** (e.g., `api.yourdomaincom`)
- [ ] **DNS CNAME** configured to Railway
- [ ] **SSL certificate** auto-generated
- [ ] **Updated frontend** `NEXT_PUBLIC_API_URL` to use custom domain

---

## Troubleshooting Performed

### If Build Failed
- [ ] Checked build logs in Railway/Vercel
- [ ] Verified all environment variables set
- [ ] Confirmed `package.json` scripts are correct
- [ ] Checked Node.js version compatibility

### If CORS Errors
- [ ] Verified `CORS_ORIGINS` includes frontend URL
- [ ] Checked no trailing slashes in URLs
- [ ] Confirmed Railway redeployed after CORS update
- [ ] Tested with curl or Postman

### If WebSocket Fails
- [ ] Verified `NEXT_PUBLIC_WS_URL` is correct
- [ ] Checked Railway allows WebSocket (it does)
- [ ] Tested WebSocket connection in browser console
- [ ] Reviewed backend logs for WebSocket errors

### If Database Connection Fails
- [ ] Verified `DATABASE_URL` format is correct
- [ ] Confirmed `?sslmode=require` at end of URL
- [ ] Checked Neon database is active
- [ ] Tested connection with: `npx prisma db push`

---

## Cost Tracking

### Current Usage (Free Tier)
- **Vercel:** Bandwidth used: _____ / 100GB
- **Railway:** Credit used: $_____ / $5.00
- **Neon:** Storage used: _____ / 500MB

### When to Upgrade
Monitor these limits:
- [ ] Vercel bandwidth > 80GB/month
- [ ] Railway credit running low
- [ ] Neon storage > 400MB
- [ ] Need better performance/uptime

---

## Next Steps After Deployment

### Immediate (24 hours)
- [ ] Monitor logs for errors
- [ ] Test all features thoroughly
- [ ] Share with beta testers
- [ ] Collect initial feedback

### Short-term (1 week)
- [ ] Set up monitoring alerts
- [ ] Add more comprehensive error handling
- [ ] Implement analytics tracking
- [ ] Create user documentation

### Medium-term (1 month)
- [ ] Review performance metrics
- [ ] Optimize database queries
- [ ] Add more features based on feedback
- [ ] Consider custom domain

### Long-term (3+ months)
- [ ] Plan for scaling beyond free tier
- [ ] Implement advanced features
- [ ] Add comprehensive testing
- [ ] Consider premium RPC providers

---

## Success Metrics

Your deployment is successful when:

✅ **Frontend**
- Website loads in < 3 seconds
- No console errors
- All pages accessible
- Wallet connects successfully

✅ **Backend**
- API responds in < 500ms
- Database queries work
- WebSocket connects
- No error logs

✅ **Integration**
- Can create strategies
- Trades execute successfully
- Real-time updates work
- No CORS errors

---

## 🎉 Deployment Complete!

**Once all checkboxes are complete, your OrderSwap app is live and ready to use!**

**Share your success:**
- Frontend URL: `https://your-app.vercel.app`
- Backend URL: `https://your-backend.railway.app`
- Total Cost: $0/month (free tier)

---

**Need help?** Refer to [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

**Quick Start?** See [QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md) for 5-minute setup.

