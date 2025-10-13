# Bulk User Creation Setup

## Overview
This feature allows you to create users in bulk from JSON data and automatically send login credentials via email.

## New Endpoints

### 1. Create Multiple Users
**POST** `/bulk-user/bulk-create`

**Request Body:**
```json
{
  "users": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "balance": 100,
      "tier": 1
    },
    {
      "name": "Jane Smith", 
      "email": "jane@example.com",
      "phone": "+0987654321",
      "balance": 50,
      "tier": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 users",
  "data": {
    "totalProcessed": 2,
    "successfullyCreated": 2,
    "failed": 0,
    "createdUsers": [
      {
        "id": "user_id_here",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "balance": 100,
        "tier": 1,
        "emailSent": true
      }
    ],
    "failedUsers": []
  }
}
```

### 2. Create Single User
**POST** `/bulk-user/create`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "balance": 100,
  "tier": 1
}
```

## Email Configuration

Add these environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_FROM=CFinder <noreply@cfinder.com>
```

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" for this application
3. Use the App Password as `EMAIL_PASS` (not your regular password)

### Other Email Providers
- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` with port 587
- **Yahoo**: Use `smtp.mail.yahoo.com` with port 587
- **Custom SMTP**: Configure according to your provider's settings

## Features

### Automatic Password Generation
- Generates secure 12-character passwords with mixed case, numbers, and special characters
- Passwords are hashed using bcrypt before storing in database

### Email Notifications
- Sends professional HTML email with login credentials
- Includes security reminder to change password after first login
- Fallback to plain text if HTML fails

### Error Handling
- Validates all required fields
- Checks for duplicate emails
- Continues processing even if individual users fail
- Provides detailed error reporting

### Transaction Safety
- Uses MongoDB transactions to ensure data consistency
- Rolls back all changes if any critical error occurs

## Testing

### Test Email Connection
You can test your email configuration by calling the email service:

```javascript
import { testEmailConnection } from './utils/email.service.js';

testEmailConnection().then(result => {
  console.log('Email test result:', result);
});
```

### Sample cURL Commands

**Create single user:**
```bash
curl -X POST http://localhost:3000/bulk-user/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "balance": 100
  }'
```

**Create multiple users:**
```bash
curl -X POST http://localhost:3000/bulk-user/bulk-create \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "name": "User 1",
        "email": "user1@example.com",
        "phone": "+1111111111",
        "balance": 50
      },
      {
        "name": "User 2", 
        "email": "user2@example.com",
        "phone": "+2222222222",
        "balance": 75
      }
    ]
  }'
```

## Security Notes

1. **Password Security**: Generated passwords are strong but temporary - users should change them immediately
2. **Email Security**: Use App Passwords for Gmail, not regular passwords
3. **Rate Limiting**: Consider implementing rate limiting for bulk operations
4. **Input Validation**: All inputs are validated and sanitized
5. **Error Information**: Be careful not to expose sensitive information in error messages

## Dependencies Added

- `nodemailer`: For sending emails
- `crypto`: For generating secure random passwords (built-in Node.js module)

