# Admin System Guide

## Overview

The admin system allows you to manually grant admin privileges to specific users. Admin users have access to protected routes and features on the website. Admin status can only be set directly in the database to prevent abuse.

## Implementation Details

### Backend

#### User Model (`backend/models/user.model.js`)

Added `isAdmin` field to the user schema:
```javascript
isAdmin: {
    type: Boolean,
    default: false
}
```

#### Admin Middleware (`backend/middlewares/auth.middleware.js`)

Created `adminMiddleware` to protect admin-only routes:
```javascript
export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized - Please authenticate first");
        }
        
        if (!req.user.isAdmin) {
            throw new ApiError(403, "Forbidden - Admin access required");
        }

        next();
    } catch (error) {
        const statusCode = error.statusCode || 403;
        res.status(statusCode).json({ 
            success: false, 
            message: error.message || "Forbidden - Admin access required"
        });
    }
};
```

### Frontend

#### AuthContext (`frontend/src/contexts/AuthContext.tsx`)

Added `isAdmin` field to the User interface:
```typescript
interface User {
  _id: string;
  name: string;
  email: string;
  balance: number;
  tier: number;
  phone?: string;
  isAdmin?: boolean;  // Added admin field
  lvl1anim?: number;
  lvl2anim?: number;
  lvl3anim?: number;
  lvl4anim?: number;
  lvl5anim?: number;
}
```

## Usage

### Setting Admin Status Manually in Database

To grant admin access to a user, update their record directly in MongoDB:

```javascript
// Using MongoDB shell or MongoDB Compass
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isAdmin: true } }
)
```

Or using Mongoose in a script:
```javascript
import User from './models/user.model.js';

// Grant admin access
await User.findOneAndUpdate(
  { email: 'admin@example.com' },
  { isAdmin: true }
);
```

### Protecting Admin Routes

To protect a route so only admins can access it:

```javascript
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';

// Protect route with both authentication and admin check
router.get('/admin/users', authMiddleware, adminMiddleware, adminController.getAllUsers);

// Or in a route file:
router.use(authMiddleware);  // All routes require authentication
router.get('/admin-only', adminMiddleware, controller.adminOnlyFunction);
```

**Important**: `adminMiddleware` must be used AFTER `authMiddleware` because it relies on `req.user` being set.

### Frontend - Checking Admin Status

In React components, you can check if the user is an admin:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function AdminPanel() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <div>Access Denied - Admin Only</div>;
  }

  return (
    <div>
      {/* Admin-only content */}
      <h1>Admin Dashboard</h1>
    </div>
  );
}
```

Or conditionally show admin features:

```typescript
function Navigation() {
  const { user } = useAuth();

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      {user?.isAdmin && (
        <Link to="/admin">Admin Panel</Link>
      )}
    </nav>
  );
}
```

## Security Notes

1. **Manual Assignment Only**: Admin status can ONLY be set directly in the database, not through any API endpoint
2. **No Self-Promotion**: There is no way for users to grant themselves admin access
3. **Two-Layer Protection**: Use both `authMiddleware` and `adminMiddleware` for admin routes
4. **Frontend Checks**: While frontend checks improve UX, always enforce permissions on the backend
5. **Audit Trail**: Consider logging admin actions for security purposes

## Example Admin Routes

Here's an example of how to create admin-only routes:

```javascript
// routes/admin.routes.js
import express from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware.js';
import adminController from '../controllers/admin.controller.js';

const router = express.Router();

// All admin routes require authentication + admin status
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin-only endpoints
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/tier', adminController.updateUserTier);
router.delete('/users/:id', adminController.deleteUser);
router.get('/stats', adminController.getSystemStats);

export default router;
```

Then in `app.js`:
```javascript
import adminRoutes from './routes/admin.routes.js';
app.use('/admin', adminRoutes);
```



