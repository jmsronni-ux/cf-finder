# Top-Up Request System Guide

## Overview

The top-up request system allows users to request balance top-ups, which are then reviewed and processed by administrators. This ensures controlled and secure balance management where admins have full visibility and approval control.

## Features

### For Users:
- Request balance top-ups from their profile page
- View request status (pending/approved/rejected)
- Simple and intuitive request process

### For Admins:
- View all top-up requests with comprehensive user data
- Filter requests by status (pending/approved/rejected/all)
- Approve or reject requests with optional notes
- See user details: email, current balance, tier level, requested amount
- Automatic balance update upon approval

## Implementation Details

### Backend

#### 1. Top-Up Request Model (`backend/models/topup-request.model.js`)

Schema includes:
- `userId`: Reference to the user making the request
- `amount`: Requested top-up amount
- `status`: Request status (pending/approved/rejected)
- `createdAt`: Request creation timestamp
- `processedAt`: When the request was processed
- `processedBy`: Admin who processed the request
- `notes`: Optional notes (usually for rejection reasons)

#### 2. Controller (`backend/controllers/topup-request.controller.js`)

**User Endpoints:**
- `createTopupRequest`: Create a new top-up request
- `getMyTopupRequests`: Get user's own requests

**Admin Endpoints:**
- `getAllTopupRequests`: Get all requests (with optional status filter)
- `approveTopupRequest`: Approve a request and update user balance
- `rejectTopupRequest`: Reject a request with optional notes

#### 3. Routes (`backend/routes/topup-request.routes.js`)

**User Routes (require authentication):**
```
POST   /topup-request/create        - Create a top-up request
GET    /topup-request/my-requests   - Get user's requests
```

**Admin Routes (require authentication + admin privileges):**
```
GET    /topup-request/all           - Get all requests (query: ?status=pending)
PUT    /topup-request/:requestId/approve  - Approve a request
PUT    /topup-request/:requestId/reject   - Reject a request
```

### Frontend

#### 1. Top-Up Request Popup (`frontend/src/components/TopupRequestPopup.tsx`)

- Modal component for users to submit top-up requests
- Input validation (positive numbers only)
- Toast notifications for success/error
- Loading states during submission

#### 2. Admin Top-Up Requests Page (`frontend/src/pages/AdminTopupRequests.tsx`)

Comprehensive admin interface featuring:
- **Filter Tabs**: Pending, Approved, Rejected, All
- **Request Cards** showing:
  - User name and email
  - Requested amount
  - Current balance
  - Tier level
  - Request date
  - Status badge
  - Processing information (if processed)
  - Rejection notes (if rejected)
- **Action Buttons**: Approve/Reject (for pending requests)
- **Access Control**: Only visible to admin users
- **Real-time Updates**: Automatically refreshes after approval/rejection

#### 3. Profile Page Integration (`frontend/src/pages/UserProfile.tsx`)

Added:
- "Request Top-Up" button in the balance card
- "Admin Panel" button in header (only visible to admins)
- Integration with TopupRequestPopup component

## Usage Guide

### For Users

#### Requesting a Top-Up

1. Navigate to your profile page
2. In the "Current Balance" card, click the **"Request Top-Up"** button
3. Enter the desired amount
4. Click **"Submit Request"**
5. Wait for admin approval

The request will show as "pending" until processed by an administrator.

### For Admins

#### Setting Up an Admin

To grant admin privileges to a user, update their record in MongoDB:

```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isAdmin: true } }
)
```

See `ADMIN_SYSTEM_GUIDE.md` for more details on the admin system.

#### Managing Top-Up Requests

1. Log in to your admin account
2. Go to your profile page
3. Click the **"Admin Panel"** button in the header
4. You'll see the Top-Up Requests Management page

**Filtering Requests:**
- Click tabs at the top to filter: Pending, Approved, Rejected, All
- Default view shows pending requests

**Reviewing a Request:**

Each request card displays:
- User information (name, email)
- Requested amount (highlighted in green)
- Current balance
- User's tier level
- Request date
- Status badge

**Approving a Request:**
1. Click the **"Approve"** button
2. The user's balance is automatically increased
3. Request status changes to "Approved"
4. User receives the funds immediately

**Rejecting a Request:**
1. Click the **"Reject"** button
2. Optionally enter a reason for rejection
3. Request status changes to "Rejected"
4. The note is visible in the request details

## API Examples

### User: Create Top-Up Request

```bash
POST /topup-request/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Top-up request created successfully",
  "data": {
    "_id": "...",
    "userId": "...",
    "amount": 100,
    "status": "pending",
    "createdAt": "2025-10-07T..."
  }
}
```

### Admin: Get All Pending Requests

```bash
GET /topup-request/all?status=pending
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": {
        "_id": "...",
        "name": "John Doe",
        "email": "john@example.com",
        "balance": 50,
        "tier": 2
      },
      "amount": 100,
      "status": "pending",
      "createdAt": "2025-10-07T..."
    }
  ]
}
```

### Admin: Approve Request

```bash
PUT /topup-request/123abc/approve
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Top-up request approved successfully",
  "data": {
    "request": { ... },
    "newBalance": 150
  }
}
```

### Admin: Reject Request

```bash
PUT /topup-request/123abc/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "notes": "Insufficient verification documents"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Top-up request rejected",
  "data": { ... }
}
```

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Admin Authorization**: Admin endpoints check `isAdmin` flag
3. **User Isolation**: Users can only see their own requests
4. **Validation**: Amount validation on both frontend and backend
5. **Status Protection**: Can only approve/reject pending requests
6. **Audit Trail**: Tracks who processed each request and when

## UI/UX Features

### User Experience:
- Clear, modern modal for submitting requests
- Visual feedback with toast notifications
- Disabled states during loading
- Helpful note about admin review process

### Admin Experience:
- Color-coded status badges (yellow=pending, green=approved, red=rejected)
- Comprehensive user information at a glance
- Easy filtering with tab interface
- One-click approve/reject actions
- Confirmation prompts for rejection with optional notes
- Responsive grid layout
- Loading states and disabled buttons during processing

## Database Schema

```javascript
TopupRequest {
  _id: ObjectId,
  userId: ObjectId (ref: User),
  amount: Number (min: 1),
  status: String (enum: ['pending', 'approved', 'rejected']),
  createdAt: Date,
  processedAt: Date,
  processedBy: ObjectId (ref: User),
  notes: String
}
```

## File Structure

```
backend/
├── models/
│   └── topup-request.model.js
├── controllers/
│   └── topup-request.controller.js
├── routes/
│   └── topup-request.routes.js
└── app.js (updated)

frontend/
├── src/
│   ├── components/
│   │   └── TopupRequestPopup.tsx
│   ├── pages/
│   │   ├── UserProfile.tsx (updated)
│   │   └── AdminTopupRequests.tsx
│   └── App.tsx (updated)
```

## Future Enhancements (Optional)

1. **Email Notifications**: Notify users when their request is processed
2. **Request History**: Show full history of all requests in user profile
3. **Bulk Actions**: Approve/reject multiple requests at once
4. **Request Limits**: Set daily/weekly limits on request amounts
5. **Analytics Dashboard**: Show statistics on top-up requests
6. **Payment Integration**: Link to actual payment processing systems
7. **Request Comments**: Allow back-and-forth communication between user and admin
8. **Export Functionality**: Export request data to CSV/Excel

## Testing

### Manual Testing Checklist

**User Flow:**
- [ ] User can create a top-up request
- [ ] User sees success message
- [ ] User can view their request status
- [ ] Non-admin users cannot access admin panel

**Admin Flow:**
- [ ] Admin sees "Admin Panel" button
- [ ] Admin can view all requests
- [ ] Admin can filter by status
- [ ] Admin can approve pending requests
- [ ] User balance updates correctly after approval
- [ ] Admin can reject requests with notes
- [ ] Request status updates correctly

**Security:**
- [ ] Non-admin users get 403 error on admin endpoints
- [ ] Unauthenticated users cannot access any endpoints
- [ ] Users cannot approve their own requests

## Troubleshooting

### Issue: "Access Denied" on admin page
**Solution**: Ensure user has `isAdmin: true` in database

### Issue: Balance not updating after approval
**Solution**: Check backend logs for errors. Verify user exists and request is pending.

### Issue: Cannot create request
**Solution**: Verify token is valid and amount is a positive number

### Issue: Admin panel button not showing
**Solution**: Refresh user data or clear localStorage and log in again



