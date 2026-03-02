# 🚀 Deployment Quick Reference

## Files Created for Deployment

✅ **render.yaml** - Infrastructure as code for Render backend  
✅ **vercel.json** - Configuration for Vercel frontend  
✅ **.env.example** - Environment variables template  
✅ **DEPLOYMENT.md** - Complete deployment guide  
✅ **README.md** - Project documentation  
✅ **.gitignore** - Updated with .env security  
✅ **deploy.sh** - Quick setup script  

---

## 📋 Deployment Checklist

### Before You Start
- [ ] GitHub repository created & pushed
- [ ] All code committed (git status clean)
- [ ] .env NOT committed (check .gitignore)
- [ ] Local testing works (npm run dev)
- [ ] Build succeeds locally (npm run build)

### Create Database (Pick One)

**Option A: Neon (Recommended)**
- [ ] Sign up at https://neon.tech
- [ ] Create new project
- [ ] Copy connection string to DATABASE_URL in .env
- [ ] Run `npm run db:push` to migrate

**Option B: AWS RDS/Other Provider**
- [ ] Create PostgreSQL instance
- [ ] Note connection string
- [ ] Ensure publicly accessible OR configure VPC
- [ ] Run `npm run db:push`

### Deploy Backend (Render)

1. [ ] Go to https://render.com
2. [ ] Click **New** → **Web Service**
3. [ ] Connect GitHub repo
4. [ ] Fill in:
   - **Name**: teenspace-api
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Region**: oregonor (US, closest to most)

5. [ ] Add these env vars in Render dashboard:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = *(paste from Neon)*
   - `SESSION_SECRET` = *(generate random 32+ chars)*
   - `PORT` = `10000` *(Render's dynamic port)*

6. [ ] Click **Create Web Service**
7. [ ] Wait 5-10 minutes for deployment
8. [ ] Check logs for errors
9. [ ] Copy backend URL (e.g., `https://teenspace-api.onrender.com`)

### Deploy Frontend (Vercel)

1. [ ] Go to https://vercel.com/dashboard
2. [ ] Click **+ Add New** → **Project**
3. [ ] Import GitHub repository
4. [ ] Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`

5. [ ] Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: *(your Render backend URL from step 9 above)*

6. [ ] Click **Deploy**
7. [ ] Wait 2-3 minutes
8. [ ] Copy frontend URL (e.g., `https://teenspace.vercel.app`)

### Post-Deployment

1. [ ] Test frontend loads: Visit your Vercel URL
2. [ ] Test login: Try signing up/logging in
3. [ ] Test API: Open browser console, check no CORS errors
4. [ ] Check database: Verify users table has data (Neon Console)
5. [ ] Update CORS in code (optional):
   ```typescript
   // In server/routes.ts or wherever CORS is configured
   app.use(cors({
     origin: "https://your-vercel-url.vercel.app",
     credentials: true
   }));
   // Then redeploy backend
   ```

---

## 🌐 After Deployment

### Local Development Still Works
```bash
npm run dev  # Still uses localhost:5000
```

### Updating Code

**Backend Update:**
```bash
git add server/ shared/
git commit -m "Fix API endpoint"
git push origin main
# Render auto-deploys (if enabled)
# OR manually: Render Dashboard → Redeploy
```

**Frontend Update:**
```bash
git add client/
git commit -m "Fix UI bug"
git push origin main
# Vercel auto-deploys automatically
```

### Monitoring

**Render Dashboard:**
- Click your service
- **Logs** tab shows real-time output
- **Metrics** tab shows CPU/memory
- **Deployments** tab shows history

**Vercel Dashboard:**
- Click your project
- **Deployments** tab shows each build
- **Analytics** tab shows visitor stats
- **Logs** available on Pro plan

---

## 🔧 Environment Variables

### Backend (Render Environment)
```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host/db
SESSION_SECRET=your-random-secret-32-chars-minimum
PORT=10000
```

### Frontend (Vercel Environment)
```
VITE_API_URL=https://teenspace-api.onrender.com
```

### Local Development (.env)
```
NODE_ENV=development
DATABASE_URL=postgresql://neon_connection_string
SESSION_SECRET=dev-secret-not-secure
PORT=5000
VITE_API_URL=http://localhost:5000
```

---

## 🐛 Troubleshooting

### Backend/API Issues

**"Service is starting" for 30+ minutes**
- Check build logs for errors
- Verify all dependencies in package.json
- Try manual redeploy: Render Dashboard → Redeploy

**"Cannot connect to database"**
- Verify DATABASE_URL in Render env vars
- Check Neon database is active
- Run locally first: `npm run db:push`

**"Port error" or "Connection refused"**
- Ensure PORT env var is set to 10000
- Don't hardcode port numbers

**"Cannot find module X"**
- Check in build.ts: Is module in allowlist?
- Add to allowlist if needed and rebuild

### Frontend Issues

**"Cannot reach API" in browser console**
- Check VITE_API_URL env var is correct
- Verify backend is running (check Render logs)
- Check browser console for CORS errors
- Try: `curl https://your-backend.onrender.com/api/user` from terminal

**"Page shows blank/white screen"**
- Check browser console for JavaScript errors
- Verify build output: `dist/public/index.html` exists
- Try clearing browser cache

**Frontend works locally but not on Vercel**
- Verify VITE_API_URL is set
- Check Vercel Logs in dashboard
- Ensure NODE_ENV not overridden

### Database Issues

**"Database connection pool exhausted"**
- Reduce max connections in .env
- Or upgrade Neon plan
- Check for connection leaks in code

**"SSL certificate error"**
- Add `sslmode=require` to DATABASE_URL (usually there by default)
- Ensure Neon SSL is enabled

**Schema mismatch errors**
- Run: `npm run db:push` locally first
- Verify schema.ts matches database
- Check migration status in Neon

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Express.js**: https://expressjs.com
- **React**: https://react.dev
- **Drizzle ORM**: https://orm.drizzle.team

---

## 💰 Estimated Costs

| Service | Free Tier | Price |
|---------|-----------|-------|
| Render Backend | Yes (limited) | ~$7-15/mo |
| Vercel Frontend | Yes | Free (Pro: $20/mo) |
| Neon Database | Yes (3GB) | ~$5-20/mo |
| **Total** | **~$20-35/mo** | Production-ready hobby tier |

---

## ✅ Deployment Complete!

Once all ✅ are checked, your app is live!

- **Frontend**: https://your-frontend.vercel.app
- **Backend**: https://your-backend.onrender.com
- **Database**: Neon Console

Users can now access your app worldwide! 🌍
