# 🚀 Render Deployment Checklist

## ✅ **BACKEND DEPLOYMENT (Web Service)**

### **Required Environment Variables:**
```bash
# Core Configuration
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
FRONTEND_URL=https://your-frontend-url.onrender.com

# Optional Features
ARCJET_KEY=your-arcjet-key (if using)
ARCJET_ENV=production
ETHERSCAN_API_KEY=your-etherscan-key (if using)
EMAIL_HOST=smtp.gmail.com (if using email)
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
ADMIN_EMAIL=admin@yourdomain.com

# Migration Control
MIGRATE_ON_STARTUP=true (for initial deployment)
```

### **Build & Start Commands:**
```bash
Build Command: (leave empty)
Start Command: npm start
```

### **Health Check:**
```bash
Path: /health (optional - you can create this endpoint)
```

---

## ✅ **FRONTEND DEPLOYMENT (Static Site)**

### **Required Environment Variables:**
```bash
VITE_API_URL=https://your-backend-url.onrender.com
```

### **Build & Start Commands:**
```bash
Build Command: npm run build
Publish Directory: dist
```

---

## 🔍 **PRE-DEPLOYMENT VERIFICATION**

### **✅ Backend Checks:**
- [x] All dependencies installed (`npm install`)
- [x] MongoDB connection configured
- [x] CORS properly configured for production
- [x] Environment variables properly loaded
- [x] All routes properly imported and registered
- [x] Migration scripts ready for production
- [x] Error handling middleware in place
- [x] JWT authentication working
- [x] Admin authentication working

### **✅ Frontend Checks:**
- [x] All dependencies installed (`npm install`)
- [x] TypeScript compilation working (`npm run build`)
- [x] API calls using environment variables
- [x] All routes properly configured
- [x] Authentication context working
- [x] Admin routes protected
- [x] No console errors in build

### **✅ Database Checks:**
- [x] MongoDB Atlas cluster configured
- [x] Database IP whitelist includes Render IPs
- [x] Connection string properly formatted
- [x] Migration scripts tested

---

## 🚨 **POTENTIAL ISSUES & SOLUTIONS**

### **Issue 1: CORS Errors**
**Problem:** Frontend can't connect to backend
**Solution:** 
- Set `FRONTEND_URL` environment variable in backend
- Ensure frontend URL matches exactly (including https://)

### **Issue 2: MongoDB Connection Failed**
**Problem:** Database connection errors
**Solution:**
- Check `MONGO_URI` format
- Verify IP whitelist in MongoDB Atlas
- Ensure cluster is running

### **Issue 3: Environment Variables Not Loading**
**Problem:** Backend crashes on startup
**Solution:**
- Verify all required env vars are set in Render dashboard
- Check variable names match exactly (case-sensitive)
- Ensure no extra spaces in values

### **Issue 4: Frontend API Calls Failing**
**Problem:** 404 or CORS errors from frontend
**Solution:**
- Set `VITE_API_URL` to your backend URL
- Check backend routes are properly registered
- Verify API endpoints are accessible

### **Issue 5: Migration Failures**
**Problem:** Database not initialized properly
**Solution:**
- Set `MIGRATE_ON_STARTUP=true` for initial deployment
- Check migration scripts for errors
- Verify MongoDB connection before migrations

---

## 📋 **DEPLOYMENT STEPS**

### **Step 1: Deploy Backend**
1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Add all required environment variables
5. Set build command: (empty)
6. Set start command: `npm start`
7. Deploy and test health

### **Step 2: Deploy Frontend**
1. Create new Static Site on Render
2. Connect your GitHub repository
3. Set root directory to `frontend`
4. Add `VITE_API_URL` environment variable
5. Set build command: `npm run build`
6. Set publish directory: `dist`
7. Deploy and test

### **Step 3: Update CORS**
1. Get your frontend URL from Render
2. Update `FRONTEND_URL` in backend environment variables
3. Redeploy backend if needed

### **Step 4: Test Everything**
1. Test user registration/login
2. Test admin functionality
3. Test tier management
4. Test withdrawal requests
5. Test all API endpoints

---

## 🎯 **SUCCESS INDICATORS**

### **✅ Backend Working:**
- [ ] Service starts without errors
- [ ] MongoDB connection successful
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Admin routes accessible
- [ ] CORS allowing frontend requests

### **✅ Frontend Working:**
- [ ] Build completes successfully
- [ ] Site loads without errors
- [ ] Login/register working
- [ ] Dashboard loads properly
- [ ] Admin panel accessible
- [ ] All features functional

### **✅ Integration Working:**
- [ ] Frontend can communicate with backend
- [ ] User authentication flows working
- [ ] Admin functions working
- [ ] Database operations successful
- [ ] Real-time features working

---

## 🚀 **READY FOR DEPLOYMENT!**

Your application is ready for Render deployment with:
- ✅ Complete backend API
- ✅ React frontend with TypeScript
- ✅ MongoDB integration
- ✅ Admin management system
- ✅ Tier management system
- ✅ Withdrawal request system
- ✅ User authentication
- ✅ Proper error handling
- ✅ Production-ready configuration

**Everything should work fine on Render!** 🎉
