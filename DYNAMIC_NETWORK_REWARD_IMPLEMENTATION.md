# Dynamic Network Reward Animation Implementation

## Summary
Successfully implemented a system where admin-configured user network rewards directly influence the transaction amounts displayed in level animations. The Level JSON remains a shared template in the database, while transaction amounts are calculated dynamically based on each user's custom network rewards.

## Implementation Details

### Backend Changes

#### 1. New Utility: `backend/utils/level-distribution.js`
Created a utility module with two main functions:

**`distributeNetworkRewards(levelData, userNetworkRewards)`**
- Takes the Level JSON template and user's network rewards
- Groups fingerprint nodes by currency (BTC, ETH, TRON, USDT, BNB, SOL)
- Generates random distribution weights for each currency's fingerprint nodes
- Distributes the total reward amount proportionally across nodes
- Handles currency mapping (TRX → TRON)
- Rounds amounts appropriately (4 decimals for crypto, 2 for USDT/TRON)
- Returns modified level data with personalized transaction amounts

**`getUserNetworkRewardsForLevel(user, levelNumber)`**
- Extracts the network rewards for a specific level from user document
- Returns the `lvl{N}NetworkRewards` object (e.g., `{ BTC: 0.1, ETH: 1.0, ... }`)

#### 2. Updated: `backend/controllers/level.controller.js`
Modified two endpoints to accept optional `userId` query parameter:

**`getLevels()`**
- Accepts `?userId={userId}` query parameter
- When provided, fetches user from database
- Applies `distributeNetworkRewards()` to each level
- Returns levels with user-specific transaction amounts

**`getLevelById()`**
- Accepts `?userId={userId}` query parameter
- When provided, fetches user and applies distribution to the specific level
- Returns level with personalized transaction amounts

### Frontend Changes

#### 3. Updated: `frontend/src/hooks/useLevelData.ts`
- Now imports `useAuth` to access current user
- Automatically appends `userId` to API request when user is logged in
- Refetches levels when user changes (useEffect dependency)
- Transparently provides personalized level data to all consumers

#### 4. Verified: `frontend/src/components/nodes/FingerprintNode.tsx`
- Confirmed that component displays `data.transaction.amount` directly
- No changes needed - already compatible with dynamic amounts
- Displays amounts in the format: `{amount}$`

#### 5. Updated: `frontend/src/pages/AdminUserRewards.tsx`
- Added informational message in the edit modal
- Blue info box with Zap icon explains:
  - Rewards affect animation transaction amounts
  - Distribution is random across fingerprint nodes
  - Changes take effect on next animation view

## How It Works

### Flow
1. User logs in → Auth context stores user ID
2. `useLevelData` hook fetches levels with `?userId={userId}`
3. Backend retrieves Level JSON template from database
4. Backend fetches user's `lvl{N}NetworkRewards` for each level
5. `distributeNetworkRewards()` calculates random distribution
6. Personalized level data returned to frontend
7. FlowCanvas renders with custom transaction amounts
8. FingerprintNode displays the personalized amounts

### Example
If admin sets for User A, Level 1:
- BTC: 0.5
- ETH: 2.0

And Level 1 has 3 BTC fingerprints and 2 ETH fingerprints:

Backend distributes:
- BTC: 0.5 total → [0.1523, 0.2891, 0.0586] (random split)
- ETH: 2.0 total → [0.8234, 1.1766] (random split)

User A sees these exact amounts in their animation.

### Random Distribution Algorithm
Uses "random cuts" approach:
1. Generate N-1 random numbers between 0 and 1
2. Add boundaries: 0 and 1
3. Sort the numbers
4. Weights = differences between consecutive numbers
5. Multiply each weight by total reward amount

This ensures fair distribution while maintaining randomness.

## Key Features
- ✅ **Shared Template**: One Level JSON per level in database (efficient)
- ✅ **User-Specific Display**: Each user sees their custom reward amounts
- ✅ **Random Distribution**: Fair random split among fingerprint nodes
- ✅ **Currency Mapping**: Handles TRX/TRON naming differences
- ✅ **Appropriate Precision**: 4 decimals for crypto, 2 for stablecoins
- ✅ **Automatic Updates**: Refetches when user changes
- ✅ **Admin Feedback**: Clear message about animation impact

## Testing Recommendations
1. Set custom rewards for a test user via admin panel
2. Log in as that user
3. View level animation
4. Verify fingerprint transaction amounts match distributed rewards
5. Change rewards and reload page
6. Verify amounts update accordingly

## Network Mappings
- BTC → Bitcoin fingerprints
- ETH → Ethereum fingerprints
- TRON → TRX fingerprints (currency code conversion)
- USDT → Tether fingerprints
- BNB → Binance Coin fingerprints
- SOL → Solana fingerprints

## Files Modified
1. `backend/utils/level-distribution.js` (new)
2. `backend/controllers/level.controller.js`
3. `frontend/src/hooks/useLevelData.ts`
4. `frontend/src/pages/AdminUserRewards.tsx`

## Files Verified Compatible
1. `frontend/src/components/nodes/FingerprintNode.tsx`
2. `frontend/src/components/FlowCanvas.tsx`
3. `frontend/src/components/NodeDetailsPanel.tsx`

All existing components work seamlessly with the new dynamic amounts!

