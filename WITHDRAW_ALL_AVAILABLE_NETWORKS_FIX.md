# Withdraw All Available Networks Fix

## Problem
The "Withdraw All" feature was including already withdrawn networks in the withdrawal request and displaying incorrect totals. This caused:
1. The UI to show the sum of ALL networks (including already withdrawn ones)
2. The backend to receive withdrawal requests for networks that were already withdrawn
3. Incorrect commission calculations

## Solution Implemented

### Changes Made

#### 1. Added `availableUSDT` State
Added a new state variable to track only available (non-withdrawn) USDT:
```typescript
const [availableUSDT, setAvailableUSDT] = useState<number>(0); // Total excluding withdrawn networks
```

#### 2. Calculate Available USDT
Added a useEffect hook that calculates the available USDT by excluding withdrawn networks:
```typescript
useEffect(() => {
  if (Object.keys(conversionBreakdown).length > 0) {
    let available = 0;
    Object.entries(conversionBreakdown).forEach(([network, breakdown]: any) => {
      const upper = network.toUpperCase();
      // Only count networks that haven't been withdrawn
      if (!withdrawnNetworks.has(upper) && (breakdown?.usdt || 0) > 0) {
        available += breakdown.usdt;
      }
    });
    setAvailableUSDT(available);
    console.log('[Available USDT] Calculated available USDT (excluding withdrawn):', {
      availableUSDT: available,
      totalUSDT,
      withdrawnNetworks: Array.from(withdrawnNetworks)
    });
  }
}, [conversionBreakdown, withdrawnNetworks, totalUSDT]);
```

#### 3. Updated UI to Show Available USDT
Changed all references from `totalUSDT` to `availableUSDT` in the UI:

**Header message:**
```typescript
// Before:
<>We have successfully identified <span>${totalUSDT.toLocaleString()} USDT</span> amount on this layer.</>

// After:
<>We have successfully identified <span>${availableUSDT.toLocaleString()} USDT</span> available on this layer.</>
```

**Withdraw All button:**
```typescript
// Before:
<span>{totalUSDT.toLocaleString()}</span>
<div>Total Value</div>

// After:
<span>{availableUSDT.toLocaleString()}</span>
<div>Available Value</div>
```

#### 4. Updated getSelectedAmount Function
Modified to return available USDT when withdrawing all:
```typescript
const getSelectedAmount = (): number => {
  if (withdrawAll) {
    // Return only available USDT (excluding withdrawn networks)
    return availableUSDT;
  }
  
  let total = 0;
  selectedNetworks.forEach(network => {
    const breakdown = conversionBreakdown[network];
    if (breakdown) {
      total += breakdown.usdt;
    }
  });
  return total;
};
```

#### 5. Fixed handleSubmit to Filter Withdrawn Networks
**This is the crucial fix!** Updated the submission logic to only send available networks:

```typescript
// Get available networks (excluding already withdrawn ones)
const allNetworks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
const availableNetworks = withdrawAll 
  ? allNetworks.filter(network => {
      const upper = network.toUpperCase();
      const breakdown = conversionBreakdown[network];
      // Include only networks that are NOT withdrawn and have value > 0
      return !withdrawnNetworks.has(upper) && (breakdown?.usdt || 0) > 0;
    })
  : Array.from(selectedNetworks);

// Get network rewards for available networks only
const selectedNetworkRewards = withdrawAll 
  ? Object.fromEntries(
      availableNetworks.map(network => [network, networkRewards[network] || 0])
    )
  : Object.fromEntries(
      Array.from(selectedNetworks).map(network => [network, networkRewards[network] || 0])
    );

console.log('[Withdraw] Submitting withdrawal:', {
  withdrawAll,
  availableNetworks,
  withdrawnNetworks: Array.from(withdrawnNetworks),
  selectedNetworkRewards,
  amount: withdrawAmount
});

const requestBody = {
  amount: withdrawAmount,
  wallet: '',
  networks: availableNetworks,  // Only available networks
  networkRewards: selectedNetworkRewards,  // Only available network rewards
  withdrawAll: withdrawAll,
  addToBalance: true
};
```

## How It Works Now

### Scenario 1: User has withdrawn BTC and ETH previously
1. **Withdrawn Networks**: `['BTC', 'ETH']`
2. **Available Networks**: `['TRON', 'USDT', 'BNB', 'SOL']` (with rewards > 0)
3. **UI Display**: Shows only the sum of TRON + USDT + BNB + SOL
4. **Backend Request**: Sends only `['TRON', 'USDT', 'BNB', 'SOL']` in the networks array
5. **Result**: User can only withdraw from networks they haven't withdrawn from yet

### Scenario 2: User clicks "Withdraw All" with some networks already withdrawn
1. System filters out withdrawn networks
2. Calculates available USDT from remaining networks only
3. Shows correct total in UI
4. Sends only non-withdrawn networks to backend
5. Commission is calculated on available networks only

## Benefits

✅ **Accurate Totals**: UI shows only available withdrawal amounts  
✅ **Prevents Double Withdrawal**: Backend never receives requests for already withdrawn networks  
✅ **Correct Commissions**: Commission is calculated only on available networks  
✅ **Better UX**: Users see exactly what they can withdraw  
✅ **Proper Logging**: Console logs show which networks are available vs withdrawn  

## Testing Checklist

- [ ] User with no withdrawn networks sees all networks in "Withdraw All"
- [ ] User with some withdrawn networks sees only remaining networks
- [ ] "Withdraw All" total matches sum of available networks only
- [ ] Backend receives only non-withdrawn networks in the request
- [ ] Commission is calculated correctly on available networks
- [ ] After withdrawing all available networks, confetti is triggered
- [ ] "Upgrade to Next Level" button appears after all networks withdrawn
- [ ] Console logs show correct availableNetworks and withdrawnNetworks

## Files Modified

- `/Users/admin/Downloads/projects/cfinder/cf-finder/frontend/src/components/EnhancedWithdrawPopup.tsx`

## Related Systems

- **Withdrawal History Tracking**: Uses approved withdrawal requests filtered by current level
- **Commission Calculation**: Backend calculates commission on selected networks
- **Network Rewards**: Fetched from backend with conversion rates
- **Tier Upgrade**: Triggered when all networks are withdrawn

## Example Console Logs

When user clicks "Withdraw All" with BTC already withdrawn:
```javascript
[Available USDT] Calculated available USDT (excluding withdrawn): {
  availableUSDT: 12500,
  totalUSDT: 15000,
  withdrawnNetworks: ['BTC']
}

[Withdraw] Submitting withdrawal: {
  withdrawAll: true,
  availableNetworks: ['ETH', 'TRON', 'USDT', 'BNB', 'SOL'],
  withdrawnNetworks: ['BTC'],
  selectedNetworkRewards: {
    ETH: 2.5,
    TRON: 5000,
    USDT: 1000,
    BNB: 15,
    SOL: 50
  },
  amount: 12500
}
```


