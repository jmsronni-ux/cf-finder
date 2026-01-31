import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config/env.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

const BOT_TOKEN = TELEGRAM_BOT_TOKEN;
const GLOBAL_CHAT_ID = TELEGRAM_CHAT_ID;

let bot = null;

if (BOT_TOKEN) {
    try {
        bot = new TelegramBot(BOT_TOKEN, { polling: true });
        console.log('Telegram Bot initialized in polling mode');

        // Handle incoming messages for "Handshake"
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text ? msg.text.trim() : '';

            // 1. Check if the message is a potential User ID (System ID)
            if (mongoose.Types.ObjectId.isValid(text)) {
                try {
                    // 2. Search for the user with this ID
                    const user = await User.findById(text);

                    if (user) {
                        // 3. Update the user with this Chat ID
                        user.telegramChatId = chatId.toString();
                        await user.save();

                        bot.sendMessage(chatId, `✅ <b>Connected Successfully!</b>\n\nHello ${user.name}, you will now receive notifications for users you manage directly in this chat.`, { parse_mode: 'HTML' });
                        console.log(`Subadmin ${user.name} (${user._id}) connected with Telegram Chat ID: ${chatId}`);
                    } else {
                        bot.sendMessage(chatId, '❌ <b>User Not Found</b>\n\nThe ID you sent does not exist in our system. Please check your "Account ID" in the admin panel.', { parse_mode: 'HTML' });
                    }
                } catch (error) {
                    console.error('Error in Telegram handshake:', error);
                    bot.sendMessage(chatId, '❌ <b>Error</b>\n\nAn internal error occurred while connecting. Please try again later.', { parse_mode: 'HTML' });
                }
            } else {
                // If not an ID, send help text
                bot.sendMessage(chatId, 'ℹ️ <b>Connect Your Account</b>\n\nTo receive notifications here, please send your <b>System ID</b> (User ID).\n\nYou can find this in the Admin Panel / User Profile.', { parse_mode: 'HTML' });
            }
        });

        bot.on('polling_error', (error) => {
            console.error('Telegram Polling Error:', error.code, error.message);
        });

    } catch (error) {
        console.error('Failed to initialize Telegram Bot:', error);
    }
} else {
    console.warn('Telegram Bot Token not configured. Notifications will be skipped.');
}


/**
 * Generic function to send a message to a specific chat or the global admin
 * @param {string} text - The message to send
 * @param {string} [targetUserId] - Optional: The ID of the subadmin who manages this user
 * @returns {Promise<boolean>} - Success of the operation
 */
export const sendNotification = async (text, targetUserId = null) => {
    if (!bot) {
        return false;
    }

    try {
        let sentToSubadmin = false;

        // 1. Try to send to the specific subadmin if targetUserId is provided
        if (targetUserId) {
            try {
                const subadmin = await User.findById(targetUserId);
                if (subadmin && subadmin.telegramChatId) {
                    await bot.sendMessage(subadmin.telegramChatId, text, { parse_mode: 'HTML' });
                    sentToSubadmin = true;
                }
            } catch (err) {
                console.error(`Failed to send to subadmin ${targetUserId}:`, err);
            }
        }

        // 2. Always send to Global Admin (Backup / Oversight) if configured
        // You can remove this 'if' block if you ONLY want subadmin to receive it when a subadmin exists.
        // For now, we keep it as a safety net.
        /* 
        if (GLOBAL_CHAT_ID) {
             await bot.sendMessage(GLOBAL_CHAT_ID, text, { parse_mode: 'HTML' });
        } 
        */

        // MODIFIED LOGIC: If sent to subadmin, maybe don't send to global?
        // OR: Always send to global. Let's stick to the plan: "Maintain fallback/parallel notification"
        // Let's make it exclusive for now based on user request "get notifications ONLY for users that connect to him"
        // But we probably still want Global Admin to see unmanaged users?

        if (GLOBAL_CHAT_ID) {
            // If we didn't send to a subadmin, OR if we want global admin to see everything
            // Let's send to Global Admin ALWAYS for safety unless explicitly told otherwise.
            // Re-reading request: "get notifications only for users that connect to him". 
            // This implies the SUBADMIN sees ONLY theirs. It doesn't prohibit Global Admin from seeing everything.
            await bot.sendMessage(GLOBAL_CHAT_ID, text, { parse_mode: 'HTML' });
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
export const sendRegistrationNotification = async (request, managedBy = null) => {
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
    return sendNotification(message, managedBy);
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
    return sendNotification(message, user.managedBy);
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
    return sendNotification(message, user.managedBy);
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
    return sendNotification(message, user.managedBy);
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
    return sendNotification(message, user.managedBy);
};

export default {
    sendNotification,
    sendRegistrationNotification,
    sendTopupNotification,
    sendTierNotification,
    sendWithdrawNotification,
    sendWalletVerificationNotification
};
