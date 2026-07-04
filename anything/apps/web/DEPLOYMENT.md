# PlatformHQ — Deployment Guide

## 1. Local Development

```bash
cp .env.example .env.local   # fill in required vars
npm install
docker compose up postgres -d  # or use Neon free tier
npm run dev
```
Open http://localhost:3000

---

## 2. Neon Database Setup

1. Create project at https://neon.tech
2. Copy connection string → `DATABASE_URL` in `.env.local`

---

## 3. VPS Deployment (Ubuntu 22.04+)

```bash
# Install Node 20 + PM2 + Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx
sudo npm install -g pm2

# Clone and build
git clone <repo> /var/www/platformhq && cd /var/www/platformhq
npm install
cp .env.example .env.local && nano .env.local
npm run build

# Start
pm2 start npm --name "platformhq" -- start
pm2 save && pm2 startup
```

### Nginx config
```nginx
server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/platformhq /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d yourdomain.com
```

### Wildcard DNS for merchant custom domains
```
Type: A  |  Name: *  |  Value: <server-IP>  |  TTL: 3600
```

---

## 4. Webhook Retry Cron

```bash
# crontab — every 5 minutes
*/5 * * * * curl -s -X POST "https://yourdomain.com/api/webhooks/process-retries?secret=$CRON_SECRET"
```

---

## 5. First Store Setup

Visit `/platform` and use your `PLATFORM_SECRET`, or call:
```
POST /api/platform/stores
x-platform-secret: <PLATFORM_SECRET>
{ "name":"Acme","slug":"acme","adminEmail":"admin@acme.com","adminPassword":"Secure123!" }
```

---

## 6. Env Checklist

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon or local Postgres |
| `AUTH_SECRET` | ✅ | 64-byte random hex |
| `INTEGRATION_ENCRYPTION_KEY` | ✅ | 32-byte random hex |
| `PLATFORM_SECRET` | ✅ | Super-admin panel |
| `NEXT_PUBLIC_CREATE_APP_URL` | ✅ | Production domain |
| `RESEND_API_KEY` | ⚠️ | Emails degrade without it |
| `EMAIL_FROM` | ⚠️ | Resend-verified domain |
| `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` | ⚠️ | Product image uploads |
| `CRON_SECRET` | ⚠️ | Webhook retry auth |
