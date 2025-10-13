# Withdrawal System Guide

## Overview
The withdrawal system allows users to request funds from their balance. When a withdrawal is requested:
1. The amount is deducted from the user's balance in the database
2. An email notification is sent to the admin with withdrawal details
3. The user receives confirmation that their request was submitted

## Setup

### 1. Environment Variables
Copy `.env.development.local.example` to `.env.development.local` and configure:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=Your App Name <your-email@gmail.com>

# Admin email to receive withdrawal notifications
ADMIN_EMAIL=admin@yourdomain.com
```

### 2. Gmail App Password Setup
If using Gmail:
1. Go to your Google Account settings
2. Enable 2-factor authentication
3. Go to Security > App passwords
4. Generate a new app password for "Mail"
5. Use this password as `EMAIL_PASS` in your .env file

## Frontend Components

### WithdrawPopup Component
Located at: `frontend/src/components/WithdrawPopup.tsx`

**Features:**
- Amount input with validation
- Wallet address input
- Real-time balance checking
- Form validation (prevents withdrawal over balance)
- Loading states during submission
- Success/error notifications using toast

**Props:**
```typescript
interface WithdrawPopupProps {
  isOpen: boolean;           // Controls popup visibility
  onClose: () => void;        // Close handler
  currentBalance: number;     // User's current balance
  onSuccess: () => void;      // Called after successful withdrawal
}
```

### UserProfile Integration
The withdraw button is added to the balance card:

```tsx
<Button 
  onClick={() => setShowWithdrawPopup(true)}
  className="w-full bg-green-600 hover:bg-green-700"
>
  <Wallet className="w-4 h-4" />
  Withdraw Funds
</Button>
```

## Backend API

### Withdrawal Endpoint
**URL:** `POST /balance/withdraw`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "amount": 100.50,
  "wallet": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "data": {
    "amount": 100.50,
    "wallet": "0x1234567890abcdef...",
    "remainingBalance": 899.50
  }
}
```

**Error Responses:**
- `400`: Invalid amount, insufficient balance, or missing wallet
- `404`: User not found
- `401`: Unauthorized

### Database Transaction
The withdrawal uses MongoDB transactions to ensure atomicity:
1. Start transaction
2. Find user
3. Validate balance
4. Deduct amount
5. Save user
6. Commit transaction
7. Send email notification (non-blocking)

If any step fails, the transaction is rolled back and the user's balance remains unchanged.

## Email Notification

The admin receives an email with:
- User name and email
- Wallet address
- Withdrawal amount
- Remaining balance after withdrawal
- Timestamp of the request

**Email Template:**
```html
<h2>New Withdrawal Request</h2>
<div>
  <p><strong>User Name:</strong> John Doe</p>
  <p><strong>User Email:</strong> john@example.com</p>
  <p><strong>Wallet Address:</strong> 0x1234...</p>
  <p><strong>Amount:</strong> $100.00</p>
  <p><strong>Remaining Balance:</strong> $899.50</p>
  <p><strong>Date:</strong> 10/6/2025, 10:30:00 AM</p>
</div>
```

## Security Features

1. **Authentication**: Only authenticated users can withdraw
2. **Balance Validation**: Prevents withdrawals exceeding balance
3. **Transaction Safety**: Uses MongoDB transactions for data consistency
4. **Input Validation**: Validates amount and wallet address
5. **Rate Limiting**: Can be added via Arcjet middleware

## User Flow

1. User navigates to Profile page
2. Clicks "Withdraw Funds" button in balance card
3. Popup appears with withdrawal form
4. User enters:
   - Withdrawal amount (validated against current balance)
   - Wallet address
5. User clicks "Submit Request"
6. Frontend validates inputs
7. API call is made to backend
8. Backend:
   - Validates authentication
   - Checks balance
   - Deducts amount from user balance
   - Sends email to admin
   - Returns success response
9. Frontend shows success message
10. Balance is refreshed to show new amount
11. Popup closes

## Testing

### Manual Testing
1. Login to the application
2. Go to Profile page
3. Click "Withdraw Funds"
4. Try various scenarios:
   - Valid withdrawal
   - Amount exceeding balance
   - Empty fields
   - Invalid amounts (negative, zero)

### Test Scenarios
```javascript
// Test 1: Successful withdrawal
POST /balance/withdraw
{
  "amount": 50,
  "wallet": "0xABC123..."
}
// Expected: 200 OK, balance reduced by 50

// Test 2: Insufficient balance
POST /balance/withdraw
{
  "amount": 10000,
  "wallet": "0xABC123..."
}
// Expected: 400 Bad Request, "Insufficient balance"

// Test 3: Invalid amount
POST /balance/withdraw
{
  "amount": -10,
  "wallet": "0xABC123..."
}
// Expected: 400 Bad Request, "Invalid withdrawal amount"

// Test 4: Missing wallet
POST /balance/withdraw
{
  "amount": 50
}
// Expected: 400 Bad Request, "Wallet address is required"
```

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify Gmail app password (not regular password)
3. Check EMAIL_HOST and EMAIL_PORT settings
4. Look for error logs in console
5. Note: Email failure won't prevent withdrawal (by design)

### Withdrawal Not Processing
1. Check user is authenticated (valid token)
2. Verify MongoDB connection
3. Check user has sufficient balance
4. Look for transaction errors in logs
5. Verify balance route is mounted in app.js

### Frontend Issues
1. Check proxy is configured in vite.config.ts
2. Verify token is stored in localStorage
3. Check browser console for errors
4. Ensure WithdrawPopup is imported correctly

## Future Enhancements

1. **Withdrawal History**: Track all withdrawal requests
2. **Status Tracking**: Add pending/approved/rejected states
3. **Admin Dashboard**: Interface to manage withdrawal requests
4. **Automatic Processing**: Integrate with payment gateway
5. **Withdrawal Limits**: Add daily/weekly limits
6. **Confirmation Emails**: Send email to user as well
7. **Fee Calculation**: Add withdrawal fees if needed
8. **Multiple Wallets**: Support different crypto wallets

