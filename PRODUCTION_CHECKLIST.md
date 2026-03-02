# Production Readiness Checklist

Complete this checklist before deploying to production.

## Code Quality

- [ ] All TypeScript types are correct (`npm run check` passes)
- [ ] No console errors in development (`npm run dev`)
- [ ] No `any` types in critical code
- [ ] Error handling for all API endpoints
- [ ] All async/await properly handled
- [ ] No hardcoded URLs (use env vars)
- [ ] No hardcoded secrets/passwords
- [ ] Code reviewed by team member

## Database

- [ ] Database schema is final (no more migrations planned)
- [ ] PostgreSQL is production-grade (Neon/RDS/etc, not local)
- [ ] Indexes on frequently queried fields:
  - [ ] `users.username`
  - [ ] `userDailyUsage.userId`
  - [ ] `posts.userId`
  - [ ] `comments.postId`
- [ ] Backups enabled on database
- [ ] Connection pooling configured
- [ ] Database credentials in env vars only

## Security

- [ ] `.env` is in `.gitignore`
- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in code (check git history)
- [ ] `SESSION_SECRET` is random 32+ chars
- [ ] CORS configured for your domain
- [ ] SQL injection prevented (using ORM)
- [ ] XSS prevention (React default)
- [ ] HTTPS enabled (both Render & Vercel do this)
- [ ] Password hashing working (scrypt)
- [ ] Rate limiting considered (optional)

## Performance

- [ ] Frontend bundle size reasonable (<1MB gzipped)
- [ ] Database queries optimized (use indexes)
- [ ] Pagination implemented for lists (50 items default)
- [ ] Image compression configured
- [ ] Caching headers set
- [ ] No N+1 queries
- [ ] WebSocket connections stable
- [ ] Heavy computations debounced/throttled

## Testing

- [ ] Manual testing on localhost completed
- [ ] Login/logout works
- [ ] Create/read/update/delete posts works
- [ ] Follow/unfollow works
- [ ] Messaging works
- [ ] Study mode filtering works
- [ ] Analytics endpoints return data
- [ ] Usage tracking works
- [ ] No console errors

## Build & Deployment

- [ ] `npm run build` succeeds locally
- [ ] No build warnings (review warnings)
- [ ] `dist/index.cjs` exists after build
- [ ] `dist/public/index.html` exists after build
- [ ] Build is reproducible (`npm install && npm run build` always works)
- [ ] `render.yaml` is in root directory
- [ ] `vercel.json` is in root directory
- [ ] `.env.example` has all required vars documented

## Environment Variables Documented

Backend (Render):
- [ ] `NODE_ENV`
- [ ] `DATABASE_URL`
- [ ] `SESSION_SECRET`
- [ ] `PORT`

Frontend (Vercel):
- [ ] `VITE_API_URL`

## Documentation

- [ ] README.md is complete and accurate
- [ ] DEPLOYMENT.md exists and covers process
- [ ] API endpoints documented
- [ ] Environment variables documented in .env.example
- [ ] Know how to debug in production

## Capacity Planning

- [ ] Estimated concurrent users: ___
- [ ] Estimated monthly active users: ___
- [ ] Database size estimate: ___
- [ ] Plan for scale (upgrade strategy)
- [ ] Monitoring/alerts configured

## Monitoring & Logging

- [ ] Error logging enabled (check Render/Vercel logs)
- [ ] Can access production logs
- [ ] Database connection monitoring
- [ ] Know how to troubleshoot API errors
- [ ] Know how to check database

## Final Checks

- [ ] All code committed to git
- [ ] Latest code pushed to GitHub
- [ ] No uncommitted changes (`git status` clean)
- [ ] Verified all files needed for deployment are in repo
- [ ] Team knows deployment process
- [ ] Rollback plan in place (if needed)
- [ ] Post-deployment testing plan ready

---

## Pre-Deployment Week

- **Day 1-3**: Code review & security audit
- **Day 4-5**: Load testing & performance tuning
- **Day 6**: Final testing & documentation
- **Day 7**: Deploy & monitor closely

---

## Post-Deployment (First 24 Hours)

- [ ] Monitor error logs hourly
- [ ] Check backend Render logs for errors
- [ ] Check frontend Vercel logs for builds
- [ ] Test critical user journeys:
  - [ ] Sign up new user
  - [ ] Create post
  - [ ] Send message
  - [ ] Enable study mode
  - [ ] Check analytics
- [ ] Monitor database performance
- [ ] Check user reports
- [ ] Be ready to rollback if critical issues

### Rollback Plan
If critical issues occur:
1. Render: Click previous deployment → Redeploy
2. Vercel: Go to Deployments tab → Promote previous version
3. Both should revert within 2 minutes

---

## Success Criteria

- [ ] 99%+ uptime in first 24 hours
- [ ] <500ms response time for API
- [ ] All features work as expected
- [ ] No critical errors in logs
- [ ] Users can sign up and use app
- [ ] Data persists correctly in database

---

## Team Communication

- [ ] Deployment time announced to team
- [ ] On-call person assigned for first 24h
- [ ] Slack/Discord channel for updates
- [ ] User support informed
- [ ] Post-deployment retrospective scheduled

---

## Celebrate! 🎉

Once all checks pass and monitoring shows everything is stable:

✅ Your app is in production!
✅ Users can access it worldwide!
✅ Scale with confidence!

---

## Post-Launch Maintenance

- Monthly: Review logs & performance metrics
- Monthly: Update dependencies
- Monthly: Database optimization
- Quarterly: Security audit
- Quarterly: Scale assessment

---

**Last Updated**: 2026-03-02  
**Version**: 1.0
