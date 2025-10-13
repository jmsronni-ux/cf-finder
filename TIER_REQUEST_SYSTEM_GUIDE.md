# Tier Request System Guide

## Overview
The tier system has been completely redesigned. Users can no longer directly purchase tier upgrades. Instead, they must submit requests to the admin panel for approval.

## What Changed

### Backend Changes

#### 1. New Tier Request Model (`backend/models/tier-request.model.js`)
- Stores all tier upgrade requests
- Fields: `userId`, `requestedTier`, `currentTier`, `status`, `adminNote`, `reviewedBy`, `reviewedAt`
- Status can be: `pending`, `approved`, or `rejected`

#### 2. New Tier Request Controller (`backend/controllers/tier-request.controller.js`)
Functions:
- `createTierRequest` - Users submit tier upgrade requests
- `getUserTierRequests` - Users view their request history
- `getAllTierRequests` - Admin views all requests
- `approveTierRequest` - Admin approves and upgrades user
- `rejectTierRequest` - Admin rejects request
- `setUserTier` - Admin manually sets tier (emergency use)

#### 3. New Tier Request Routes (`backend/routes/tier-request.routes.js`)
User routes:
- `POST /tier-request/create` - Create tier upgrade request
- `GET /tier-request/my-requests` - Get user's requests

Admin routes:
- `GET /tier-request/admin/all` - Get all requests (with status filter)
- `POST /tier-request/admin/approve/:requestId` - Approve request
- `POST /tier-request/admin/reject/:requestId` - Reject request
- `POST /tier-request/admin/set-tier` - Manually set user tier

#### 4. Updated Tier System (`backend/utils/tier-system.js`)
- **REMOVED**: All price-related fields from `TIER_CONFIG`
- **REMOVED**: `canUpgrade`, `getUserTierPrice`, `canUpgradeWithCustomPrice` functions
- **UPDATED**: `getUpgradeOptionsForUser` - Returns tier info without prices
- **UPDATED**: `getTierBenefits` - No longer includes upgrade costs

#### 5. Updated Tier Controller (`backend/controllers/tier.controller.js`)
- `upgradeUserTier` endpoint now returns error message directing users to use tier request system
- `getUserTier` no longer includes tier prices in response

#### 6. Updated User Model & Controller
- **User Model**: Tier price fields remain in database for backwards compatibility but are no longer used
- **User Controller**: Removed `getAllUsersWithTierPrices` and `updateUserTierPrices` endpoints
- **User Routes**: Removed tier price routes

#### 7. Updated App (`backend/app.js`)
- Added tier request router: `app.use('/tier-request', tierRequestRouter)`

### Frontend Changes

#### 1. New Admin Tier Requests Page (`frontend/src/pages/AdminTierRequests.tsx`)
Features:
- View all tier requests with filters (pending, approved, rejected)
- Search by user name, email, or request ID
- Approve or reject requests with optional admin notes
- Shows user's current tier, requested tier, and balance
- Integrated navigation to other admin panels

#### 2. Updated FlowCanvas (`frontend/src/components/FlowCanvas.tsx`)
- `handleUpgradeClick` now creates tier requests instead of direct upgrades
- **REMOVED**: Balance checking logic
- **REMOVED**: `showInsufficientBalancePopup` state
- **REMOVED**: `insufficientBalanceInfo` state
- **UPDATED**: `nextTierInfo` type - removed `price` field
- Shows success message directing users to wait for admin approval

#### 3. Updated NextLevelPopup (`frontend/src/components/NextLevelPopup.tsx`)
- **REMOVED**: `userBalance` prop
- **REMOVED**: `onInsufficientBalance` callback
- **REMOVED**: Price display UI
- **REMOVED**: Balance checking in `handleUnlockClick`
- **UPDATED**: Props interface - removed price from `nextTierInfo`
- Now shows "Submit request" message instead of cost

#### 4. Updated AdminUserRewards (`frontend/src/pages/AdminUserRewards.tsx`)
- **REMOVED**: Entire tier price editing section
- **REMOVED**: `TierPriceEditingState` interface
- **REMOVED**: `editingTierPrices`, `tierPriceValues`, `savingTierPriceId` states
- **REMOVED**: `startEditingTierPrices`, `cancelEditingTierPrices`, `handleTierPriceChange`, `saveTierPrices` functions
- **UPDATED**: Navigation buttons to include Tier Requests link
- Page description changed from "Configure level rewards and tier upgrade prices" to "Configure level rewards"

#### 5. Updated Admin Navigation
- Added "Tier Requests" button to all admin pages:
  - AdminTopupRequests
  - AdminWithdrawRequests
  - AdminUserRewards
  - AdminTierRequests (new)

#### 6. Updated AuthContext (`frontend/src/contexts/AuthContext.tsx`)
- **REMOVED**: Tier price fields from User interface

#### 7. Updated UserProfile (`frontend/src/pages/UserProfile.tsx`)
- **REMOVED**: `upgradePrice` from TierInfo interface
- **REMOVED**: Balance checking states and InsufficientBalancePopup
- **UPDATED**: `handleTierUpgrade` - Now submits tier requests instead of direct upgrades
- **REMOVED**: "Cost" and "Est. Profit" UI sections
- **UPDATED**: Shows "Request tier upgrade from admin" message

#### 8. Updated App Router (`frontend/src/App.tsx`)
- Added route: `/admin/tier-requests` → `AdminTierRequests`

## User Workflow (New)

1. **User completes a level** → Sees completion popup
2. **User clicks "Unlock Next Level"** → Creates tier upgrade request
3. **System shows success message** → "Tier upgrade request submitted! Awaiting admin approval."
4. **User waits** → Request appears in admin panel with "pending" status
5. **Admin reviews request** → Can approve or reject with optional note
6. **If approved** → User's tier is upgraded immediately
7. **If rejected** → User can see rejection reason and submit new request

## Admin Workflow

1. **Navigate to Admin Panel** → Click "Tier Requests" button
2. **View pending requests** → See user info, current tier, requested tier, balance
3. **Review request** → Check if user should be upgraded
4. **Add admin note (optional)** → Document reason for decision
5. **Approve or Reject** → User is upgraded or notified
6. **View history** → Filter by approved/rejected to see past decisions

## Key Differences

### Before (Old System)
- Users bought tier upgrades with balance
- Prices set per user by admin
- Automatic upgrade if sufficient balance
- Complex price management UI

### After (New System)
- Users request tier upgrades
- Admin approves/rejects requests
- No prices involved
- Simple request/approval flow
- Better control over user progression

## API Endpoints Summary

### User Endpoints
```
POST   /tier-request/create        - Submit tier upgrade request
GET    /tier-request/my-requests   - View my requests
GET    /tier/my-tier               - Get tier info (no prices)
```

### Admin Endpoints
```
GET    /tier-request/admin/all           - Get all requests
GET    /tier-request/admin/all?status=X  - Filter by status
POST   /tier-request/admin/approve/:id   - Approve request
POST   /tier-request/admin/reject/:id    - Reject request
POST   /tier-request/admin/set-tier      - Manually set tier
```

### Deprecated Endpoints
```
POST   /tier/upgrade                      - Returns error
PUT    /user/admin/tier-prices/:userId   - Removed
GET    /user/admin/tier-prices            - Removed
```

## Database Schema

### TierRequest Model
```javascript
{
  userId: ObjectId (ref: User),
  requestedTier: Number (1-5),
  currentTier: Number (0-5),
  status: String (pending/approved/rejected),
  adminNote: String,
  reviewedBy: ObjectId (ref: User),
  reviewedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Migration Notes

- Existing tier prices in the database are not deleted but are no longer used
- Users who had custom prices will now follow the request/approval flow
- No data migration is required
- Old tier upgrade endpoint will return error message guiding users to new system

## Testing Checklist

### User Flow
- [ ] User can submit tier upgrade request
- [ ] User sees success message after submitting
- [ ] User can view their request history
- [ ] User cannot submit duplicate pending requests

### Admin Flow
- [ ] Admin can view all tier requests
- [ ] Admin can filter by status (pending/approved/rejected)
- [ ] Admin can search by name/email/ID
- [ ] Admin can approve requests (user tier updates)
- [ ] Admin can reject requests (with note)
- [ ] Admin notes are visible after processing

### UI/UX
- [ ] No price displays in UI
- [ ] No balance checking for upgrades
- [ ] Tier request page accessible from all admin pages
- [ ] Request status badges show correct colors
- [ ] Confetti animation still works on level completion

### API
- [ ] `/tier-request/create` creates requests
- [ ] `/tier-request/admin/approve/:id` upgrades users
- [ ] `/tier-request/admin/reject/:id` rejects properly
- [ ] `/tier/upgrade` returns deprecation error
- [ ] Removed tier price endpoints return 404

## Support

For questions or issues with the tier request system, check:
1. Backend logs for tier request processing
2. Admin panel tier requests page for request status
3. User's request history via `/tier-request/my-requests`

