# Node Price Persistence Fix

## Problem
When a user refreshed the page after completing a level animation, the node prices (transaction amounts) were being randomized again on each refresh. This caused confusion as the values would change every time.

## Root Cause
The `distributeNetworkRewards()` function in `backend/utils/level-distribution.js` had built-in support for stored distributions (via the 4th parameter `storedDistribution`), but the level controller was **not using it**:

- ❌ It wasn't passing stored distributions from the user model
- ❌ It wasn't saving new distributions when they were created

## Solution
Updated `backend/controllers/level.controller.js` to:

1. **Retrieve stored distributions** from the user model before calling `distributeNetworkRewards()`
   - Uses `lvl1DistributedNodes`, `lvl2DistributedNodes`, etc. fields from user model
   - Converts Map to Object for the distribution function

2. **Pass stored distributions** as the 4th parameter to `distributeNetworkRewards()`
   - If stored distribution exists, it will be used (no re-randomization)
   - If no stored distribution exists, a new one will be generated

3. **Save new distributions** back to the user model when created
   - When a new distribution is generated (first time), it's saved to the user document
   - Converts Object back to Map for storage in MongoDB

## How It Works Now

### First Time User Views Animation
1. User requests level data with their `userId`
2. Controller retrieves user from database
3. Checks `lvl${N}DistributedNodes` field → **empty/null** (first time)
4. `distributeNetworkRewards()` generates **NEW random distribution**
5. Controller saves the distribution to `lvl${N}DistributedNodes`
6. User sees the animated nodes with random prices

### Subsequent Refreshes
1. User requests level data again (refresh)
2. Controller retrieves user from database
3. Checks `lvl${N}DistributedNodes` field → **HAS stored values**
4. `distributeNetworkRewards()` uses **STORED distribution** (no randomization)
5. User sees the **SAME prices** as before ✅

## Database Fields Used
Each user document has these Map fields to store distributions:
- `lvl1DistributedNodes`: Map of nodeId → amount (USD)
- `lvl2DistributedNodes`: Map of nodeId → amount (USD)
- `lvl3DistributedNodes`: Map of nodeId → amount (USD)
- `lvl4DistributedNodes`: Map of nodeId → amount (USD)
- `lvl5DistributedNodes`: Map of nodeId → amount (USD)

Example stored data:
```javascript
lvl1DistributedNodes: Map {
  'fingerprint-BTC-1' => 125.50,
  'fingerprint-ETH-1' => 89.23,
  'fingerprint-TRON-1' => 34.12
}
```

## Files Modified
- ✅ `backend/controllers/level.controller.js` - Both `getLevels()` and `getLevelById()` functions

## Testing
To verify the fix works:

1. **Clear existing distributions** (if testing with existing user):
   ```javascript
   // In MongoDB or via script
   db.users.updateOne(
     { email: 'test@example.com' },
     { 
       $set: { 
         lvl1DistributedNodes: new Map(),
         lvl2DistributedNodes: new Map(),
         lvl3DistributedNodes: new Map(),
         lvl4DistributedNodes: new Map(),
         lvl5DistributedNodes: new Map()
       }
     }
   );
   ```

2. **First view**: Prices are randomized and saved
3. **Refresh**: Prices remain the same ✅
4. **Refresh again**: Still the same ✅

## Notes
- Distribution is stored **per user, per level**
- Distribution is created the first time a user views a level animation
- Distribution persists across sessions (stored in database)
- If you want to force re-randomization, clear the `lvl${N}DistributedNodes` field for that user

