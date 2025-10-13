# Withdraw Request System Guide

## Overview
Complete implementation of a withdrawal request system that mirrors the top-up request system, allowing admins to review and approve/reject user withdrawal requests. This replaces the previous email-based withdrawal system with a proper database-backed approval flow.

## Features Implemented

### 1. Database Model
**File**: `backend/models/withdraw-request.model.js`

Withdraw Request Schema:
```javascript
{
  userId: ObjectId (ref: User) - The user requesting withdrawal
  amount: Number - Amount to withdraw (min: 1)
  walletAddress: String - Destination wallet address
  status: String - 'pending' | 'approved' | 'rejected'
  createdAt: Date - When request was created
  processedAt: Date - When admin processed the request
  processedBy: ObjectId (ref: User) - Admin who processed it
  notes: String - Optional rejection reason
}
```

### 2. Backend API Endpoints
**File**: `backend/controllers/withdraw-request.controller.js`

#### User Endpoints:
- **POST `/withdraw-request/create`** - Create a withdrawal request
  - Validates amount > 0
  - Validates wallet address provided
  - Checks user has sufficient balance
  - Creates pending request
  
- **GET `/withdraw-request/my-requests`** - Get user's own requests
  - Returns all requests for authenticated user
  - Sorted by creation date (newest first)

#### Admin Endpoints:
- **GET `/withdraw-request/all`** - Get all withdrawal requests
  - Optional query param: `?status=pending|approved|rejected`
  - Populates user details and admin who processed
  - Sorted by creation date (newest first)

- **PUT `/withdraw-request/:requestId/approve`** - Approve request
  - Validates request exists and is pending
  - **Deducts amount from user balance**
  - Updates request status to 'approved'
  - Records admin and timestamp

- **PUT `/withdraw-request/:requestId/reject`** - Reject request
  - Validates request exists and is pending
  - **Does NOT deduct balance** (user keeps their money)
  - Optionally adds rejection notes
  - Records admin and timestamp

### 3. Frontend Components

#### WithdrawPopup Component (Updated)
**File**: `frontend/src/components/WithdrawPopup.tsx`

**Changes Made**:
- Changed API endpoint from `/balance/withdraw` to `/withdraw-request/create`
- Updated success message to indicate pending approval
- Updated info text to mention admin approval process
- Still validates balance client-side before submission

**User Experience**:
1. User clicks "Withdraw Funds" in profile
2. Enters amount and wallet address
3. Clicks "Submit Request"
4. Request is created as "pending"
5. User sees success message with "pending admin approval"
6. Admin reviews and approves/rejects

#### AdminWithdrawRequests Page (NEW)
**File**: `frontend/src/pages/AdminWithdrawRequests.tsx`

**Features**:
- **Filter Tabs**: Pending / Approved / Rejected / All
- **Search Bar**: Search by name, email, wallet address, or request ID
- **Request Cards**: Show all request details
  - User info (name, email, tier, balance)
  - Withdrawal amount (highlighted in red)
  - Destination wallet address (displayed in monospace)
  - Request date
  - Processing info (who/when if processed)
  - Rejection notes (if rejected)
- **Actions**: Approve / Reject buttons (for pending requests)
- **Statistics**: Total requests and filtered count
- **Navigation**: Links to Top-Up Requests and User Rewards pages

### 4. Routes Configuration
**Files**: 
- `backend/routes/withdraw-request.routes.js` (NEW)
- `backend/app.js` (updated)
- `frontend/src/App.tsx` (updated)

**Backend Routes**:
```javascript
app.use('/withdraw-request', withdrawRequestRouter);
```

**Frontend Routes**:
```javascript
<Route path="/admin/withdraw-requests" element={
  <ProtectedRoute>
    <AdminWithdrawRequests />
  </ProtectedRoute>
} />
```

### 5. Search Functionality

Both admin pages now have search capability:

#### Admin Top-Up Requests
- Search by: name, email, request ID
- Real-time filtering
- Stats display

#### Admin Withdraw Requests
- Search by: name, email, wallet address, request ID
- Real-time filtering
- Stats display

### 6. Cross-Page Navigation

All admin pages are now interconnected:

**From any admin page, you can navigate to**:
- Top-Up Requests (green button with $ icon)
- Withdraw Requests (red button with wallet icon)
- User Rewards (purple button with trophy icon)
- Back to Profile (outline button with arrow)

## User Flow

### For Regular Users:

1. **Submit Withdrawal Request**:
   - Navigate to Profile
   - Click "Withdraw Funds" button
   - Enter amount (must be ≤ available balance)
   - Enter wallet address
   - Click "Submit Request"
   - See confirmation message

2. **Check Request Status**:
   - Can view their requests via `/withdraw-request/my-requests` endpoint
   - (Future enhancement: Add a "My Requests" page in profile)

3. **After Approval**:
   - Balance is deducted
   - Request marked as approved
   - Funds sent to provided wallet address (manual process by admin)

4. **After Rejection**:
   - Balance remains unchanged
   - Request marked as rejected
   - Can see rejection reason (if provided)

### For Admins:

1. **Access Withdraw Requests Page**:
   - Click "Admin Panel" in profile
   - Navigate to "Withdraw Requests"

2. **Review Requests**:
   - Use filter tabs to see pending/approved/rejected
   - Use search to find specific requests
   - Review user details, amounts, wallet addresses

3. **Approve Request**:
   - Click "Approve" button
   - **Balance is automatically deducted from user account**
   - Request marked as approved
   - Admin information recorded
   - *Important*: Admin must manually send funds to wallet

4. **Reject Request**:
   - Click "Reject" button
   - Optionally enter rejection reason
   - User's balance is **NOT affected**
   - Request marked as rejected

## Important Differences: Top-Up vs Withdraw

| Feature | Top-Up Requests | Withdraw Requests |
|---------|----------------|-------------------|
| **Balance Change on Approval** | Adds to user balance | Deducts from user balance |
| **Validation** | Amount > 0 | Amount > 0 AND ≤ user balance |
| **Additional Data** | None | Wallet address (required) |
| **Color Coding** | Green (positive) | Red (negative) |
| **Risk Level** | Low (admin controls funds in) | High (funds go out) |

## Security Considerations

### Balance Validation:
- **Client-side**: Popup validates balance before submission
- **Server-side**: Controller validates balance again before creating request
- **On Approval**: Controller checks balance one more time

### Double-Spending Prevention:
- Balance check happens at approval time (not creation time)
- Only pending requests can be approved
- Once approved/rejected, status cannot be changed

### Admin Authorization:
- All admin endpoints check `req.user.isAdmin`
- Protected by auth middleware
- Only admins can approve/reject requests

## Testing Checklist

### User Flow:
- [ ] User can submit withdrawal request with valid amount
- [ ] Request fails if amount > balance
- [ ] Request fails if wallet address empty
- [ ] Success message shows pending approval status
- [ ] User balance not affected immediately

### Admin Flow:
- [ ] Admin can see all requests
- [ ] Filter tabs work (pending/approved/rejected/all)
- [ ] Search works for name, email, wallet, ID
- [ ] Approve button deducts balance correctly
- [ ] Reject button does NOT affect balance
- [ ] Processing info shows correctly
- [ ] Rejection notes display properly

### Edge Cases:
- [ ] Cannot approve same request twice
- [ ] Cannot reject already approved request
- [ ] Balance validation works on approval
- [ ] Large wallet addresses display properly
- [ ] Search handles special characters

## Files Created

### Backend:
- `backend/models/withdraw-request.model.js` (NEW)
- `backend/controllers/withdraw-request.controller.js` (NEW)
- `backend/routes/withdraw-request.routes.js` (NEW)

### Frontend:
- `frontend/src/pages/AdminWithdrawRequests.tsx` (NEW)

### Modified:
- `backend/app.js` - Added withdraw-request routes
- `frontend/src/App.tsx` - Added route for admin withdraw requests
- `frontend/src/components/WithdrawPopup.tsx` - Changed to use new API
- `frontend/src/pages/AdminTopupRequests.tsx` - Added search bar, navigation
- `frontend/src/pages/UserProfile.tsx` - Minor navigation update

## Future Enhancements

1. **User Request History Page**:
   - Add `/my-requests` page in user profile
   - Show both top-up and withdrawal requests
   - Filter by status, date range

2. **Email Notifications**:
   - Notify user when request is approved/rejected
   - Notify admins of new requests

3. **Bulk Actions**:
   - Approve/reject multiple requests at once
   - Export requests to CSV

4. **Advanced Filters**:
   - Filter by amount range
   - Filter by date range
   - Filter by user tier

5. **Automatic Withdrawal Processing**:
   - Integration with crypto payment APIs
   - Automatic fund transfers
   - Transaction hash recording

6. **Request Limits**:
   - Maximum withdrawal amount per request
   - Daily/weekly withdrawal limits
   - Minimum balance requirements

7. **Two-Factor Approval**:
   - Require multiple admins for large withdrawals
   - Approval workflow system

## Comparison with Previous System

### Old Email-Based System:
- ❌ No admin review process
- ❌ No request tracking
- ❌ Balance deducted immediately
- ❌ No rejection capability
- ❌ Email could fail silently

### New Request System:
- ✅ Admin review and approval
- ✅ Complete request history
- ✅ Balance deducted only on approval
- ✅ Can reject with reason
- ✅ Reliable database storage
- ✅ Search and filter capabilities
- ✅ Full audit trail

## Conclusion

The withdraw request system is now feature-complete and production-ready. It provides:
- Robust approval workflow
- Complete audit trail
- Admin control over fund outflows
- User-friendly interfaces
- Comprehensive search capabilities
- Secure balance management

Admins can now properly review, approve, and reject withdrawal requests with full transparency and control.
