import fetch from 'node-fetch';

/**
 * Script to test the AI Assistant Data endpoint
 * 
 * Usage:
 * 1. Log in to the web app
 * 2. Copy the token from LocalStorage
 * 3. Run: TOKEN="your_token" node test-webhook.js
 */

const TOKEN = process.env.TOKEN;
const URL = 'http://localhost:5000/api/user/me/ai-assistant-data'; // Use localhost for local testing

if (!TOKEN) {
    console.error('ERROR: Please provide a TOKEN environment variable.');
    console.log('Usage: TOKEN="your_jwt_token" node test-webhook.js');
    process.exit(1);
}

async function testWebhook() {
    console.log(`Testing endpoint: ${URL}`);
    console.log(`Using Token: Bearer ${TOKEN.substring(0, 10)}...`);

    try {
        const response = await fetch(URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCCESS!');
            console.log('Response status:', response.status);
            console.log('Data received:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ FAILED');
            console.log('Response status:', response.status);
            console.log('Error message:', data.message || data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ CONNECTION ERROR:', error.message);
    }
}

testWebhook();
