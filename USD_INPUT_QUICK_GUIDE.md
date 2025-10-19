# Quick Guide: USD Input Mode

## What Changed?

Added a toggle in the admin level rewards popup that lets you input USD values instead of cryptocurrency amounts.

---

## How to Use

### Step 1: Open Level Editor
Go to `/admin/user-rewards` → Select user → Click "Edit" on any level

### Step 2: Choose Input Mode
You'll see two buttons at the top:
```
[🪙 Input in Coins]  [💲 Input in USD]
```

### Step 3: Input Values

**Option A: Input in Coins (default)**
```
₿ Bitcoin:  [1.5]
           ≈ $67,500 USD  ← shows USD value
```

**Option B: Input in USD**
```
₿ Bitcoin:  [$67,500]
           ≈ 1.5 BTC      ← shows crypto equivalent
```

### Step 4: Save
Click "Save Changes" - system automatically converts to crypto amounts before saving

---

## Key Points

✅ **Same backend** - no changes to how data is stored
✅ **Real-time preview** - see conversions as you type
✅ **Flexible** - switch between modes anytime
✅ **Easy budgeting** - work with USD amounts directly

---

## Example

**Scenario:** Set Level 1 rewards to $1000 total

**Old way:**
1. Check current BTC price: ~$45,000
2. Calculate: $1000 / $45,000 = 0.0222 BTC
3. Input: 0.0222 in BTC field
4. Repeat for each cryptocurrency...

**New way:**
1. Click "Input in USD"
2. Type: 1000 in USD field
3. See preview: ≈ 0.0222 BTC
4. Click Save ✅

---

## Visual Preview

### Toggle Buttons
```
┌─────────────────────────────────────────┐
│ Purple box with two buttons:            │
│ [Active: Purple] [Inactive: Gray]       │
└─────────────────────────────────────────┘
```

### Input Fields with Preview
```
When Input in USD mode:
┌────────────────────────┐
│ ₿ Bitcoin              │
│ ┌────────────────────┐ │
│ │ 45000              │ │  ← Input USD here
│ └────────────────────┘ │
│ ≈ 1 BTC                │  ← Preview shows crypto
└────────────────────────┘

When Input in Coins mode:
┌────────────────────────┐
│ ₿ Bitcoin              │
│ ┌────────────────────┐ │
│ │ 1                  │ │  ← Input crypto here
│ └────────────────────┘ │
│ ≈ $45,000 USD          │  ← Preview shows USD
└────────────────────────┘
```

---

## Quick Test

1. Open `/admin/user-rewards`
2. Select any user
3. Edit Level 1
4. Click "💲 Input in USD"
5. Enter USDT: 100
6. See preview: ≈ 100 USDT
7. Save and verify in database

Done! 🎉

