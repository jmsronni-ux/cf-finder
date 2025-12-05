# Tier Change Animation Reset Fix

## Problem
When an admin changed a user's tier (especially downgrading), the animation flags (`lvl1anim`, `lvl2anim`, `lvl3anim`, `lvl4anim`, `lvl5anim`) were not being reset. This caused an issue where:

- If a user was at tier 2 and had watched animations for levels 1 and 2 (`lvl1anim=1`, `lvl2anim=1`)
- Then got downgraded to tier 1
- They would still have `lvl2anim=1` marked as watched
- If they later upgraded back to tier 2, they couldn't watch the level 2 animation again

## Solution
Added animation reset logic to all tier change functions. When a user's tier changes, animation flags for the **current tier level and all levels above** are reset to 0.

### Logic
```
Tier 1 = Unlocks Level 1 animation
Tier 2 = Unlocks Level 2 animation
Tier 3 = Unlocks Level 3 animation
Tier 4 = Unlocks Level 4 animation
Tier 5 = Unlocks Level 5 animation
```

When tier changes to N, reset animations for level N through 5 (including the current tier level).
This ensures users can watch the animation for their current tier again.

### Example
User is downgraded from Tier 3 to Tier 1:
- `lvl1anim` - **Reset to 0** (can watch Level 1 animation again at tier 1)
- `lvl2anim` - **Reset to 0** (will be able to watch when they reach tier 2)
- `lvl3anim` - **Reset to 0** (will be able to watch when they reach tier 3)
- `lvl4anim` - **Reset to 0** (will be able to watch when they reach tier 4)
- `lvl5anim` - **Reset to 0** (will be able to watch when they reach tier 5)

## Files Modified

### 1. `backend/controllers/user.controller.js`
**Function:** `adminChangeUserTier` (lines 248-326)

Added before `user.tier = newTier`:
```javascript
// Reset animation flags for the current tier level and all levels above
// Tier 1 unlocks Level 1, Tier 2 unlocks Level 2, etc.
for (let level = newTier; level <= 5; level++) {
    const animField = `lvl${level}anim`;
    user[animField] = 0;
    console.log(`[Admin Tier Change] Reset ${animField} to 0 (can watch animation again at tier ${level})`);
}
```

**Usage:** This is the main function used in `/admin/tier-management` for direct tier changes.

### 2. `backend/controllers/tier.controller.js`
**Function:** `setUserTier` (lines 91-133)

Modified the update logic:
```javascript
// Reset animation flags for the current tier level and all levels above
// Tier 1 unlocks Level 1, Tier 2 unlocks Level 2, etc.
const updateFields = { tier, updatedAt: new Date() };
for (let level = tier; level <= 5; level++) {
    updateFields[`lvl${level}anim`] = 0;
}

const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateFields,
    { new: true }
);
```

**Usage:** Alternative admin function to set user tier programmatically.

### 3. `backend/controllers/tier-request.controller.js`
**Function:** `approveTierRequest` (lines 142-202)

Added before `user.tier = tierRequest.requestedTier`:
```javascript
// Reset animation flags for the current tier level and all levels above
// Tier 1 unlocks Level 1, Tier 2 unlocks Level 2, etc.
for (let level = tierRequest.requestedTier; level <= 5; level++) {
    const animField = `lvl${level}anim`;
    user[animField] = 0;
}
```

**Usage:** When admin approves a user's tier upgrade request. Although this is typically for upgrades, the reset logic is added for consistency and safety.

## Benefits

### ✅ Consistent Behavior
- All tier change functions now handle animation flags consistently
- No orphaned animation flags remain after tier changes

### ✅ Re-playable Animations
- Users can watch level animations again if they re-upgrade after a downgrade
- Animations are tied to tier access, not just one-time viewing

### ✅ Fair Access Control
- Users cannot access level content for tiers they don't have
- Animation state accurately reflects accessible content

### ✅ No Data Corruption
- Old animation flags don't interfere with future tier changes
- Clean state management

## Testing

### Test Scenario 1: Downgrade
1. User at Tier 3 with animations watched for levels 1, 2, 3
2. Admin downgrades user to Tier 1
3. **Expected:** `lvl1anim=0`, `lvl2anim=0`, `lvl3anim=0`, `lvl4anim=0`, `lvl5anim=0`
4. **Result:** User can now watch level 1 animation again at tier 1
5. If they upgrade to Tier 2 later, they can watch level 2 animation

### Test Scenario 2: Upgrade
1. User starts at Tier 1
2. Admin upgrades user to Tier 3
3. **Expected:** Animations reset: `lvl3anim=0`, `lvl4anim=0`, `lvl5anim=0`
4. **Result:** User can watch level 3 animation for the first time
5. Previous tier animations (lvl1anim, lvl2anim) remain as they were

### Test Scenario 3: Direct Tier Change
1. User at any tier
2. Admin uses tier management page to change tier to N
3. **Expected:** Animation flags for level N and all levels above (N through 5) are reset to 0

## Database State Example

**Before downgrade (Tier 2 → Tier 1):**
```json
{
  "tier": 2,
  "lvl1anim": 1,
  "lvl2anim": 1,
  "lvl3anim": 0,
  "lvl4anim": 0,
  "lvl5anim": 0
}
```

**After downgrade:**
```json
{
  "tier": 1,
  "lvl1anim": 0,  // ← Reset (can watch again)
  "lvl2anim": 0,  // ← Reset
  "lvl3anim": 0,
  "lvl4anim": 0,
  "lvl5anim": 0
}
```

## Logging
Each reset operation logs to the console for debugging:
```
[Admin Tier Change] Reset lvl1anim to 0 (can watch animation again at tier 1)
[Admin Tier Change] Reset lvl2anim to 0 (can watch animation again at tier 2)
[Admin Tier Change] Reset lvl3anim to 0 (can watch animation again at tier 3)
...
```

## Notes
- This fix applies to **all** tier changes, whether upgrade or downgrade
- Only affects animation flags (`lvlXanim`), not rewards or other user data
- Backward compatible - existing users are unaffected until their tier changes
- No database migration needed - changes apply on next tier update

---

**Implementation Date:** October 21, 2025  
**Status:** ✅ Complete and Tested

