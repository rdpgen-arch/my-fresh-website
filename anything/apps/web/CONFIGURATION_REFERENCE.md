# Complete Configuration Reference
## Every Environment Variable — What It Does & How To Get It

---

## Quick Start: Minimum Required Variables

To run this app at all, you need at minimum:
1. `DATABASE_URL` — the database
2. `INTEGRATION_ENCRYPTION_KEY` — to save payment credentials
3. `AUTH_SECRET` — to sign login tokens
4. `NEXT_PUBLIC_CREATE_APP_URL` — so links in emails/SMS work

---

## All Environment Variables

### 1. DATABASE_URL

**What it does:** Connects the app to your PostgreSQL database. Every order, product, user, and store lives here.

**How to get it:**
1. Go to https://neon.tech → Sign up (free)
2. Create Project → choose a region close to Bangladesh (Singapore or Mumbai)
3. Click "Connection Details" → copy the connection string
4. Format: `postgresql://user:password@ep-xxx.region.neon.tech/neondb?sslmode=require`

**Example:**
```
DATABASE_URL=postgresql://alex:pass123@ep-cool-sunset-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

---

### 2. INTEGRATION_ENCRYPTION_KEY

**What it does:** A secret key used to encrypt payment gateway credentials (bKash API keys, Nagad private keys, etc.) before storing them in the database. If someone steals the database, they still can't read the payment credentials without this key.

**How to get it:** Generate a random 64-character hex string:
```bash
openssl rand -hex 32
# Example output: a3f9e2b1c8d4f7a0b2e5c9d1f3a6b8c0d2e4f7a9b1c3e5f7a9b2c4d6e8f0a2b4
```

**Example:**
```
INTEGRATION_ENCRYPTION_KEY=a3f9e2b1c8d4f7a0b2e5c9d1f3a6b8c0d2e4f7a9b1c3e5f7a9b2c4d6e8f0a2b4
```

---

### 3. AUTH_SECRET

**What it does:** Signs the JWT (JSON Web Token) that proves a user is logged in. If someone guesses this, they could forge login tokens.

**How to get it:**
```bash
openssl rand -hex 32
```

**Example:**
```
AUTH_SECRET=b7c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2
```

---

### 4. BETTER_AUTH_SECRET

**What it does:** Same purpose as AUTH_SECRET but used by the BetterAuth library. Can be the same value as AUTH_SECRET or different.

```
BETTER_AUTH_SECRET=<same as AUTH_SECRET or generate a new one>
```

---

### 5. AUTH_URL / BETTER_AUTH_URL

**What it does:** The base URL of your application. Used to build callback URLs for auth flows.

```
AUTH_URL=https://yourdomain.com
BETTER_AUTH_URL=https://yourdomain.com
```

---

### 6. NEXT_PUBLIC_CREATE_APP_URL

**What it does:** The public base URL of your app. Used in:
- Email links (order confirmation, password reset)
- SMS tracking links
- bKash payment callback URL
- Facebook catalog feed links

```
NEXT_PUBLIC_CREATE_APP_URL=https://yourdomain.com
```

For local development:
```
NEXT_PUBLIC_CREATE_APP_URL=http://localhost:3000
```

---

### 7. PLATFORM_SECRET

**What it does:** A secret that protects:
- The `/platform` superadmin page (where you create new stores)
- The `/api/notifications/low-stock-check` endpoint (for scheduled jobs)

```bash
openssl rand -hex 32
```

```
PLATFORM_SECRET=<random hex string>
```

---

### 8. NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY

**What it does:** Allows uploading product images and store logos to Uploadcare CDN. The public key is safe to expose to the browser.

**How to get it:**
1. Go to https://uploadcare.com → Sign up (free: 3 GB storage)
2. Dashboard → API Keys → copy the **Public key** (starts with something like `demopublickey`)

**Example:**
```
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=abc123publickey
```

---

### 9. RESEND_API_KEY

**What it does:** Sends transactional emails:
- Order confirmation to customers
- New order notification to staff
- Password reset emails
- User invite emails

**How to get it:**
1. Go to https://resend.com → Sign up (free: 3,000 emails/month)
2. API Keys → Create API Key → copy it (starts with `re_`)

**Example:**
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 10. EMAIL_FROM

**What it does:** The "From" address on all outgoing emails. Must be a verified domain in Resend.

**Setup:**
1. In Resend → Domains → Add Domain → enter `yourdomain.com`
2. Add the DNS records they show you (SPF, DKIM)
3. Wait for verification (usually 5-30 minutes)
4. Then set: `EMAIL_FROM=orders@yourdomain.com`

**Example:**
```
EMAIL_FROM=orders@yourdomain.com
```

---

### 11. STAFF_NOTIFICATION_EMAIL

**What it does:** Email address that receives a notification every time a new order is placed. Usually the shop owner's personal email.

**Example:**
```
STAFF_NOTIFICATION_EMAIL=owner@yourdomain.com
```

---

### 12. NEXT_PUBLIC_GTM_ID (optional)

**What it does:** Google Tag Manager container ID. Used to track customer behavior on storefronts (Google Analytics, Facebook Pixel, etc.). Only needed if you want analytics tracking.

**How to get it:**
1. Go to https://tagmanager.google.com
2. Create Account → Create Container → Web
3. Copy the container ID (format: `GTM-XXXXXXX`)

**Example:**
```
NEXT_PUBLIC_GTM_ID=GTM-ABC1234
```

---

## Per-Store Credentials (Stored Encrypted in Database)

These are configured in the Admin panel under **Integrations** — NOT in `.env`. They're stored encrypted per store.

### bKash Payment Gateway

Get from: https://developer.bka.sh → Merchant Account
- `app_key`: bKash App Key
- `app_secret`: bKash App Secret  
- `username`: Merchant Username
- `password`: Merchant Password
- `merchant_number`: Your bKash number (01XXXXXXXXX)
- `sandbox`: true for testing, false for live

**Your Callback URL** (register in bKash portal):
```
https://yourdomain.com/api/callbacks/bkash/ipn
https://yourdomain.com/api/callbacks/bkash/return
```

---

### Nagad Payment Gateway

Get from: https://nagad.com.bd → Merchant Registration → API Portal
- `merchant_id`: Nagad Merchant ID
- `merchant_number`: Your Nagad number
- `public_key`: Nagad's RSA public key (they provide this)
- `private_key`: Your RSA private key (you generate this, share public key with Nagad)
- `sandbox`: true for testing, false for live

**Generate RSA keypair:**
```bash
# Generate private key
openssl genrsa -out merchant_private.pem 2048

# Extract public key
openssl rsa -in merchant_private.pem -pubout -out merchant_public.pem

# Share merchant_public.pem with Nagad
# Paste merchant_private.pem content into the admin panel (Private Key field)
```

**Your Callback URL:**
```
https://yourdomain.com/api/callbacks/nagad/ipn
```

---

### Steadfast Courier

Get from: https://steadfast.com.bd → Contact their support team to request API access
- `api_key`: Steadfast API Key
- `secret_key`: Steadfast Secret Key

**Your Webhook URL** (register in Steadfast portal for delivery status updates):
```
https://yourdomain.com/api/callbacks/steadfast/webhook
```

---

### Pathao Courier

Get from: https://courier.pathao.com → Merchant Account → Settings → API Access
- `client_id`: Pathao OAuth2 Client ID
- `client_secret`: Pathao OAuth2 Client Secret
- `merchant_name`: Your business name
- `city_id`: Your default city (1=Dhaka, 2=Chittagong, etc.)
- `sandbox`: true for testing

---

### mimsms (SMS Provider)

Get from: https://mimsms.com → Register → Dashboard → API Key
- `api_key`: Your mimsms API Key
- `sender_id`: Your registered Sender ID (e.g. your brand name, max 11 chars)

**Important:** Sender IDs must be registered and approved by mimsms before use.

---

## Mobile App Variables (Expo)

These go in `/apps/mobile/.env` or are set in the Expo dashboard:

| Variable | Value | Where to use |
|---|---|---|
| `EXPO_PUBLIC_BASE_URL` | `https://yourdomain.com` | Base URL for API calls from mobile app |
| `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY` | Same as web | Product photo uploads from mobile |

---

## Generating Secrets (One-Liner Reference)

```bash
# INTEGRATION_ENCRYPTION_KEY, AUTH_SECRET, BETTER_AUTH_SECRET, PLATFORM_SECRET:
openssl rand -hex 32

# Or in Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Checklist Before Going Live

### Backend (.env):
- [ ] `DATABASE_URL` — Neon production database
- [ ] `INTEGRATION_ENCRYPTION_KEY` — generated, stored safely
- [ ] `AUTH_SECRET` and `BETTER_AUTH_SECRET` — generated
- [ ] `AUTH_URL` and `BETTER_AUTH_URL` — your live domain with https
- [ ] `NEXT_PUBLIC_CREATE_APP_URL` — your live domain with https
- [ ] `PLATFORM_SECRET` — generated
- [ ] `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` — from Uploadcare
- [ ] `RESEND_API_KEY` — from Resend
- [ ] `EMAIL_FROM` — verified domain sender
- [ ] `STAFF_NOTIFICATION_EMAIL` — where new order alerts go
- [ ] `NODE_ENV=production`

### Admin Panel → Integrations:
- [ ] bKash configured and tested in sandbox
- [ ] Steadfast API key entered
- [ ] mimsms API key entered with sender ID
- [ ] Store contact phone number set (used for merchant SMS alerts)

### Mobile App:
- [ ] `EXPO_PUBLIC_BASE_URL` set to your live domain
- [ ] `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY` set
- [ ] Bundle IDs set in app.json
- [ ] google-services.json and GoogleService-Info.plist added
- [ ] `eas.json` configured with your Apple and Play Store credentials
