import { sendNotification } from '../services/telegram.service.js';

async function test() {
    console.log('--- Telegram Multi-Notification Test ---');

    console.log('Sending message 1...');
    const result1 = await sendNotification('🧪 <b>Test 1</b>: Multi-notification test');
    if (result1) {
        console.log('✅ Message 1 sent successfully!');
    } else {
        console.error('❌ Message 1 failed.');
    }

    console.log('\nWaiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nSending message 2...');
    const result2 = await sendNotification('🧪 <b>Test 2</b>: Multi-notification test');
    if (result2) {
        console.log('✅ Message 2 sent successfully!');
    } else {
        console.error('❌ Message 2 failed.');
    }

    console.log('\n--- Test Completed ---');
}

test().catch(err => console.error('Test crashed:', err));
