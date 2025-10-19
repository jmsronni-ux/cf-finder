# Render Deployment Guide

This guide will help you deploy your project to Render with separate frontend and backend services.

## Prerequisites

1. GitHub account with your code pushed
2. Render account (https://render.com)
3. MongoDB Atlas account (or other MongoDB hosting)

---

## Part 1: Deploy Backend

### Step 1: Create Web Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `cf-finder-backend` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 2: Set Backend Environment Variables

In the "Environment" tab, add these variables:

#### Required Variables:
```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=generate-a-long-random-string-at-least-32-characters
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-url.onrender.com
SERVE_FRONTEND=false
```

**To generate JWT_SECRET**, use this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Optional Variables:
```
JWT_REFRESH_SECRET=another-long-random-string
JWT_REFRESH_EXPIRES_IN=30d
ARCJET_KEY=your-arcjet-key-if-using
ARCJET_ENV=production
ETHERSCAN_API_KEY=your-etherscan-key-if-using
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

### Step 3: Deploy Backend

1. Click "Create Web Service"
2. Wait for deployment to complete (5-10 minutes)
3. Note your backend URL: `https://cf-finder-backend.onrender.com`

---

## Part 2: Deploy Frontend

### Step 1: Create Static Site

1. Go to https://dashboard.render.com
2. Click "New +" → "Static Site"
3. Connect the same GitHub repository
4. Configure the service:
   - **Name**: `cf-finder-frontend` (or your choice)
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### Step 2: Set Frontend Environment Variables

In the "Environment" tab, add:

```
VITE_API_URL=https://your-backend-url.onrender.com
```

**Important**: Replace `your-backend-url.onrender.com` with your actual backend URL from Part 1, Step 3.

### Step 3: Deploy Frontend

1. Click "Create Static Site"
2. Wait for deployment (3-5 minutes)
3. Note your frontend URL: `https://cf-finder-frontend.onrender.com`

---

## Part 3: Update CORS Settings

### Update Backend FRONTEND_URL

1. Go back to your backend service on Render
2. Go to "Environment" tab
3. Update `FRONTEND_URL` to your actual frontend URL:
   ```
   FRONTEND_URL=https://cf-finder-frontend.onrender.com
   ```
4. Save changes (this will trigger a redeploy)

---

## Part 4: Verify Deployment

### Test Backend:
```bash
curl https://your-backend-url.onrender.com/auth/sign-in
```
Should return a response (even if error, means it's running)

### Test Frontend:
1. Open your frontend URL in browser
2. Try to log in with a test account
3. Check browser console for errors

---

## Common Issues & Solutions

### Issue 1: CORS Errors
**Symptom**: Browser shows "blocked by CORS policy"

**Solution**:
- Make sure `FRONTEND_URL` in backend matches your frontend URL exactly
- Include `https://` protocol
- No trailing slash

### Issue 2: "Cannot GET /" on backend
**Symptom**: Opening backend URL shows "Cannot GET /"

**Solution**: This is normal! Backend is API-only, not meant to be viewed in browser.

### Issue 3: Login returns 500 error
**Symptom**: Login fails with 500 Internal Server Error

**Solutions**:
- Check backend logs on Render dashboard
- Verify `JWT_SECRET` is set
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

### Issue 4: Free tier services sleep after inactivity
**Symptom**: First request takes 30+ seconds

**Solution**:
- Upgrade to paid tier, or
- Use a service like UptimeRobot to ping your backend every 5 minutes

### Issue 5: Build fails
**Symptom**: Deployment fails during build

**Solutions**:
- Check build logs on Render dashboard
- Verify `package.json` has correct scripts
- Make sure all dependencies are in `dependencies`, not `devDependencies` if needed at runtime

---

## MongoDB Atlas Setup

If you don't have MongoDB set up:

1. Go to https://mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user (username & password)
4. **Network Access**: Add IP `0.0.0.0/0` (allow from anywhere)
5. Get connection string: Clusters → Connect → Drivers
6. Replace `<password>` with your database user password
7. Use this as `MONGO_URI` in backend environment variables

---

## Custom Domain (Optional)

### For Frontend:
1. In Render dashboard, go to your static site
2. Settings → Custom Domain
3. Add your domain
4. Update DNS records as instructed

### For Backend:
1. In Render dashboard, go to your web service
2. Settings → Custom Domain
3. Add API subdomain (e.g., `api.yourdomain.com`)
4. Update DNS records
5. Update frontend's `VITE_API_URL` to use new domain

---

## Monitoring & Logs

### View Logs:
- Render Dashboard → Your Service → Logs tab
- Real-time logs show all console output

### Check Service Health:
- Render Dashboard → Your Service → Events tab
- Shows deployment history and status

---

## Auto-Deploy on Git Push

Render automatically redeploys when you push to your connected branch:

1. Make code changes locally
2. Commit and push to GitHub
3. Render automatically detects and deploys

To disable:
- Service Settings → "Auto-Deploy" → Turn off

---

## Environment-Specific Deployments

### Staging Environment:
1. Create new branch: `staging`
2. Create new Render services pointing to `staging` branch
3. Use different environment variables

### Production Environment:
1. Use `main` branch
2. Use production environment variables

---

## Cost Optimization

### Free Tier Limitations:
- Backend: 750 hours/month (sleeps after 15 min inactivity)
- Frontend: Unlimited
- Bandwidth: 100 GB/month

### Tips:
- Combine multiple services under one Render account
- Use static site for frontend (free and fast)
- Consider upgrading backend to Starter ($7/mo) for always-on

---

## Security Checklist

- ✅ Strong JWT_SECRET (32+ characters)
- ✅ FRONTEND_URL properly set (not '*')
- ✅ MongoDB has strong password
- ✅ Environment variables never committed to Git
- ✅ HTTPS enabled (automatic on Render)
- ✅ CORS properly configured

---

## Support

- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- GitHub Issues: Create issue in your repo

---

## Quick Reference

### Backend URLs to Set:
- MONGO_URI → MongoDB Atlas connection string
- JWT_SECRET → Random 32+ character string
- FRONTEND_URL → Your frontend URL from Render

### Frontend URLs to Set:
- VITE_API_URL → Your backend URL from Render

**That's it!** Your full-stack application should now be deployed and working on Render.

