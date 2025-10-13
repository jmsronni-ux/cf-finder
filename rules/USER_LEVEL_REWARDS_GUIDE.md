# User Level Rewards Management System

## Overview
This system allows administrators to customize the reward amounts that users receive when completing each level. Each user can have personalized reward values, and these values are displayed in the level completion popup.

## Features Implemented

### 1. Database Schema (User Model)
**File**: `backend/models/user.model.js`

Added new fields to the User model:
- `lvl1reward`: Number (default: 1000)
- `lvl2reward`: Number (default: 5000)
- `lvl3reward`: Number (default: 10000)
- `lvl4reward`: Number (default: 50000)
- `lvl5reward`: Number (default: 100000)

These fields store the reward amount for each level completion for each individual user.

### 2. Backend API Endpoints
**Files**: 
- `backend/controllers/user.controller.js`
- `backend/routes/user.routes.js`

#### Endpoints Created:

**GET `/user/admin/rewards`**
- **Purpose**: Fetch all users with their level reward information
- **Access**: Admin only
- **Returns**: List of users with their email, name, balance, tier, level rewards, and animation completion status

**PUT `/user/admin/rewards/:userId`**
- **Purpose**: Update level rewards for a specific user
- **Access**: Admin only
- **Body Parameters**:
  ```json
  {
    "lvl1reward": 1000,
    "lvl2reward": 5000,
    "lvl3reward": 10000,
    "lvl4reward": 50000,
    "lvl5reward": 100000
  }
  ```
  (All fields are optional - only include the ones you want to update)

### 3. Admin Dashboard Page
**File**: `frontend/src/pages/AdminUserRewards.tsx`

A comprehensive admin interface that displays:
- **Search & Filter Bar**: 
  - Real-time search by name, email, or user ID
  - Clear button to reset search
  - Shows filtered user count
  - Sort options: Date (newest), Name, Email, Tier, Balance
  - Stats display: Total users and filtered count
  
- **User List**: Shows all users with their basic information
  - Name and email
  - Current balance
  - Tier level
  - Join date
  
- **Level Rewards Display**: For each user, shows all 5 level rewards in a grid
  - Visual indicators for completed levels (green checkmark)
  - Editable input fields for each level reward
  
- **Edit Functionality**: 
  - Click "Edit Rewards" button to enable editing for a user
  - Modify any or all level rewards
  - Click "Save" to update (with loading state)
  - Click "Cancel" to discard changes

**Navigation**: Accessible via `/admin/user-rewards` route

### 4. Level Completion Popup Updates
**File**: `frontend/src/components/NextLevelPopup.tsx`

Updated to display dynamic rewards:
- **Current Level Reward**: Shows the refunded amount for completing the current level
- **Next Level Reward**: Shows the potential funds available for the next level
- Values are pulled from the user's specific reward settings

### 5. Frontend Integration
**Files**:
- `frontend/src/contexts/AuthContext.tsx` - Added level reward fields to User interface
- `frontend/src/components/FlowCanvas.tsx` - Passes user's rewards to NextLevelPopup
- `frontend/src/App.tsx` - Added route for admin user rewards page

### 6. Navigation Updates
**Files**:
- `frontend/src/pages/AdminTopupRequests.tsx` - Added "User Rewards" button
- `frontend/src/pages/AdminUserRewards.tsx` - Added "Top-Up Requests" button

Both admin pages now have quick navigation between each other for easy access.

## Usage Guide

### For Administrators:

1. **Access Admin Panel**:
   - Log in as an admin user
   - Navigate to Profile
   - Click "Admin Panel" button
   - Choose either "Top-Up Requests" or navigate to "User Rewards"

2. **View All Users**:
   - Go to `/admin/user-rewards`
   - See a list of all users with their current reward settings

3. **Search and Filter**:
   - Use the search bar to find specific users by name, email, or ID
   - Use the sort dropdown to organize users by:
     - Date joined (newest first)
     - Name (alphabetically)
     - Email (alphabetically)
     - Tier level (highest first)
     - Balance (highest first)
   - View total user count and filtered results

4. **Edit User Rewards**:
   - Find the user you want to modify
   - Click "Edit Rewards" button
   - Update any level reward amounts
   - Click "Save" to apply changes
   - Click "Cancel" to discard changes

4. **Visual Indicators**:
   - Completed levels are shown with a green background and checkmark
   - Pending levels have a gray background
   - All rewards are displayed in a clear grid format

### Scalability Features:

The admin panel is optimized for managing large numbers of users:
- **Real-time search**: Filters users instantly as you type (searches name, email, and user ID)
- **Multiple sort options**: Organize users by date, name, email, tier, or balance
- **Responsive design**: Works on desktop and mobile
- **Stats display**: Always know total and filtered user counts
- **Clear search**: Quick reset button to show all users again
- **Efficient filtering**: Client-side filtering for instant results

### For Regular Users:

When a user completes a level:
1. The level animation plays
2. Upon completion, a popup appears showing:
   - The amount refunded for completing the current level (based on their personal `lvlXreward` value)
   - The potential funds for the next level
3. These values are unique to each user and can be customized by administrators

## Default Reward Values

New users automatically receive these default reward values:
- Level 1: $1,000
- Level 2: $5,000
- Level 3: $10,000
- Level 4: $50,000
- Level 5: $100,000

Administrators can modify these on a per-user basis.

## Technical Notes

### Data Flow:
1. User completes level animation
2. Frontend fetches user data (including reward values)
3. NextLevelPopup component displays user-specific rewards
4. Admin can modify rewards via admin panel
5. Changes are saved to database
6. Next time user completes a level, new values are shown

### Security:
- All admin endpoints are protected with authentication middleware
- Admin privilege check is performed in controllers
- Only users with `isAdmin: true` can access admin features

### Database Updates:
- Existing users will automatically receive default reward values due to the schema defaults
- No migration script needed - MongoDB will apply defaults on first access

## Future Enhancements (Optional)

Potential improvements that could be added:
1. Bulk update functionality for multiple users at once
2. Reward templates or presets
3. History tracking of reward changes
4. Export/import user reward configurations
5. Search and filter functionality in admin panel
6. Reward calculation based on formulas instead of fixed amounts

## Files Modified

### Backend:
- `backend/models/user.model.js`
- `backend/controllers/user.controller.js`
- `backend/routes/user.routes.js`

### Frontend:
- `frontend/src/pages/AdminUserRewards.tsx` (NEW)
- `frontend/src/pages/AdminTopupRequests.tsx`
- `frontend/src/components/NextLevelPopup.tsx`
- `frontend/src/components/FlowCanvas.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/App.tsx`

### Documentation:
- `rules/USER_LEVEL_REWARDS_GUIDE.md` (NEW)
