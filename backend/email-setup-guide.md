# Email Setup Guide for CFinder

## Quick Gmail Setup (Recommended)

### Step 1: Create Environment File
Create a `.env` file in your project root with:

```env
# Database
MONGO_URI=mongodb://localhost:27017/cfinder

# JWT Configuration  
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=30d

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_character_app_password
EMAIL_FROM=CFinder <your_gmail@gmail.com>
```

### Step 2: Gmail App Password Setup

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/
   - Click on "Security" in the left sidebar

2. **Enable 2-Factor Authentication** (if not already enabled)
   - Click "2-Step Verification"
   - Follow the setup process

3. **Generate App Password**
   - In Security settings, search for "App passwords"
   - Click "App passwords"
   - Select "Mail" and "Other (custom name)"
   - Enter "CFinder App" as the name
   - Copy the 16-character password (format: `abcd efgh ijkl mnop`)
   - Use this password (without spaces) as `EMAIL_PASS`

### Step 3: Test Your Setup

Run this test script to verify your email configuration:

```javascript
// test-email.js
import { testEmailConnection } from './utils/email.service.js';

testEmailConnection().then(result => {
  if (result) {
    console.log('✅ Email configuration is working!');
  } else {
    console.log('❌ Email configuration failed. Check your settings.');
  }
});
```

## Alternative Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your_email@outlook.com
EMAIL_PASS=your_outlook_password
EMAIL_FROM=CFinder <your_email@outlook.com>
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your_email@yahoo.com
EMAIL_PASS=your_yahoo_app_password
EMAIL_FROM=CFinder <your_email@yahoo.com>
```

### Custom SMTP Server
```env
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your_email_password
EMAIL_FROM=CFinder <noreply@yourdomain.com>
```

## Testing Your Setup

### Method 1: Test Email Connection
```bash
node -e "import('./utils/email.service.js').then(m => m.testEmailConnection())"
```

### Method 2: Create Test User
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

## Troubleshooting

### Common Issues:

1. **"Invalid login" error**
   - Make sure you're using App Password for Gmail, not regular password
   - Verify 2FA is enabled

2. **"Connection timeout"**
   - Check firewall settings
   - Verify EMAIL_HOST and EMAIL_PORT are correct

3. **"Authentication failed"**
   - Double-check EMAIL_USER and EMAIL_PASS
   - For Gmail, ensure you're using App Password

4. **"Self signed certificate"**
   - Add this to your transporter config for development:
   ```javascript
   tls: {
     rejectUnauthorized: false
   }
   ```

### Security Notes:
- Never commit your `.env` file to version control
- Use App Passwords instead of regular passwords
- Consider using environment-specific configurations
- For production, use a dedicated email service like SendGrid or Mailgun


