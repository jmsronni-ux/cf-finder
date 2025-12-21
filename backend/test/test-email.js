// Email Configuration Test Script
// Run with: node test-email.js

import { testEmailConnection, sendLoginCredentials } from '../services/email.service.js';

console.log('🔧 Testing Email Configuration...\n');

// Test 1: Connection Test
console.log('1. Testing SMTP connection...');
try {
    const connectionResult = await testEmailConnection();
    if (connectionResult) {
        console.log('✅ SMTP connection successful!\n');
        
        // Test 2: Send Test Email (uncomment to test actual sending)
        /*
        console.log('2. Sending test email...');
        try {
            const emailResult = await sendLoginCredentials(
                'test@example.com', // Replace with your email
                'Test User',
                'TestPassword123!'
            );
            console.log('✅ Test email sent successfully!');
            console.log('Message ID:', emailResult.messageId);
        } catch (emailError) {
            console.log('❌ Test email failed:', emailError.message);
        }
        */
        
    } else {
        console.log('❌ SMTP connection failed!');
        console.log('\n🔍 Troubleshooting:');
        console.log('- Check your EMAIL_HOST and EMAIL_PORT in .env file');
        console.log('- Verify EMAIL_USER and EMAIL_PASS are correct');
        console.log('- For Gmail, make sure you\'re using App Password, not regular password');
        console.log('- Ensure 2-Factor Authentication is enabled for Gmail');
    }
} catch (error) {
    console.log('❌ Error testing email configuration:', error.message);
    console.log('\n🔍 Check your .env file configuration:');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_USER=your_email@gmail.com');
    console.log('EMAIL_PASS=your_app_password');
    console.log('EMAIL_FROM=CFinder <your_email@gmail.com>');
}

console.log('\n📧 Email setup complete!');
console.log('Your bulk user creation endpoints are ready to use.');


