# Network Withdrawal Completion Feature

## Overview
Enhanced the `EnhancedWithdrawPopup` component to celebrate users who have withdrawn from all networks and guide them to upgrade to the next tier level.

## Changes Made

### 1. Visual Improvements for Withdrawn Networks
- **Dimmed Green Design**: Networks with 0 balance now display with a subtle green tint (`bg-green-500/5 border-green-500/20`)
- **Checkmark Indicators**: All withdrawn networks show a dimmed green checkmark to indicate completion
- **Unclickable State**: Networks with 0 balance cannot be selected (cursor-not-allowed)
- **Reduced Opacity**: 40% opacity to clearly distinguish from available networks

### 2. Confetti Celebration
When all networks have been withdrawn (all balances = 0):
- **Automatic Confetti Animation**: Fires confetti from both sides of the screen
- **Duration**: 3 seconds of celebration
- **Trigger**: Only fires once per popup session using `confettiShownRef`
- **High z-index**: Ensures confetti appears above the modal (z-index: 9999)

### 3. Upgrade to Next Level Button
When all networks are withdrawn, the button section transforms:
- **Replaces**: Both "Go to Profile" and "Withdraw" buttons
- **New Button**: "Upgrade to Level X" with gradient purple-to-pink styling
- **Congratulations Message**: 
  - "🎉 All Networks Withdrawn!"
  - "Congratulations! You've successfully withdrawn from all networks."
- **Functionality**: Submits tier upgrade request via `/tier-request/create` API
- **Backend Validation**: Backend verifies all networks from current tier have been withdrawn (all amounts = 0)
- **Navigation**: Redirects to profile page after successful request submission
- **Admin Approval**: Request awaits admin approval before tier upgrade is applied

## Technical Implementation

### New State Variables
```typescript
const [allNetworksWithdrawn, setAllNetworksWithdrawn] = useState<boolean>(false);
const [isUpgradingTier, setIsUpgradingTier] = useState<boolean>(false);
const confettiShownRef = useRef<boolean>(false);
```

### New Dependencies
- `canvas-confetti`: For the celebration animation
- `ArrowUp` icon from lucide-react

### Key Functions

#### handleTierUpgrade()
```typescript
const handleTierUpgrade = async () => {
  // Calculates next tier: (currentTier + 1)
  // Submits tier upgrade request via /tier-request/create endpoint
  // Backend validates all networks are withdrawn before accepting
  // Shows success toast and navigates to profile
}
```

#### Confetti Effect (useEffect)
- Monitors `networkRewards` to detect when all amounts = 0
- Sets `allNetworksWithdrawn` state
- Triggers confetti animation once
- Fires particles from both left and right sides

### Conditional Rendering
The UI now has two states based on `allNetworksWithdrawn`:

**State 1: Normal Withdrawal Mode** (some networks have balance)
- "Withdraw All Networks" section (visible)
- "Or Select Individual Networks" text (visible)
- Network grid with selectable items
- "Go to Profile" button
- "Withdraw $X" button
- Commission info display

**State 2: All Networks Withdrawn** (all balances = 0)
- "Withdraw All Networks" section (hidden)
- "Or Select Individual Networks" text (hidden)
- Network grid shows all completed checkmarks
- Congratulations message
- Single "Upgrade to Level X" button

## User Experience Flow

1. **Initial State**: User sees available networks with balances
2. **During Withdrawal**: User selects and withdraws from networks
3. **Last Withdrawal**: When final network is withdrawn, all amounts become 0
4. **Celebration**: 
   - Confetti fires automatically
   - All network cards show green checkmarks (dimmed)
   - Networks become unclickable
5. **Call to Action**: "Upgrade to Level X" button appears
6. **Upgrade**: User clicks button → tier request submitted → redirected to profile

## API Integration

### Tier Upgrade Request
- **Endpoint**: `POST /tier-request/create`
- **Body**: `{ requestedTier: nextTier }`
- **Auth**: Bearer token required
- **Backend Validation**:
  - Verifies all networks from current tier have 0 balance
  - Checks no existing pending request for this tier
  - Validates requested tier is higher than current
- **Success**: 
  - Tier upgrade request created with 'pending' status
  - Success toast shown
  - Navigates to `/profile` to track request status
- **Error**: Shows error toast to user (e.g., if networks not fully withdrawn)

### Backend Validation Logic
The backend controller (`tier-request.controller.js`) includes this validation:

```javascript
// Check all network rewards from current tier are withdrawn
const currentTierNetworkRewardsField = `lvl${user.tier}NetworkRewards`;
const currentTierNetworkRewards = user[currentTierNetworkRewardsField] || {};
const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];

const remainingNetworks = networks.filter(network => {
    const amount = currentTierNetworkRewards[network] || 0;
    return amount > 0;
});

if (remainingNetworks.length > 0) {
    throw new ApiError(400, `You must withdraw all network rewards from Level ${user.tier} before upgrading. Remaining networks: ${remainingNetworks.join(', ')}`);
}
```

This ensures users cannot bypass the withdrawal requirement by manipulating frontend state.

## Styling Details

### Withdrawn Network Cards
```css
opacity-40 cursor-not-allowed 
bg-green-500/5 border-green-500/20
```

### Checkboxes (Withdrawn)
```css
bg-green-500/20 border-green-500/30
text-green-500/50 (checkmark color)
```

### Upgrade Button
```css
bg-gradient-to-r from-purple-500 to-pink-500
hover:from-purple-600 hover:to-pink-600
shadow-lg shadow-purple-500/30
```

## Reset Logic
When popup closes:
- `confettiShownRef.current = false` (allows confetti to fire again on next open)
- All other states reset as before

## Testing Checklist
- ✅ Networks with 0 balance show dimmed green design
- ✅ Networks with 0 balance show checkmarks
- ✅ Networks with 0 balance are unclickable
- ✅ "Withdraw All Networks" section hidden when all withdrawn
- ✅ "Or Select Individual Networks" text hidden when all withdrawn
- ✅ Confetti fires when all networks are withdrawn
- ✅ Confetti only fires once per session
- ✅ "Upgrade to Level X" button appears when all withdrawn
- ✅ Backend validates all networks are withdrawn before accepting request
- ✅ Tier upgrade request submitted (awaits admin approval)
- ✅ User redirected to profile after request submission
- ✅ Error shown if trying to upgrade with remaining network balance
- ✅ Confetti flag resets when popup closes

## Future Enhancements
- Could add different confetti colors based on tier level
- Could show total amount withdrawn across all networks
- Could add sound effect for celebration
- Could animate the transition from withdraw buttons to upgrade button

