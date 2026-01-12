import fetch from 'node-fetch';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config/env.js';

const BOT_TOKEN = TELEGRAM_BOT_TOKEN;
const CHAT_ID = TELEGRAM_CHAT_ID;

/**
 * Generic function to send a message to Telegram
 * @param {string} text - The message to send
 * @returns {Promise<boolean>} - Success of the operation
 */
export const sendNotification = async (text) => {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('Telegram Bot Token or Chat ID not configured. Notification skipped.');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram API error:', data.description);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to send Telegram notification:', error);
        return false;
    }
};

/**
 * Notify admin about a new registration request
 */
export const sendRegistrationNotification = async (request) => {
    const message = `
🔔 <b>New Registration Request</b>
━━━━━━━━━━━━━━━━━━
👤 <b>Name:</b> ${request.name}
📧 <b>Email:</b> ${request.email}
📱 <b>Phone:</b> ${request.phone}
📅 <b>Time:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
<i>Please review in the admin panel.</i>
    `;
    return sendNotification(message);
};

/**
 * Notify admin about a new top-up request
 */
export const sendTopupNotification = async (user, request) => {
    const message = `
💰 <b>New Top-up Request</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> ${user.name} (${user.email})
💵 <b>Amount:</b> ${request.amount} ${request.cryptocurrency}
🆔 <b>Request ID:</b> <code>${request._id}</code>
📅 <b>Time:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
<i>Please verify the payment in the admin panel.</i>
    `;
    return sendNotification(message);
};

/**
 * Notify admin about a new tier upgrade request
 */
export const sendTierNotification = async (user, request) => {
    const message = `
🚀 <b>New Tier Upgrade Request</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> ${user.name} (${user.email})
🔼 <b>Requested Tier:</b> Tier ${request.requestedTier}
📉 <b>Current Tier:</b> Tier ${request.currentTier}
🆔 <b>Request ID:</b> <code>${request._id}</code>
📅 <b>Time:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
<i>Please review in the admin panel.</i>
    `;
    return sendNotification(message);
};

/**
 * Notify admin about a new withdrawal request
 */
export const sendWithdrawNotification = async (user, request) => {
    const message = `
💸 <b>New Withdrawal Request</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> ${user.name} (${user.email})
💵 <b>Amount:</b> $${request.amount}
🏦 <b>Wallet:</b> <code>${request.walletAddress || 'Balance Add'}</code>
📋 <b>Type:</b> ${request.isDirectBalanceWithdraw ? 'Direct Balance' : 'Network rewards'}
🆔 <b>Request ID:</b> <code>${request._id}</code>
📅 <b>Time:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
<i>Please process in the admin panel.</i>
    `;
    return sendNotification(message);
};

/**
 * Notify admin about a new wallet verification request
 */
export const sendWalletVerificationNotification = async (user, request) => {
    const message = `
🛡️ <b>New Wallet Verification Request</b>
━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> ${user.name} (${user.email})
👛 <b>Wallet:</b> <code>${request.walletAddress}</code>
⛓️ <b>Type:</b> ${request.walletType.toUpperCase()}
🆔 <b>Request ID:</b> <code>${request._id}</code>
📅 <b>Time:</b> ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━
<i>Please verify the blockchain data in the admin panel.</i>
    `;
    return sendNotification(message);
};

export default {
    sendNotification,
    sendRegistrationNotification,
    sendTopupNotification,
    sendTierNotification,
    sendWithdrawNotification,
    sendWalletVerificationNotification
};
