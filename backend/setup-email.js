// Email Setup Helper Script
import { config } from 'dotenv';

// Load environment variables
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

console.log('📧 Email Configuration Checker\n');

// Check if environment variables are set
const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
const missingVars = [];

console.log('🔍 Checking environment variables...\n');

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        missingVars.push(varName);
        console.log(`❌ ${varName}: Not set`);
    } else {
        // Mask sensitive data
        const displayValue = varName === 'EMAIL_PASS' ? '***masked***' : value;
        console.log(`✅ ${varName}: ${displayValue}`);
    }
});

if (missingVars.length > 0) {
    console.log(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
    console.log('\n📝 Create or update your .env.development.local file with:');
    console.log(`
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_character_app_password
EMAIL_FROM=CFinder <your_gmail@gmail.com>
    `);
} else {
    console.log('\n✅ All required environment variables are set!');
    
    // Provide Gmail setup instructions
    console.log('\n📋 Gmail Setup Instructions:');
    console.log('1. Go to: https://myaccount.google.com/');
    console.log('2. Click "Security" → "2-Step Verification" (enable if not already)');
    console.log('3. Click "Security" → "App passwords"');
    console.log('4. Select "Mail" and "Other (custom name)"');
    console.log('5. Enter "CFinder App" as the name');
    console.log('6. Copy the 16-character password (like: abcd efgh ijkl mnop)');
    console.log('7. Use this password (without spaces) as EMAIL_PASS');
    console.log('\n🔑 Important: Use App Password, NOT your regular Gmail password!');
}

console.log('\n🚀 Once configured, run: node test-email.js');


