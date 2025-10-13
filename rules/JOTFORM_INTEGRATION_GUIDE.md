# JotForm Integration Guide for Blockchain Analysis

This guide explains how to configure your JotForm to send data to the C-Finder backend API.

## Backend Endpoint

Your backend is now ready to receive JotForm submissions at:
```
POST http://your-domain.com/blockchain-analysis/submit
```

## JotForm Configuration

### 1. Webhook Setup

1. Go to your JotForm form settings
2. Navigate to **Integrations** → **Webhooks**
3. Add a new webhook with the following settings:
   - **Webhook URL**: `http://your-domain.com/blockchain-analysis/submit`
   - **Method**: POST
   - **Content Type**: application/json

### 2. Expected Data Format

The backend expects JotForm data in the following format:

```json
{
  "submissionID": "unique_submission_id",
  "ip": "client_ip_address",
  "created_at": "2024-01-15T10:30:00Z",
  "q1_fullName": "John",
  "q2_fullName": "Doe", 
  "q3_email": "john.doe@example.com",
  "q4_walletName": "Binance",
  "q5_networkType": "ETH (ERC20)",
  "q6_walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "q7_lossValue": "5000",
  "q8_lossDate": "2024-01-15",
  "q9_lossMethod": "Fake website / Phishing link",
  "q10_receivingWallet": "0x1234567890123456789012345678901234567890",
  "q11_transactionReceipts": [
    {
      "name": "receipt.pdf",
      "originalName": "transaction_receipt.pdf",
      "type": "application/pdf",
      "size": 1024000
    }
  ]
}
```

### 3. Field Mapping

| JotForm Field | Backend Field | Required | Description |
|---------------|---------------|----------|-------------|
| q1_fullName | firstName | ✅ | First name |
| q2_fullName | lastName | ✅ | Last name |
| q3_email | email | ✅ | Email address |
| q4_walletName | walletName | ❌ | Wallet name (e.g., Binance, Coinbase) |
| q5_networkType | networkType | ✅ | Network type (BTC, ETH, Other, Unknown) |
| q6_walletAddress | walletAddress | ✅ | Wallet address with suspicious activity |
| q7_lossValue | lossValue | ✅ | Amount lost (numeric) |
| q8_lossDate | lossDate | ✅ | Date of loss (YYYY-MM-DD) |
| q9_lossMethod | lossMethod | ✅ | How funds were lost |
| q10_receivingWallet | receivingWallet | ✅ | Wallet for receiving recovered funds |
| q11_transactionReceipts | transactionReceipts | ❌ | File uploads (array) |

### 4. Response Format

#### Success Response (201)
```json
{
  "success": true,
  "message": "Blockchain analysis request submitted successfully",
  "data": {
    "id": "64f8b2c1a2b3c4d5e6f7g8h9",
    "submissionId": "test_1234567890",
    "status": "submitted",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "userAccount": {
      "created": true,
      "userId": "64f8b2c1a2b3c4d5e6f7g8h8",
      "email": "john.doe@example.com",
      "name": "John Doe"
    }
  }
}
```

#### Error Response (400/409/500)
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## Automatic User Creation

When someone submits the blockchain analysis form:

1. **User Account Creation**: A new user account is automatically created using the form data
2. **Password Generation**: A secure random password is generated
3. **Welcome Email**: Login credentials are sent to the user's email address
4. **Account Linking**: The blockchain analysis request is linked to the user account

### User Account Details:
- **Name**: Combined first and last name from form
- **Email**: Email address from form (used as username)
- **Password**: Auto-generated secure password (sent via email)
- **Phone**: Empty (not provided in form)
- **Balance**: 0 (default)
- **Tier**: 1 (default)

### Email Content:
The welcome email includes:
- Welcome message
- Login credentials (email and password)
- Security reminder to change password
- Instructions to access the platform

## API Endpoints

### Public Endpoints

#### Submit Analysis Request
```
POST /blockchain-analysis/submit
```
- **Authentication**: None required
- **Purpose**: Receive JotForm submissions
- **Body**: JotForm JSON data

### Protected Endpoints (Require Authentication)

#### Get All Requests
```
GET /blockchain-analysis?page=1&limit=10&status=submitted&priority=high
```

#### Get Request by ID
```
GET /blockchain-analysis/:id
```

#### Update Request Status
```
PUT /blockchain-analysis/:id/status
Body: {
  "status": "under_review",
  "priority": "high",
  "internalNote": "Additional notes"
}
```

#### Get Statistics
```
GET /blockchain-analysis/statistics
```

#### Delete Request
```
DELETE /blockchain-analysis/:id
```

## Testing

### 1. Test the Endpoint
Run the test script to verify everything works:
```bash
node test-blockchain-analysis.js
```

### 2. Manual Testing with curl
```bash
curl -X POST http://localhost:3000/blockchain-analysis/submit \
  -H "Content-Type: application/json" \
  -d '{
    "submissionID": "test_123",
    "q1_fullName": "John",
    "q2_fullName": "Doe",
    "q3_email": "john@example.com",
    "q6_walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "q7_lossValue": "1000",
    "q8_lossDate": "2024-01-15",
    "q9_lossMethod": "Fake website / Phishing link",
    "q10_receivingWallet": "0x1234567890123456789012345678901234567890"
  }'
```

## Database Schema

The `BlockchainAnalysis` model includes:

- **Personal Information**: Name, email
- **Wallet Information**: Wallet name, network type, addresses
- **Loss Information**: Value, date, method
- **File Uploads**: Transaction receipts
- **JotForm Metadata**: Submission ID, IP, timestamp
- **Status Tracking**: Status, priority, internal notes
- **Timestamps**: Created/updated dates

## Security Considerations

1. **Rate Limiting**: Consider implementing rate limiting for the public endpoint
2. **Input Validation**: All inputs are validated and sanitized
3. **Duplicate Prevention**: Submissions with the same `submissionID` are rejected
4. **File Upload Security**: File uploads are validated for type and size
5. **IP Logging**: Client IP addresses are logged for security purposes

## Monitoring

Monitor the following:
- Submission success/failure rates
- Response times
- Error patterns
- Duplicate submission attempts
- File upload sizes and types

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your server allows requests from JotForm's domain
2. **Validation Errors**: Check that all required fields are being sent
3. **Duplicate Submissions**: Verify `submissionID` is unique for each submission
4. **File Upload Issues**: Check file size limits and allowed file types

### Logs

Check server logs for:
- Incoming requests
- Validation errors
- Database connection issues
- File upload problems

## Next Steps

1. Configure JotForm webhook with your production URL
2. Test with real form submissions
3. Set up monitoring and alerting
4. Implement admin dashboard for managing submissions
5. Add email notifications for new submissions
