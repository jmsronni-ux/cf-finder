# Tier Pricing Customization System

## Overview
This system allows administrators to customize tier upgrade prices for individual users. By default, all users use the standard pricing from `TIER_CONFIG`, but admins can set custom prices per user to offer discounts, special pricing, or promotional rates.

## Features Implemented

### 1. Database Schema (User Model)
**File**: `backend/models/user.model.js`

Added new fields to the User model:
- `tier2Price`: Number | null (default: null) - Custom price to upgrade to Tier 2
- `tier3Price`: Number | null (default: null) - Custom price to upgrade to Tier 3
- `tier4Price`: Number | null (default: null) - Custom price to upgrade to Tier 4
- `tier5Price`: Number | null (default: null) - Custom price to upgrade to Tier 5

When set to `null`, the system uses the default price from `TIER_CONFIG`. When set to a number, that becomes the user's custom upgrade price.

### 2. Backend Tier System Updates
**File**: `backend/utils/tier-system.js`

Added new helper functions:

**`getUserTierPrice(user, tier)`**
- Gets the tier upgrade price for a specific user
- Checks if user has custom price set, otherwise returns default
- Returns 0 for invalid tiers (< 2 or > 5)

**`canUpgradeWithCustomPrice(user, targetTier)`**
- Checks if user can upgrade to target tier with custom pricing
- Validates user balance against custom or default price

**`getUpgradeOptionsForUser(user)`**
- Returns all available upgrade options for a user
- Includes custom prices when set
- Marks options with `isCustomPrice` flag

### 3. Tier Controller Updates
**File**: `backend/controllers/tier.controller.js`

Updated functions:

**`getUserTier`**
- Now returns user's custom tier prices in response
- Uses `getUpgradeOptionsForUser()` to show personalized prices
- Uses `canUpgradeWithCustomPrice()` for upgrade eligibility check

**`upgradeUserTier`**
- Now uses `getUserTierPrice()` to calculate upgrade cost
- Supports custom pricing during tier upgrades
- Deducts the correct amount (custom or default) from user balance

### 4. Admin API Endpoints
**Files**: 
- `backend/controllers/user.controller.js`
- `backend/routes/user.routes.js`

#### New Endpoints:

**GET `/user/admin/tier-prices`**
- **Purpose**: Fetch all users with their tier pricing information
- **Access**: Admin only
- **Returns**: List of users with email, name, balance, tier, and custom tier prices

**PUT `/user/admin/tier-prices/:userId`**
- **Purpose**: Update custom tier prices for a specific user
- **Access**: Admin only
- **Body Parameters**:
  ```json
  {
    "tier2Price": 45,      // or null to use default
    "tier3Price": 90,      // or null to use default
    "tier4Price": 200,     // or null to use default
    "tier5Price": 450      // or null to use default
  }
  ```
  (All fields are optional - only include the ones you want to update)
- **Note**: Set to `null` to revert to default pricing

### 5. Admin Dashboard Enhancement
**File**: `frontend/src/pages/AdminUserRewards.tsx`

Enhanced the admin page with:

**New Section: "Tier Upgrade Prices"**
- Displays all 4 tier upgrade prices (Tier 2-5) in a grid
- Shows "Custom" badge for user-specific pricing
- Shows "Default" label when using standard pricing
- Color-coded: Purple for custom prices, Gray for defaults

**Edit Functionality**:
- Click "Edit Prices" button to enable editing
- Input fields with placeholders showing default values
- Empty field = use default price
- Click "Save" to update (with loading state)
- Click "Cancel" to discard changes

**Visual Design**:
- Purple theme for tier prices (distinguishes from green level rewards)
- Default price displayed below input when editing
- Clear indication of custom vs default pricing
- Responsive grid layout

### 6. Frontend Integration
**Files**:
- `frontend/src/contexts/AuthContext.tsx` - Added tier price fields to User interface
- Tier prices are automatically included in user data refresh

## Usage Guide

### For Administrators:

#### Access Admin Panel
1. Log in as an admin user
2. Navigate to Profile
3. Click "Admin Panel" button
4. Go to "User Rewards" (now called "User Rewards & Tier Pricing")

#### Set Custom Tier Prices
1. Find the user you want to modify
2. Scroll to "Tier Upgrade Prices" section
3. Click "Edit Prices" button
4. For each tier:
   - Enter a custom price (e.g., 45 for discounted Tier 2)
   - Leave empty to use default price
   - See default price shown below each input
5. Click "Save" to apply changes

#### Reset to Default Pricing
1. Edit the user's tier prices
2. Clear the input field (leave it empty)
3. Click "Save"
4. The system will revert to default pricing for that tier

#### View Pricing Status
- **Custom Price**: Purple background with "Custom" badge
- **Default Price**: Gray background with "Default" label
- Price amount always displayed clearly

### For Users:

When upgrading tiers:
1. User sees their personalized upgrade price (if set by admin)
2. System checks user's balance against their custom price
3. Upgrade deducts the custom amount (or default if not set)
4. All tier upgrade logic respects custom pricing

## Default Tier Prices

Standard pricing (from `TIER_CONFIG`):
- **Tier 2 (Standard)**: $50
- **Tier 3 (Professional)**: $100
- **Tier 4 (Enterprise)**: $250
- **Tier 5 (Premium)**: $500

Admins can set any custom price for individual users.

## Technical Implementation Details

### Data Flow:

1. **User Upgrade Request**:
   - Frontend calls `/tier/upgrade` with target tier
   - Backend retrieves user data (including custom prices)
   - `getUserTierPrice()` determines actual cost
   - System validates balance and processes upgrade

2. **Admin Price Update**:
   - Admin sets custom price via admin panel
   - Frontend calls `/user/admin/tier-prices/:userId`
   - Backend updates only provided fields
   - `null` values revert to defaults

3. **Price Display**:
   - `/tier/my-tier` returns custom prices in user data
   - `getUpgradeOptionsForUser()` calculates each option's price
   - Frontend displays prices with custom/default indicators

### Custom Price Logic:

```javascript
// In tier-system.js
export const getUserTierPrice = (user, tier) => {
    if (tier < 2 || tier > 5) return 0;
    
    // Check if user has custom price set
    const customPriceField = `tier${tier}Price`;
    if (user[customPriceField] !== null && user[customPriceField] !== undefined) {
        return user[customPriceField];
    }
    
    // Fall back to default price
    return TIER_CONFIG[tier].upgradePrice;
};
```

### Security:
- All admin endpoints protected with authentication middleware
- Admin privilege check performed in controllers
- Only users with `isAdmin: true` can modify tier prices
- Users cannot set their own tier prices

### Database Behavior:
- Existing users will have `null` values (use defaults)
- No migration needed - MongoDB applies defaults automatically
- Setting to `null` explicitly reverts to default
- Custom prices independent per user

## Use Cases

### 1. **Promotional Discounts**
Set temporary discounted prices for specific users:
```json
{
  "tier2Price": 25,  // 50% off
  "tier3Price": 50   // 50% off
}
```

### 2. **VIP Pricing**
Offer special rates to valued customers:
```json
{
  "tier5Price": 300  // $200 off premium tier
}
```

### 3. **Testing Accounts**
Set zero or minimal prices for test users:
```json
{
  "tier2Price": 1,
  "tier3Price": 1,
  "tier4Price": 1,
  "tier5Price": 1
}
```

### 4. **Graduated Pricing**
Create custom price structures:
```json
{
  "tier2Price": 40,
  "tier3Price": 75,
  "tier4Price": 150,
  "tier5Price": 300
}
```

### 5. **Reset to Standard**
Remove all custom pricing:
```json
{
  "tier2Price": null,
  "tier3Price": null,
  "tier4Price": null,
  "tier5Price": null
}
```

## Admin Panel Features

### Search & Filter
- Search by name, email, or user ID
- Sort by date, name, email, tier, or balance
- Real-time filtering

### Dual Management
- **Level Rewards**: Configure completion rewards (green theme)
- **Tier Prices**: Configure upgrade costs (purple theme)
- Edit separately or simultaneously
- Independent save/cancel actions

### Visual Indicators
- Custom prices: Purple background + "Custom" badge
- Default prices: Gray background + "Default" label
- Current tier: Trophy icon + tier number
- User balance: Wallet icon + amount

## API Response Examples

### Get User Tier (with custom prices)
```json
{
  "success": true,
  "data": {
    "user": {
      "tier": 2,
      "balance": 150,
      "tier2Price": null,
      "tier3Price": 75,
      "tier4Price": null,
      "tier5Price": 400
    },
    "upgradeOptions": [
      {
        "tier": 3,
        "name": "Professional",
        "upgradePrice": 75,
        "isCustomPrice": true
      },
      {
        "tier": 4,
        "name": "Enterprise",
        "upgradePrice": 250,
        "isCustomPrice": false
      },
      {
        "tier": 5,
        "name": "Premium",
        "upgradePrice": 400,
        "isCustomPrice": true
      }
    ]
  }
}
```

### Update Tier Prices
**Request:**
```bash
PUT /user/admin/tier-prices/USER_ID
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "tier3Price": 75,
  "tier5Price": 400
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tier prices updated successfully",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "tier2Price": null,
    "tier3Price": 75,
    "tier4Price": null,
    "tier5Price": 400
  }
}
```

## Testing the System

### 1. Test Custom Price Setting
```bash
# Set custom prices for a user
curl -X PUT http://localhost:3000/user/admin/tier-prices/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier2Price": 30,
    "tier3Price": 60
  }'
```

### 2. Test User Upgrade with Custom Price
```bash
# User upgrades to tier with custom price
curl -X POST http://localhost:3000/tier/upgrade \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetTier": 2
  }'
```

### 3. Test Price Reset
```bash
# Reset to default pricing
curl -X PUT http://localhost:3000/user/admin/tier-prices/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier2Price": null,
    "tier3Price": null
  }'
```

## Files Modified/Created

### Backend:
- `backend/models/user.model.js` - Added tier price fields
- `backend/utils/tier-system.js` - Added custom pricing functions
- `backend/controllers/tier.controller.js` - Updated to use custom prices
- `backend/controllers/user.controller.js` - Added tier price endpoints
- `backend/routes/user.routes.js` - Added tier price routes

### Frontend:
- `frontend/src/contexts/AuthContext.tsx` - Added tier price fields to User interface
- `frontend/src/pages/AdminUserRewards.tsx` - Added tier price management UI

### Documentation:
- `rules/TIER_PRICING_CUSTOMIZATION_GUIDE.md` (THIS FILE)

## Future Enhancements (Optional)

Potential improvements:
1. Bulk tier price updates for multiple users
2. Pricing templates/presets
3. History tracking of price changes
4. Scheduled price changes
5. Percentage-based discounts
6. User group pricing
7. Automatic expiration of custom prices
8. Export/import pricing configurations

## Relationship with Level Rewards

This system is separate from but complementary to the Level Rewards system:

- **Level Rewards** (`lvl1reward` - `lvl5reward`): Amount refunded when completing a level animation
- **Tier Prices** (`tier2Price` - `tier5Price`): Cost to upgrade to the next tier

Both can be customized per user by admins in the same interface.

## Summary

The tier pricing customization system provides administrators with flexible control over tier upgrade costs on a per-user basis. This enables:
- Promotional discounts
- VIP pricing
- Testing scenarios
- Custom business arrangements
- Individual user incentives

All while maintaining backward compatibility with default pricing for users without custom settings.

