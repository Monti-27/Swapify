# OrderSwap Deployment Guide

Complete guide for deploying OrderSwap backend and frontend to production.

## Backend Deployment

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ database
- Domain name with SSL certificate
- Solana premium RPC endpoint (Alchemy, QuickNode, or Helius)

### Option 1: Deploy to VPS (Digital Ocean, AWS EC2, etc.)

#### 1. Set up Server

```bash
# Connect to your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install PM2 for process management
npm install -g pm2
```

#### 2. Set up Database

```bash
# Switch to postgres user
su - postgres

# Create database and user
createdb orderswap
createuser orderswap_user -P
# Enter a strong password

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE orderswap TO orderswap_user;"
exit
```

#### 3. Deploy Backend

```bash
# Create app directory
mkdir -p /var/www/orderswap-backend
cd /var/www/orderswap-backend

# Clone repository (or upload files)
git clone <your-repo-url> .

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env
```

Edit `.env`:
```env
NODE_ENV=production
PORT=3000
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com

DATABASE_URL="postgresql://orderswap_user:your_password@localhost:5432/orderswap?schema=public"

JWT_SECRET=your-super-secret-jwt-key-generate-a-strong-one
JWT_EXPIRATION=7d

SOLANA_RPC_URL=https://your-premium-rpc-endpoint
SOLANA_NETWORK=mainnet-beta

JUPITER_API_URL=https://quote-api.jup.ag/v6
DEXSCREENER_API_URL=https://api.dexscreener.com/latest

RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

MONITORING_INTERVAL=5000
PRICE_CHECK_BATCH_SIZE=50

LOG_LEVEL=info
CORS_ORIGINS=https://your-domain.com
```

```bash
# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Build the application
npm run build

# Start with PM2
pm2 start dist/main.js --name orderswap-backend
pm2 save
pm2 startup
```

#### 4. Set up Nginx Reverse Proxy

```bash
# Install Nginx
apt install -y nginx

# Create Nginx configuration
nano /etc/nginx/sites-available/orderswap-api
```

Add configuration:
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site and test
ln -s /etc/nginx/sites-available/orderswap-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Install SSL with Let's Encrypt
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.your-domain.com
```

### Option 2: Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create orderswap-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set SOLANA_RPC_URL=your-rpc
# ... set all other env vars

# Deploy
git push heroku main

# Run migrations
heroku run npm run prisma:migrate
```

### Option 3: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Add PostgreSQL plugin
6. Set environment variables in dashboard
7. Deploy automatically on push

---

## Frontend Deployment

### Option 1: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
cd "OrderSwap Frontend"
vercel

# Follow prompts
# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://api.your-domain.com
# VITE_WS_URL=https://api.your-domain.com
# VITE_SOLANA_NETWORK=mainnet-beta

# For production
vercel --prod
```

### Option 2: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build project
cd "OrderSwap Frontend"
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

### Option 3: Deploy to VPS with Nginx

```bash
# Build project locally
cd "OrderSwap Frontend"
npm run build

# Upload dist folder to server
scp -r dist/* root@your-server:/var/www/orderswap-frontend

# Configure Nginx
nano /etc/nginx/sites-available/orderswap-frontend
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/orderswap-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable and restart
ln -s /etc/nginx/sites-available/orderswap-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Add SSL
certbot --nginx -d your-domain.com
```

---

## Post-Deployment Checklist

### Backend

- [ ] Database is accessible and migrated
- [ ] Environment variables are set correctly
- [ ] SSL certificate is installed
- [ ] API is accessible via HTTPS
- [ ] WebSocket connections work
- [ ] Monitoring is set up (PM2, logs)
- [ ] Database backups are configured
- [ ] Rate limiting is working
- [ ] CORS is configured for frontend domain
- [ ] Health check endpoint responds

### Frontend

- [ ] Build succeeds without errors
- [ ] Environment variables point to production API
- [ ] SSL certificate is installed
- [ ] All pages load correctly
- [ ] Wallet connection works
- [ ] API requests succeed
- [ ] WebSocket connects successfully
- [ ] All features work as expected

---

## Monitoring & Maintenance

### Backend Monitoring

```bash
# View PM2 logs
pm2 logs orderswap-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart orderswap-backend

# View database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Database Backups

```bash
# Create backup script
nano /usr/local/bin/backup-orderswap-db.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/orderswap"
mkdir -p $BACKUP_DIR
pg_dump orderswap > $BACKUP_DIR/orderswap_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
# Make executable
chmod +x /usr/local/bin/backup-orderswap-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-orderswap-db.sh
```

### Set up Monitoring (Optional)

- Use services like:
  - **Datadog** - Application monitoring
  - **New Relic** - Performance monitoring
  - **Sentry** - Error tracking
  - **UptimeRobot** - Uptime monitoring

---

## Scaling Considerations

### Database
- Enable connection pooling (PgBouncer)
- Set up read replicas for heavy read operations
- Implement caching (Redis)

### Backend
- Run multiple instances behind load balancer
- Use Redis for session storage
- Implement job queue (Bull, BullMQ) for long operations

### Frontend
- Use CDN for static assets
- Implement code splitting
- Enable PWA features

---

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, random secrets
   - Rotate JWT secrets periodically

2. **Database**
   - Use strong passwords
   - Limit connections to localhost only
   - Enable SSL for remote connections
   - Regular backups

3. **API**
   - Rate limiting enabled
   - Input validation on all endpoints
   - CORS properly configured
   - SSL/TLS enforced

4. **Monitoring**
   - Set up alerts for errors
   - Monitor resource usage
   - Track unusual activity
   - Regular security audits

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs orderswap-backend

# Check if port is in use
lsof -i :3000

# Check environment variables
pm2 env orderswap-backend
```

### Database connection fails
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test connection
psql -U orderswap_user -d orderswap -h localhost
```

### Frontend API calls fail
- Check CORS configuration in backend
- Verify API URL in frontend env vars
- Check SSL certificates
- Verify WebSocket URLs

---

## Support

For deployment issues, please open an issue on GitHub or contact support.

