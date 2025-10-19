# Testing Auto Tier Upgrade on Withdrawal

## How to Test the Feature

### Prerequisites
1. User account that is not at max tier (tier < 5)
2. User has sufficient balance to make a withdrawal
3. Admin access to approve withdrawal requests

### Test Scenario 1: Successful Auto Tier Upgrade

**Steps:**
1. Log in as a regular user (not admin)
2. Navigate to Dashboard or Profile
3. Click "Withdraw" button
4. Fill in withdrawal form:
   - Enter amount (less than or equal to balance)
   - Enter wallet address
5. Click "Submit Request"
6. **Keep the popup open** (don't close it)
7. Log in as admin in another browser/tab
8. Go to admin panel → Withdraw Requests
9. Find the pending withdrawal request
10. Approve the request (add admin wallet and confirmed amount)
11. Switch back to user's browser/tab

**Expected Results:**
- Within 3-6 seconds, the popup should change to "Request Approved!" state
- You should see a success toast notification: "🎉 Tier upgrade request for [Next Tier Name] automatically submitted!"
- The popup shows payment instructions
- User can navigate to Profile to see pending tier request status

### Test Scenario 2: User Already at Max Tier

**Steps:**
1. Log in as user with tier 5
2. Complete withdrawal process (steps 1-11 from Scenario 1)

**Expected Results:**
- Withdrawal approval shows success
- NO tier upgrade request is submitted (console shows "User is at max tier or user not found")
- No tier upgrade toast notification appears

### Test Scenario 3: User Already Has Pending Tier Request

**Steps:**
1. Log in as regular user (tier < 5)
2. Manually submit a tier upgrade request from Profile
3. Complete withdrawal process (steps 1-11 from Scenario 1)

**Expected Results:**
- Withdrawal approval shows success
- Tier upgrade is attempted but silently fails (console shows "User already has a pending tier request")
- No error toast shown to user (graceful handling)

### Test Scenario 4: Popup Closed During Pending State

**Steps:**
1. Start withdrawal process
2. Close popup while request is pending
3. Reopen withdraw popup
4. Admin approves the request

**Expected Results:**
- Popup resumes pending state when reopened
- When approved, tier upgrade request is submitted
- Success toast appears

## What to Look For

### Console Logs
- ✅ "User is at max tier or user not found" (if tier 5)
- ✅ "User already has a pending tier request" (if duplicate)
- ✅ Any fetch errors are logged but don't disrupt user experience

### Toast Notifications
- ✅ "Request submitted! Waiting for admin approval..." (withdrawal pending)
- ✅ "🎉 Tier upgrade request for [Tier Name] automatically submitted!" (on approval)
- ✅ No error toasts for tier upgrade failures (graceful)

### User Profile After Test
- Navigate to Profile page
- Check "Tier Status" section
- Should see yellow "Pending Upgrade Request" badge (if successful)
- Request details should show the automatically submitted tier request

## Edge Cases Covered

✅ User at max tier - skips tier upgrade  
✅ Duplicate tier request - silently ignores  
✅ Network errors - logged but not shown to user  
✅ Multiple withdrawals - ref flag prevents duplicates  
✅ Popup close/reopen - state persists correctly  
✅ No next tier available - gracefully skips  

## Success Criteria

The feature is working correctly if:
1. ✅ Tier upgrade request is automatically submitted on withdrawal approval
2. ✅ User sees success notification
3. ✅ No duplicate requests are created
4. ✅ Max tier users don't get tier upgrade attempts
5. ✅ Errors are handled gracefully without disrupting UX
6. ✅ Pending tier request appears in Profile

