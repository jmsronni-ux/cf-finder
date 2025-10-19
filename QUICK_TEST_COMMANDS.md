# Quick Test Commands for Dynamic Network Rewards

## Prerequisites
- Backend server running on port 5000 (or your configured port)
- MongoDB connected
- At least one user in database
- At least one level in database

## 1. Test Backend Distribution Function

Run the automated test:
```bash
cd backend
node test/test-dynamic-rewards.js
```

Expected output includes:
```
✅ BTC distribution total matches expected (0.5)
✅ ETH distribution total matches expected (2.0)
✅ Successfully extracted user network rewards
🎉 ALL TESTS PASSED!
```

## 2. Test API Endpoint Manually

### Get Levels WITHOUT userId (default template)
```bash
curl http://localhost:5000/api/level
```

Expected: Returns all levels with default transaction amounts.

### Get Levels WITH userId (personalized)
First, get a user ID from your database or admin panel, then:

```bash
# Replace USER_ID with actual MongoDB user ID
curl "http://localhost:5000/api/level?userId=YOUR_USER_ID_HERE"
```

Expected: Returns levels with personalized transaction amounts based on user's network rewards.

### Get Specific Level with userId
```bash
curl "http://localhost:5000/api/level/1?userId=YOUR_USER_ID_HERE"
```

Expected: Returns Level 1 with personalized amounts.

## 3. Quick Frontend Test

### Steps:
1. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend (in another terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open Browser:**
   - Navigate to `http://localhost:5173` (or your dev port)
   - Open DevTools Console (F12)
   - Log in with a test user

4. **Check Console for Logs:**
   Look for:
   ```
   [useLevelData] Fetching levels with userId: 67...
   [Level Distribution] BTC: Total reward 0.5, Distributed 0.5000 across 3 nodes
   ```

5. **Verify in UI:**
   - Go to animation page
   - Start Level 1
   - Click fingerprint nodes
   - Check transaction amounts match your user's network rewards

## 4. Test Admin Panel

1. Log in as admin
2. Go to Admin Panel → User Network Rewards
3. Select a user
4. Click "Edit" on any level
5. Look for blue info box with Zap icon
6. Set test rewards (e.g., BTC: 0.5, ETH: 2.0)
7. Save
8. Log out and log in as that user
9. View animation and verify amounts

## 5. Verify Database

### Check User Network Rewards:
```bash
# In MongoDB shell or Compass
db.users.findOne({ email: "your-test-user@example.com" }, {
  lvl1NetworkRewards: 1,
  lvl2NetworkRewards: 1,
  lvl3NetworkRewards: 1,
  lvl4NetworkRewards: 1,
  lvl5NetworkRewards: 1
})
```

Expected output:
```json
{
  "_id": "...",
  "lvl1NetworkRewards": {
    "BTC": 0.5,
    "ETH": 2.0,
    "TRON": 200,
    "USDT": 100,
    "BNB": 5,
    "SOL": 10
  }
}
```

### Check Level Template:
```bash
db.levels.findOne({ level: 1 }, { 
  level: 1, 
  name: 1,
  "nodes.id": 1,
  "nodes.type": 1,
  "nodes.data.transaction.currency": 1
})
```

Verify fingerprint nodes exist with currency codes.

## 6. Compare Before and After

### Before (template amounts):
```bash
# Without userId
curl http://localhost:5000/api/level/1 | jq '.data.level.nodes[] | select(.type=="fingerprintNode") | {id: .id, currency: .data.transaction.currency, amount: .data.transaction.amount}'
```

### After (personalized amounts):
```bash
# With userId - amounts should be different
curl "http://localhost:5000/api/level/1?userId=YOUR_USER_ID" | jq '.data.level.nodes[] | select(.type=="fingerprintNode") | {id: .id, currency: .data.transaction.currency, amount: .data.transaction.amount}'
```

## 7. Performance Test

```bash
# Time the API response
time curl -s "http://localhost:5000/api/level?userId=YOUR_USER_ID" > /dev/null
```

Expected: < 500ms for reasonable database size

## 8. Stress Test (Optional)

```bash
# Send 10 concurrent requests
for i in {1..10}; do
  curl -s "http://localhost:5000/api/level?userId=YOUR_USER_ID" &
done
wait
```

Expected: All requests succeed, server stable

## Common Test Scenarios

### Scenario A: Fresh User (No Custom Rewards)
```bash
# Create user via admin or API
# Fetch levels - should use global defaults or zeros
curl "http://localhost:5000/api/level?userId=NEW_USER_ID"
```

### Scenario B: User with Partial Rewards
```bash
# Set only BTC and ETH via admin
# Other networks should show 0 or default
curl "http://localhost:5000/api/level/1?userId=USER_ID"
```

### Scenario C: Multiple Users
```bash
# User A
curl "http://localhost:5000/api/level/1?userId=USER_A_ID" | jq '.data.level.nodes[5].data.transaction.amount'

# User B  
curl "http://localhost:5000/api/level/1?userId=USER_B_ID" | jq '.data.level.nodes[5].data.transaction.amount'

# Amounts should be different if rewards are different
```

## Troubleshooting Commands

### Check if distribution utility exists:
```bash
ls backend/utils/level-distribution.js
```

### Check backend logs:
```bash
# While backend is running
tail -f backend-logs.txt  # if logging to file
# or just watch console output
```

### Verify imports work:
```bash
cd backend
node -e "import('./utils/level-distribution.js').then(m => console.log('✅ Import successful:', Object.keys(m)))"
```

### Test just the distribution function:
```bash
cd backend
node -e "
import('./utils/level-distribution.js').then(m => {
  const testData = {
    nodes: [
      { id: 'fp1', type: 'fingerprintNode', data: { transaction: { currency: 'BTC', amount: 0.1 } } },
      { id: 'fp2', type: 'fingerprintNode', data: { transaction: { currency: 'BTC', amount: 0.2 } } }
    ]
  };
  const result = m.distributeNetworkRewards(testData, { BTC: 0.5 });
  const total = result.nodes.reduce((sum, n) => sum + (n.data.transaction?.amount || 0), 0);
  console.log('✅ Distribution works! Total:', total);
})
"
```

## Success Indicators

When everything works correctly:

✅ Automated test script passes  
✅ API returns different amounts with userId parameter  
✅ Console shows distribution logs  
✅ Frontend displays correct amounts in animation  
✅ Admin panel shows info message  
✅ Response times are fast (<500ms)  
✅ No errors in console or logs  
✅ Multiple users get their own amounts  

## Quick Rollback

If something breaks:

```bash
# Frontend only - comment out userId parameter
# In frontend/src/hooks/useLevelData.ts, line ~40
# Change:
#   url += `&userId=${user._id}`;
# To:
#   // url += `&userId=${user._id}`;  // TEMP DISABLED
```

This makes the system use template amounts until fix is deployed.

