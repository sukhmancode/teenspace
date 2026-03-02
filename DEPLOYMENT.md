# Deployment Guide - TeenSpace

This guide covers deploying the backend to Render and frontend to Vercel.

## Prerequisites

- GitHub repository with this code
- Render account (https://render.com)
- Vercel account (https://vercel.com)
- PostgreSQL database (Neon recommended: https://neon.tech)

---

## Backend Deployment - Render

### Step 1: Create PostgreSQL Database (Neon)

1. Go to https://neon.tech and create an account
2. Create a new project
3. Copy the connection string (includes DATABASE_URL)
4. Keep this safe - you'll need it for Render

### Step 2: Deploy Backend to Render

1. Go to https://render.com/dashboard
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Select the repository branch (main/master)
5. Configure the service:
   - **Name**: `teenspace-api`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Region**: Oregon (or your preference)

6. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *Paste from Neon*
   - `SESSION_SECRET`: *Generate a random 32+ char string*
   - `PORT`: `10000` (Render's default)

7. Click **Create Web Service**
8. Wait ~5-10 minutes for deployment
9. Copy your Render backend URL (e.g., `https://teenspace-api.onrender.com`)

### Step 3: Auto-Deploy Setup (Optional)

To auto-deploy on git push:
1. In Render dashboard, go to your service
2. Settings → Auto-Deploy → Change to "Yes"

---

## Frontend Deployment - Vercel

### Step 1: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`

5. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://teenspace-api.onrender.com` (your Render backend URL)

6. Click **Deploy**
7. Wait ~2-3 minutes for deployment
8. Copy your Vercel frontend URL (e.g., `https://teenspace.vercel.app`)

### Step 2: Configure CORS (Backend)

Update `server/index.ts` or wherever CORS is configured:

```typescript
app.use(cors({
  origin: "https://teenspace.vercel.app", // Your Vercel URL
  credentials: true
}));
```

Then redeploy backend.

---

## Environment Variables Checklist

### Backend (Render)
- ✅ `NODE_ENV` = `production`
- ✅ `DATABASE_URL` = Neon connection string
- ✅ `SESSION_SECRET` = Random 32+ char string
- ✅ `PORT` = `10000`

### Frontend (Vercel)
- ✅ `VITE_API_URL` = `https://teenspace-api.onrender.com`

---

## Post-Deployment Checks

1. **Test Frontend**: Open your Vercel URL in browser
2. **Test Backend**: Visit `https://teenspace-api.onrender.com/api/user`
3. **Test Auth**: Try login on frontend - should work
4. **Check Database**: Connect to Neon to verify data is being stored

---

## Troubleshooting

### Backend fails to build
- Check `render.yaml` is in root
- Verify all dependencies in `package.json`
- Check build logs in Render dashboard

### Frontend shows "Cannot reach API"
- Verify `VITE_API_URL` is set correctly
- Check CORS is configured in backend
- Verify backend is running (check Render logs)

### Database connection fails
- Verify `DATABASE_URL` in Render env vars
- Check Neon database is running
- Test connection locally first: `npm run db:push`

### Session/Auth issues
- Generate new `SESSION_SECRET` (32+ random chars)
- Redeploy backend
- Clear browser cookies

---

## Monitoring

### Render
- Dashboard shows real-time logs
- CPU/Memory usage monitored
- Set up alerts for failures

### Vercel
- Analytics tab shows traffic, performance
- Deployments tab shows each deployment
- Automatic rollback on failed builds

### Database (Neon)
- Use Neon Console to view queries
- Monitor connection count

---

## Updates && Redeployments

### Pushing Updates

**Backend Changes:**
```bash
git add .
git commit -m "Update API"
git push origin main
# Render auto-deploys (if enabled)
```

**Frontend Changes:**
```bash
git add .
git commit -m "Update UI"
git push origin main
# Vercel auto-deploys automatically
```

### Manual Redeploy
- **Render**: Dashboard → Service → Redeploy
- **Vercel**: Dashboard → Project → Redeploy

---

## Cost Estimates (Free Tier)

- **Render**: Free tier includes 1 free web service (~$7/month value)
- **Vercel**: Free tier includes unlimited deployments
- **Neon**: Free tier includes 1 project, 3GB storage

**Typical Production Cost**: $5-20/month (Render Pro + Database)

---

## Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Use strong `SESSION_SECRET`** - Min 32 chars, random
3. **Enable HTTPS** - Both Render & Vercel auto-enable
4. **Database passwords** - Keep in Render env vars only
5. **API rate limiting** - Consider adding in production

---

## Need Help?

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
