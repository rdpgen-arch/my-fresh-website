# Self-Hosting Guide — Hetzner VPS (Ubuntu 22.04)
## Complete Independence from Anything.com

---

## 1. Prerequisites

### What you need before starting:
- A Hetzner account → https://hetzner.com (CX22 = 2 vCPU, 4 GB RAM, ~€4/mo)
- A domain name (e.g. from Namecheap, GoDaddy, or Bangladeshi registrars)
- Neon PostgreSQL account → https://neon.tech (free tier is enough to start)
- Uploadcare account → https://uploadcare.com (free tier: 3 GB storage)
- Resend account → https://resend.com (free: 3,000 emails/month)
- Your project code (downloaded from Anything.com)

---

## 2. Server Setup (Hetzner CX22)

### 2.1 Create the server
1. Login to https://console.hetzner.cloud
2. New Project → Add Server
3. Choose: **Ubuntu 22.04**, **CX22** (2 vCPU, 4 GB)
4. Enable SSH key (paste your public key) or use a root password
5. Click Create. Note the **public IP address**.

### 2.2 Point your domain to the server
In your domain registrar's DNS panel:
```
A record:   @          → <your-server-IP>
A record:   www        → <your-server-IP>
A record:   api        → <your-server-IP>   (optional, for API subdomain)
```
DNS propagation takes 5-60 minutes.

### 2.3 SSH into the server
```bash
ssh root@<your-server-IP>
```

### 2.4 Install Node.js 20 + PM2 + Nginx
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node --version   # should show v20.x.x
npm --version

# Install PM2 (process manager — keeps app running after crashes + on reboot)
npm install -g pm2

# Install Nginx (web server / reverse proxy)
apt install -y nginx

# Install Certbot (free SSL via Let's Encrypt)
apt install -y certbot python3-certbot-nginx
```

---

## 3. Deploy Your Application

### 3.1 Upload your code to the server

**Option A: Git (recommended)**
```bash
# On server:
cd /var/www
git clone https://github.com/your-username/your-repo.git shopmanager
cd shopmanager
```

**Option B: SCP (direct upload)**
```bash
# On your local machine:
scp -r ./apps root@<your-server-IP>:/var/www/shopmanager/
```

### 3.2 Install dependencies
```bash
cd /var/www/shopmanager
npm install
```

### 3.3 Create environment file
```bash
nano /var/www/shopmanager/.env
```

Paste the following (fill in your values — see Section 6 for where to get each one):
```bash
# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# ── Encryption ───────────────────────────────────────────────────────────────
INTEGRATION_ENCRYPTION_KEY=<64-char hex string — run: openssl rand -hex 32>

# ── Auth ─────────────────────────────────────────────────────────────────────
AUTH_SECRET=<random string — run: openssl rand -hex 32>
BETTER_AUTH_SECRET=<same or different random string>
AUTH_URL=https://yourdomain.com
BETTER_AUTH_URL=https://yourdomain.com

# ── App URL ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_CREATE_APP_URL=https://yourdomain.com
NODE_ENV=production

# ── Platform ─────────────────────────────────────────────────────────────────
PLATFORM_SECRET=<random string — run: openssl rand -hex 32>

# ── File Uploads (Uploadcare) ─────────────────────────────────────────────────
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=<your uploadcare public key>

# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=orders@yourdomain.com
STAFF_NOTIFICATION_EMAIL=you@yourdomain.com

# ── SMS (mimsms) ─────────────────────────────────────────────────────────────
# (configured per-store via Admin → Integrations)

# ── Google Tag Manager (optional) ─────────────────────────────────────────────
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

### 3.4 Build the application
```bash
cd /var/www/shopmanager
npm run build
```
This takes 2-5 minutes on a CX22.

### 3.5 Start with PM2
```bash
# The project already has pm2.config.js — use it:
pm2 start pm2.config.js --env production

# OR start manually:
pm2 start npm --name "shopmanager" -- start

# Save PM2 config (so it restarts after server reboot)
pm2 save

# Enable PM2 autostart on reboot
pm2 startup
# ↑ This prints a command — copy and run it (it'll start with "sudo env PATH=...")
```

Verify it's running:
```bash
pm2 status
pm2 logs shopmanager
```

---

## 4. Nginx Configuration (Reverse Proxy + SSL)

### 4.1 Create Nginx config
```bash
nano /etc/nginx/sites-available/shopmanager
```

Paste:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL (Certbot will fill these in)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy all traffic to Next.js (running on port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
```

### 4.2 Enable the site
```bash
ln -s /etc/nginx/sites-available/shopmanager /etc/nginx/sites-enabled/
nginx -t   # test config
systemctl reload nginx
```

### 4.3 Get SSL certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the prompts. Certbot auto-renews every 90 days.

---

## 5. Database Setup (Neon PostgreSQL)

### 5.1 Create a Neon database
1. Go to https://neon.tech → Sign up
2. Create Project → name it "shopmanager-prod"
3. Copy the connection string: `postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require`
4. Paste it as `DATABASE_URL` in your `.env` file

### 5.2 Run database migrations
After your app is running, navigate to:
```
https://yourdomain.com/api/admin/migrate
```
(This runs all schema migrations automatically)

Then bootstrap the first store:
```
https://yourdomain.com/api/admin/bootstrap
```

---

## 6. Complete Environment Variable Reference

| Variable | Purpose | How to get |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | neon.tech → Project → Connection Details |
| `INTEGRATION_ENCRYPTION_KEY` | Encrypts payment gateway keys stored in DB | `openssl rand -hex 32` |
| `AUTH_SECRET` | Signs JWT auth tokens | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | Better Auth session secret | `openssl rand -hex 32` |
| `AUTH_URL` | Your app's base URL | `https://yourdomain.com` |
| `BETTER_AUTH_URL` | Same as AUTH_URL | `https://yourdomain.com` |
| `NEXT_PUBLIC_CREATE_APP_URL` | Public base URL for storefront links | `https://yourdomain.com` |
| `PLATFORM_SECRET` | Protects `/platform` superadmin and system APIs | `openssl rand -hex 32` |
| `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` | Image upload (product photos, logos) | uploadcare.com → Dashboard → API Keys → Public key |
| `RESEND_API_KEY` | Transactional email | resend.com → API Keys → Create |
| `EMAIL_FROM` | Sender email address | Must match verified domain in Resend |
| `STAFF_NOTIFICATION_EMAIL` | Where to send new order admin alerts | Your email address |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager | tagmanager.google.com → container ID |
| `NODE_ENV` | Environment mode | Set to `production` |

### Per-store credentials (configured in Admin → Integrations):
These are stored encrypted in the database — no `.env` needed:
- bKash: `app_key`, `app_secret`, `username`, `password`, `merchant_number`
- Nagad: `merchant_id`, `merchant_number`, `public_key`, `private_key`
- Steadfast: `api_key`, `secret_key`
- Pathao: `client_id`, `client_secret`, `merchant_name`
- mimsms: `api_key`, `sender_id`

---

## 7. Updating the Application

```bash
cd /var/www/shopmanager
git pull origin main          # pull latest code
npm install                   # install any new dependencies
npm run build                 # rebuild
pm2 restart shopmanager       # restart without downtime
```

---

## 8. Monitoring & Logs

```bash
pm2 logs shopmanager          # live logs
pm2 logs shopmanager --lines 100   # last 100 lines
pm2 monit                    # real-time CPU/memory dashboard
nginx -t                     # test nginx config
journalctl -u nginx -f       # nginx error logs
```

---

## 9. Custom Domain for Each Client Store

Each store can have its own domain (e.g. `www.yourclientshop.com`).

1. In Admin → Store Settings → Custom Domain, enter `www.yourclientshop.com`
2. Ask your client to add a CNAME record:
   ```
   CNAME: www → yourdomain.com
   ```
3. The app automatically resolves the domain to the correct store via `/api/resolve-domain`
4. For SSL on client domains, add them to your Certbot cert:
   ```bash
   certbot --nginx -d yourdomain.com -d www.clientshop.com --expand
   ```

---

## 10. Firewall Setup (recommended)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```
