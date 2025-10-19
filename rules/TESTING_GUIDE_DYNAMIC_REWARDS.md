# Testing Guide: Dynamic Network Reward System

## Overview
This guide provides step-by-step instructions for testing the dynamic network reward animation system before deploying to production.

## Part 1: Automated Backend Tests

### Running the Test Script

```bash
cd backend
node test/test-dynamic-rewards.js
```

### What It Tests
1. **Distribution Utility Function**
   - Random distribution algorithm
   - Correct total amounts
   - Proper decimal rounding

2. **User Network Rewards Extraction**
   - Fetching rewards from user document
   - Correct level mapping

3. **Full Database Integration**
   - Real level data from MongoDB
   - Distribution across actual fingerprint nodes
   - All network currencies (BTC, ETH, TRON, USDT, BNB, SOL)

### Expected Output
```
✅ BTC distribution total matches expected
✅ ETH distribution total matches expected
✅ Successfully extracted user network rewards
✅ All currency distributions correct
🎉 ALL TESTS PASSED! System is ready for production.
```

## Part 2: Manual Frontend Testing

### Prerequisites
1. Backend server running
2. Frontend development server running
3. Admin user credentials
4. Regular test user account

### Test Scenario 1: Default Rewards

**Steps:**
1. Log in with a user who has NO custom rewards set
2. Navigate to the animation page
3. Start Level 1 animation
4. Click on fingerprint nodes
5. Check transaction amounts

**Expected:**
- Should see default/global reward amounts
- Amounts should be consistent with default configuration
- No errors in browser console

### Test Scenario 2: Custom Rewards via Admin Panel

**Steps:**

1. **Set Custom Rewards:**
   - Log in as admin
   - Navigate to Admin Panel → User Network Rewards
   - Select a test user
   - Click "Edit" on Level 1
   - Set custom rewards:
     ```
     BTC: 0.5
     ETH: 2.0
     TRON: 200
     USDT: 100
     BNB: 5
     SOL: 10
     ```
   - Save changes
   - Note the blue info message about animation impact

2. **Verify Animation Updates:**
   - Log out from admin
   - Log in as the test user
   - Navigate to animation page
   - Start Level 1 animation
   - Observe fingerprint nodes appearing

3. **Check Transaction Amounts:**
   - Click on multiple BTC fingerprint nodes
   - Verify amounts sum to ~0.5 BTC
   - Click on multiple ETH fingerprint nodes
   - Verify amounts sum to ~2.0 ETH
   - Check other networks similarly

4. **Verify Distribution:**
   - Note that amounts are NOT equal across nodes
   - Each fingerprint should have different amount
   - Total should match set reward

### Test Scenario 3: Multiple Levels

**Steps:**
1. Set rewards for Levels 1-3 for a test user
2. Complete Level 1 animation
3. Progress to Level 2
4. Verify Level 2 shows different (correct) amounts
5. Progress to Level 3
6. Verify Level 3 amounts

**Expected:**
- Each level uses its own network reward configuration
- No mixing of rewards between levels

### Test Scenario 4: Reward Changes Take Effect

**Steps:**
1. User completes Level 1 animation with initial rewards
2. Admin changes Level 1 rewards for that user
3. User refreshes page
4. User views Level 1 animation again

**Expected:**
- New amounts should appear
- Distribution should be different (new random split)
- No cached old values

### Test Scenario 5: Multiple Users

**Steps:**
1. Set different rewards for User A and User B:
   - User A: BTC: 0.5
   - User B: BTC: 1.0
2. Log in as User A → Check amounts
3. Log in as User B → Check amounts

**Expected:**
- User A sees 0.5 BTC total
- User B sees 1.0 BTC total
- Users don't see each other's rewards

## Part 3: Browser Console Verification

### What to Check
Open browser console (F12) and look for:

1. **Level Data Fetch Logs:**
   ```
   [useLevelData] Fetching levels with userId: 67xxx...
   [Level Controller] Applied user-specific rewards for user 67xxx
   ```

2. **Distribution Logs:**
   ```
   [Level Distribution] BTC: Total reward 0.5, Distributed 0.5000 across 3 nodes
   [Level Distribution] ETH: Total reward 2.0, Distributed 2.0000 across 2 nodes
   ```

3. **No Errors:**
   - No 404s or 500s
   - No undefined/null errors
   - No React warnings

## Part 4: Network Tab Verification

### API Endpoint Check

1. Open Network tab in browser DevTools
2. Filter by "level"
3. Find the request to `/level?t=...&userId=...`
4. Check response:
   ```json
   {
     "success": true,
     "data": {
       "levels": [
         {
           "level": 1,
           "nodes": [
             {
               "id": "btc-fp1",
               "type": "fingerprintNode",
               "data": {
                 "transaction": {
                   "amount": 0.1523,  // ← Should be custom
                   "currency": "BTC"
                 }
               }
             }
           ]
         }
       ]
     }
   }
   ```

5. Verify:
   - `userId` is in the request URL
   - Transaction amounts match expected distribution
   - Response time is reasonable (<500ms)

## Part 5: Edge Cases to Test

### Edge Case 1: Zero Rewards
- Set all network rewards to 0 for a level
- Expected: Fingerprints show $0

### Edge Case 2: Very Small Amounts
- Set BTC: 0.0001
- Expected: Still distributes correctly, no rounding to 0

### Edge Case 3: Very Large Amounts
- Set USDT: 1000000
- Expected: Distributes correctly, no overflow

### Edge Case 4: Missing Networks
- Set only BTC and ETH, leave others at 0
- Expected: Only BTC and ETH fingerprints show amounts

### Edge Case 5: User Without Custom Rewards
- Don't set any custom rewards
- Expected: Falls back to global rewards (if set) or 0

## Part 6: Performance Testing

### Load Test
1. Open 10 browser tabs
2. Log in with 10 different users
3. All load animations simultaneously
4. Check:
   - Server doesn't crash
   - Response times stay reasonable
   - No memory leaks

### Database Query Performance
1. Check MongoDB slow query log
2. Verify level fetch queries are fast
3. Ensure proper indexes exist

## Part 7: Regression Testing

### Verify Existing Features Still Work
- [ ] User login/logout
- [ ] Animation controls (start, pause, reset)
- [ ] Node selection and details panel
- [ ] Tier system
- [ ] Withdrawal system
- [ ] Admin panel other functions
- [ ] Level completion rewards

## Common Issues and Solutions

### Issue: Amounts Don't Update After Admin Change
**Solution:** 
- User needs to refresh page
- Check if level data is being cached
- Verify userId is in the API request

### Issue: Amounts Don't Sum to Total
**Solution:**
- Check for rounding issues (should be within 1%)
- Verify all fingerprint nodes are counted
- Check console for distribution logs

### Issue: Wrong Currency Showing
**Solution:**
- Verify TRON/TRX mapping in level-distribution.js
- Check fingerprint node currency codes in database
- Ensure currency normalization works

### Issue: Admin Info Message Not Showing
**Solution:**
- Check if Zap icon is imported
- Verify React component renders correctly
- Check CSS for display: none

## Production Deployment Checklist

Before deploying:
- [ ] All automated tests pass
- [ ] Manual frontend tests completed
- [ ] Browser console shows no errors
- [ ] Network requests successful
- [ ] Multiple users tested
- [ ] Edge cases verified
- [ ] Performance acceptable
- [ ] Regression tests pass
- [ ] Documentation updated
- [ ] Team informed of changes

## Rollback Plan

If issues occur in production:

1. **Quick Fix:**
   - Comment out userId parameter in useLevelData.ts
   - Redeploy frontend
   - System falls back to template amounts

2. **Backend Revert:**
   ```bash
   git revert HEAD
   git push
   ```

3. **Database Rollback:**
   - Not needed (no schema changes)
   - User rewards still stored safely

## Success Criteria

✅ All tests pass  
✅ No console errors  
✅ Amounts distribute correctly  
✅ Changes reflect immediately on refresh  
✅ Performance is acceptable  
✅ Multiple users work independently  
✅ Admin panel shows helpful message  
✅ Existing features unaffected  

## Questions or Issues?

If you encounter problems:
1. Check backend logs for distribution calculations
2. Check frontend console for API errors
3. Verify MongoDB has level data with fingerprint nodes
4. Ensure user has network rewards set (or use defaults)
5. Test with a fresh browser session (clear cache)

