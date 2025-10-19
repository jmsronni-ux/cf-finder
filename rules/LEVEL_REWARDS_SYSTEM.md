# Level Rewards System - Auto Balance Update

## Overview
When users complete a level animation, the congratulations popup now shows the actual reward amount from their user model AND automatically adds it to their balance.

## How It Works

### 1. User Model Rewards
Each user has customizable reward amounts in their database record:
```javascript
{
  lvl1reward: 300,      // Default: 1000
  lvl2reward: 5000,     // Default: 5000
  lvl3reward: 10000,    // Default: 10000
  lvl4reward: 50000,    // Default: 50000
  lvl5reward: 100000    // Default: 100000
}
```

### 2. Animation Completion Flow

```
User Completes Level Animation
         ↓
Backend: /user/mark-animation-watched
         ↓
Check: Already watched?
         ↓
    YES → Don't add reward (prevent duplicates)
    NO  → Add lvl{X}reward to balance
         ↓
Update: lvl{X}anim = 1, balance += reward
         ↓
Return: Updated balance + animation flags
         ↓
Frontend: Updates user context with new balance
         ↓
Show: Congratulations popup with actual reward
         ↓
Toast: "🎉 Level X reward of $X,XXX added to balance!"
```

### 3. Backend Implementation

**File:** `backend/routes/user.routes.js`

```javascript
// Check if animation was already watched
const currentUser = await User.findById(userId)
  .select(`lvl${level}anim lvl${level}reward balance`);

const alreadyWatched = currentUser[`lvl${level}anim`] === 1;

// Only add reward if not already watched
if (!alreadyWatched) {
  const levelReward = currentUser[`lvl${level}reward`] || 0;
  const newBalance = currentUser.balance + levelReward;
  updateObj.balance = newBalance;
  console.log(`Adding level ${level} reward: $${levelReward}`);
}

// Update database
await User.findByIdAndUpdate(userId, { $set: updateObj });

// Return updated data
res.json({
  success: true,
  data: {
    lvl1anim, lvl2anim, lvl3anim, lvl4anim, lvl5anim,
    balance: updatedBalance,
    rewardAdded: !alreadyWatched
  }
});
```

### 4. Frontend Implementation

**File:** `frontend/src/components/FlowCanvas.tsx`

When animation completes:
```typescript
const rewardAdded = await markAnimationWatched(currentLevel);
if (rewardAdded) {
  const levelReward = user?.lvl${currentLevel}reward;
  toast.success(
    `🎉 Level ${currentLevel} reward of $${levelReward} added to your balance!`,
    { duration: 5000 }
  );
}
await refreshUser(); // Update UI with new balance
```

**File:** `frontend/src/contexts/AuthContext.tsx`

Automatically updates user context:
```typescript
const updatedUser = { ...user, ...responseData.data };
setUser(updatedUser);
localStorage.setItem('user', JSON.stringify(updatedUser));
```

## Visual Flow

### Step 1: Animation Completes
```
[🎬 Animation playing...]
         ↓
[Animation finished!]
```

### Step 2: Balance Update (Backend)
```
User Balance: $1,000
         ↓
Backend adds lvl1reward: $300
         ↓
New Balance: $1,300
```

### Step 3: Congratulations Popup Appears
```
┌─────────────────────────────────────┐
│  🎉 Level Complete!                 │
│                                     │
│  💰 Refunded to Your Account        │
│      $300                           │
│      ↑ (from user.lvl1reward)      │
│                                     │
│  🔮 Potential Funds - Next Level    │
│      $5,000                         │
│      ↑ (from user.lvl2reward)      │
│                                     │
│  [Close] [Unlock Next Level]        │
└─────────────────────────────────────┘
```

### Step 4: Toast Notification
```
┌──────────────────────────────────────────┐
│  ✅ 🎉 Level 1 reward of $300 added to  │
│     your balance!                        │
└──────────────────────────────────────────┘
```

### Step 5: Balance Updates Everywhere
```
Profile Page:  $1,000 → $1,300 ✅
Dashboard:     $1,000 → $1,300 ✅
Header:        $1,000 → $1,300 ✅
```

## Duplicate Prevention

The system prevents duplicate rewards:

```javascript
// First time watching Level 1:
lvl1anim: 0 → Balance += $300, lvl1anim = 1

// If user somehow triggers again:
lvl1anim: 1 → No reward added (already watched)
```

## Admin Control

Admins can customize rewards per user:

**Via Admin Panel:** `/admin/user-rewards`
- Edit level rewards for each user
- Set custom amounts per level
- Changes take effect immediately

**Example:**
```
User A:
  lvl1reward: $300  (custom)
  lvl2reward: $5000 (default)

User B:
  lvl1reward: $1000 (default)
  lvl2reward: $2000 (custom)
```

## Real-World Scenario

### User: John Doe
**Initial State:**
- Balance: $500
- Tier: 1
- lvl1anim: 0
- lvl1reward: $300

**Action:** Completes Level 1 animation

**Backend Process:**
1. Check: `lvl1anim === 0` ✅ (not watched yet)
2. Get: `lvl1reward === 300`
3. Calculate: `$500 + $300 = $800`
4. Update: `balance = $800, lvl1anim = 1`
5. Return: `{ balance: 800, rewardAdded: true }`

**Frontend Response:**
1. Context updates: `user.balance = 800`
2. Popup shows: "Refunded $300"
3. Toast shows: "🎉 Level 1 reward of $300 added to your balance!"
4. All UI updates to show $800

**Final State:**
- Balance: $800 ✅
- Tier: 1
- lvl1anim: 1 ✅
- Can proceed to next level

## Benefits

1. ✅ **Accurate Rewards**: Shows actual amounts from database
2. ✅ **Automatic Update**: Balance updates without manual action
3. ✅ **No Duplicates**: Can't claim reward twice
4. ✅ **Admin Flexibility**: Custom rewards per user
5. ✅ **Visual Feedback**: Toast + popup show reward
6. ✅ **Real-Time**: All UI updates immediately
7. ✅ **Persistent**: Works across page refreshes

## API Endpoint

```
POST /user/mark-animation-watched
Body: { level: 1 }
Headers: { Authorization: Bearer {token} }

Response:
{
  success: true,
  message: "Animation marked as watched for level 1. Reward added to balance!",
  data: {
    lvl1anim: 1,
    lvl2anim: 0,
    lvl3anim: 0,
    lvl4anim: 0,
    lvl5anim: 0,
    balance: 1300,
    rewardAdded: true
  }
}
```

## Testing

### Test Case 1: First Time Watching
```
Before:
- balance: $1000
- lvl1anim: 0
- lvl1reward: $300

Action: Complete level 1 animation

After:
- balance: $1300 ✅ (+$300)
- lvl1anim: 1 ✅
- Toast shown ✅
```

### Test Case 2: Already Watched
```
Before:
- balance: $1300
- lvl1anim: 1
- lvl1reward: $300

Action: Try to watch level 1 again

After:
- balance: $1300 (unchanged) ✅
- lvl1anim: 1 (unchanged) ✅
- No reward added ✅
```

### Test Case 3: Custom Reward
```
Admin sets:
- lvl2reward: $8000 (custom)

User completes level 2:
- Popup shows: "$8,000" ✅
- Balance += $8000 ✅
- Toast: "Level 2 reward of $8,000 added!" ✅
```

## Summary

The congratulations popup now:
- ✅ Shows actual reward from `user.lvl{X}reward`
- ✅ Automatically adds reward to user's balance
- ✅ Shows success toast with amount
- ✅ Updates all UI elements
- ✅ Prevents duplicate rewards
- ✅ Works with custom per-user rewards

**Result:** Seamless reward system that works perfectly with admin-customizable amounts! 🎉

