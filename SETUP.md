# OrderSwap Complete Setup Guide

This guide will walk you through setting up the complete OrderSwap system from scratch.

## System Requirements

- **Node.js** 18 or higher
- **PostgreSQL** 14 or higher
- **npm** or **yarn**
- **Git**

## Quick Start (Development)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd OrderSwap
```

### 2. Backend Setup

```bash
cd "OrderSwap Backend"

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/orderswap?schema=public"

# JWT Secret (generate a random string)
JWT_SECRET=your-secret-key-here

# Solana RPC (for development, use devnet)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Other settings (defaults are fine for development)
PORT=3000
```

```bash
# Set up database
npm run prisma:generate
npm run prisma:migrate

# Start development server
npm run start:dev
```

Backend will run on `http://localhost:3000`

API docs available at: `http://localhost:3000/api/docs`

### 3. Frontend Setup

Open a new terminal:

```bash
cd "OrderSwap Frontend"

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_SOLANA_NETWORK=devnet
```

```bash
# Start development server
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Test the System

1. Open browser to `http://localhost:5173`
2. Click "Connect Wallet"
3. Connect with Phantom or Solflare wallet
4. Navigate to "Strategies" tab
5. Create a test strategy
6. Monitor the strategy execution

## Detailed Setup

### Database Setup

#### Option 1: Local PostgreSQL

**Mac:**
```bash
brew install postgresql@14
brew services start postgresql@14
createdb orderswap
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb orderswap
sudo -u postgres createuser your_username
```

**Windows:**
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Install and create a database named `orderswap`

#### Option 2: Docker

```bash
docker run --name orderswap-postgres \
  -e POSTGRES_DB=orderswap \
  -e POSTGRES_USER=orderswap \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:14
```

#### Option 3: Managed Service

Use a managed PostgreSQL service:
- **Heroku Postgres** (free tier available)
- **Railway** (free tier available)
- **Supabase** (free tier available)
- **Amazon RDS**
- **DigitalOcean Managed Databases**

### Solana RPC Setup

#### Development (Free)

Use public endpoints:
- **Devnet:** `https://api.devnet.solana.com`
- **Testnet:** `https://api.testnet.solana.com`

#### Production (Premium RPC Required)

For production, use a premium RPC provider:

**Alchemy:**
1. Go to [alchemy.com](https://www.alchemy.com)
2. Create account and project
3. Get Solana RPC URL
4. Update `SOLANA_RPC_URL` in `.env`

**QuickNode:**
1. Go to [quicknode.com](https://www.quicknode.com)
2. Create Solana endpoint
3. Copy RPC URL
4. Update `.env`

**Helius:**
1. Go to [helius.xyz](https://www.helius.xyz)
2. Create account
3. Get RPC URL
4. Update `.env`

### JWT Secret Generation

Generate a secure random secret:

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and use it as `JWT_SECRET` in your `.env` file.

## Testing

### Backend Tests

```bash
cd "OrderSwap Backend"

# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Check coverage
npm run test:cov
```

### Frontend Tests

```bash
cd "OrderSwap Frontend"

# Lint check
npm run lint

# Type check
npm run build
```

## Common Issues

### Issue: Database connection fails

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify connection string in `.env`
3. Test connection: `psql $DATABASE_URL`

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Issue: Prisma migrations fail

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Or manually
dropdb orderswap && createdb orderswap
npm run prisma:migrate
```

### Issue: Wallet connection fails

**Solutions:**
- Make sure Phantom/Solflare extension is installed
- Check you're on the correct network (devnet/mainnet)
- Clear browser cache and try again
- Check console for errors

### Issue: WebSocket connection fails

**Solutions:**
- Check backend is running
- Verify `VITE_WS_URL` in frontend `.env`
- Check CORS settings in backend
- Check browser console for WebSocket errors

## Development Workflow

### Adding a New Feature

1. **Backend:**
   - Create new module: `nest g module feature`
   - Create service: `nest g service feature`
   - Create controller: `nest g controller feature`
   - Add database models to `prisma/schema.prisma`
   - Run migration: `npm run prisma:migrate`

2. **Frontend:**
   - Create component in `src/components/`
   - Add API methods to `src/services/api.ts`
   - Update types in `src/types/index.ts`
   - Add route if needed in `src/App.tsx`

### Database Schema Changes

```bash
# 1. Modify prisma/schema.prisma
# 2. Create migration
npm run prisma:migrate

# 3. Generate Prisma client
npm run prisma:generate
```

### Viewing Database

```bash
# Use Prisma Studio (recommended)
npm run prisma:studio

# Or use psql
psql $DATABASE_URL
```

## Environment Variables Reference

### Backend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Environment | `development` or `production` |
| `PORT` | No | Server port | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Yes | JWT signing key | Random base64 string |
| `JWT_EXPIRATION` | No | Token expiry | `7d` |
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `SOLANA_NETWORK` | Yes | Network name | `devnet`, `mainnet-beta` |
| `CORS_ORIGINS` | No | Allowed origins | `http://localhost:5173` |
| `MONITORING_INTERVAL` | No | Check interval (ms) | `5000` |

### Frontend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API URL | `http://localhost:3000` |
| `VITE_WS_URL` | Yes | WebSocket URL | `http://localhost:3000` |
| `VITE_SOLANA_NETWORK` | Yes | Solana network | `devnet`, `mainnet-beta` |

## Security Checklist

Before deploying to production:

- [ ] Use strong, random JWT_SECRET
- [ ] Use premium Solana RPC (not public endpoints)
- [ ] Enable SSL/HTTPS for both frontend and backend
- [ ] Set strong PostgreSQL password
- [ ] Configure CORS to allow only your frontend domain
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` files
- [ ] Review all API endpoints for authentication
- [ ] Enable logging and monitoring
- [ ] Test wallet signature verification
- [ ] Verify non-custodial architecture (no private keys stored)

## Getting Help

- **Documentation:** See `/OrderSwap Backend/README.md` and `/OrderSwap Frontend/README.md`
- **API Docs:** `http://localhost:3000/api/docs` (when backend is running)
- **Issues:** Open an issue on GitHub
- **Discord:** Join our community (if applicable)

## Next Steps

1. **Development:**
   - Customize UI/UX
   - Add more trading strategies
   - Implement additional features
   - Write tests

2. **Testing:**
   - Test on Solana devnet
   - Test with real wallets
   - Load testing
   - Security audit

3. **Deployment:**
   - See `DEPLOYMENT.md` for production deployment guide
   - Set up monitoring and alerts
   - Configure backups
   - Deploy to mainnet

## Deployment

Ready to deploy your app? We have comprehensive deployment guides!

### 🚀 Quick Deployment (5 minutes)
For fast deployment to production:
- **See:** [QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md)

### 📖 Complete Deployment Guide
For detailed step-by-step instructions:
- **See:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Verify with:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Troubleshoot:** [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)

### 💰 Cost: $0/month (Free Tier)
- Frontend: Vercel (Free)
- Backend: Railway (Free $5 credit/month)
- Database: Neon (Free 500MB)

All deployment documentation: [DEPLOYMENT_README.md](./DEPLOYMENT_README.md)

---

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

