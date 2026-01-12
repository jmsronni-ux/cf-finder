import { sendNotification } from '../services/telegram.service.js';

async function test() {
    console.log('Testing Telegram Notification...');
    const result = await sendNotification('🚀 <b>Test Notification</b> from your CF Website!');

    if (result) {
        console.log('✅ Test notification sent successfully!');
    } else {
        console.log('❌ Test notification failed. Check if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in .env');
    }
}

test();
