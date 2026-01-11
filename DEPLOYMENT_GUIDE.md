# RKRoots Deployment Guide

This guide covers deploying RKRoots to production using Railway (backend), Supabase (database + storage), and EAS (mobile app).

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Railway CLI (`npm install -g @railway/cli`)

## Quick Start

1. Set up Supabase project (database)
2. Deploy backend to Railway
3. Configure environment variables
4. Build and deploy mobile app with EAS

---

## 1. Supabase Setup (Database + Storage)

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and configure:
   - Project name: `rkroots`
   - Database password: Generate a strong password (save this!)
   - Region: Choose closest to your users
3. Wait for project to provision (~2 minutes)

### Get Connection Details

From Supabase Dashboard > Settings > Database:

```
Host: db.[PROJECT-REF].supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [your-database-password]
```

### Run Migrations

```bash
cd backend

# Set production database URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Run migrations
npm run migrate
```

### Configure Storage (Optional)

1. Go to Supabase Dashboard > Storage
2. Create a bucket named `profile-images`
3. Set bucket to public or configure RLS policies

---

## 2. Railway Backend Deployment

### Initial Setup

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your RKRoots repository
4. Railway will auto-detect the Node.js backend

### Configure Service

1. Click on the deployed service
2. Go to Settings > General:
   - Root Directory: `backend`
   - Start Command: `npm start`
3. Go to Settings > Networking:
   - Generate Domain (e.g., `rkroots-backend.railway.app`)

### Environment Variables

Go to Variables tab and add:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=[generate-strong-secret]
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=[generate-strong-secret]
JWT_REFRESH_EXPIRES_IN=7d

# Sentry (optional - free tier)
SENTRY_DSN=[your-sentry-dsn]

# OAuth (configure in respective developer consoles)
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
GOOGLE_CALLBACK_URL=https://[your-railway-domain]/api/v1/auth/google/callback
```

Note: Redis is not required for initial deployment. The app uses in-memory caching.

### Auto-Deploy from GitHub

Railway automatically deploys on push to `main` branch. To configure:

1. Go to Settings > Source
2. Ensure "Automatic Deploys" is enabled
3. Select branch: `main`

### Manual Deploy via CLI

```bash
# Login to Railway
railway login

# Link to project
railway link

# Deploy
cd backend
railway up
```

---

## 3. Sentry Error Tracking (Free Tier)

### Setup

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project:
   - Platform: Node.js
   - Project name: `rkroots-backend`
3. Copy the DSN from the setup page

### Configure

Add to Railway environment variables:

```env
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
```

Sentry is already integrated in the codebase (`backend/src/common/sentry/index.ts`).

---

## 4. Mobile App Deployment (EAS)

### Initial Setup

```bash
cd mobile

# Login to Expo
eas login

# Configure EAS for your project
eas build:configure
```

### Update Configuration

Edit `app.json`:
- Update `extra.eas.projectId` with your EAS project ID
- Update `owner` with your Expo username

Edit `eas.json`:
- Update `API_URL` in production env to your Railway URL

### Build for Preview (Internal Testing)

```bash
# Android APK
eas build --platform android --profile preview

# iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

### Build for Production

```bash
# Android App Bundle
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### Submit to App Stores

```bash
# Android (requires Google Play Console setup)
eas submit --platform android --profile production

# iOS (requires App Store Connect setup)
eas submit --platform ios --profile production
```

---

## 5. GitHub Actions CI/CD

The repository includes automated deployment workflows:

### Required Secrets

Add these secrets in GitHub > Settings > Secrets:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway API token (from railway.app > Account Settings) |
| `EXPO_TOKEN` | Expo access token (from expo.dev > Account Settings) |

### Workflows

- **CI** (`.github/workflows/ci.yml`): Runs tests on all PRs
- **Deploy** (`.github/workflows/deploy-railway.yml`): Deploys to Railway on push to `main`

---

## 6. Verify Deployment

### Backend Health Check

```bash
curl https://[your-railway-domain]/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### Test API Endpoints

```bash
# Register a user
curl -X POST https://[your-railway-domain]/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","displayName":"Test User"}'
```

---

## 7. Monitoring & Logs

### Railway Logs

```bash
railway logs
```

Or view in Railway Dashboard > Deployments > View Logs

### Sentry Dashboard

View errors and performance at [sentry.io](https://sentry.io)

---

## 8. Cost Estimates (Free Tiers)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Railway | $5 credit/month | $5/month + usage |
| Supabase | 500MB DB, 1GB storage | $25/month |
| Sentry | 5K events/month | $26/month |
| EAS Build | 30 builds/month | $99/month |

**Estimated monthly cost for personal project: $0-10**

---

## 9. Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Railway Build Failures

1. Check build logs in Railway Dashboard
2. Ensure `package-lock.json` is committed
3. Verify Node.js version compatibility

### Mobile Build Failures

```bash
# Clear EAS cache
eas build --clear-cache --platform [android|ios]

# Check Expo doctor
npx expo-doctor
```

---

## 10. Rollback

### Railway

1. Go to Deployments in Railway Dashboard
2. Click on a previous successful deployment
3. Click "Rollback to this deployment"

### Mobile App

For OTA updates (Expo Updates):
```bash
eas update --branch production --message "Rollback to previous version"
```

For native builds, submit a new build with the previous version.
