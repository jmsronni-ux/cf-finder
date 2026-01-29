import User from "../models/user.model.js";
import TopupRequest from "../models/topup-request.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { WEBHOOK_SECRET } from "../config/env.js";
import { sendTopupRequestApprovedEmail } from "../services/email.service.js";

export const handlePaymentWebhook = async (req, res, next) => {
    try {
        const { 
            secret, 
            userId, 
            fromAddress, 
            amount, 
            cryptocurrency, 
            transactionHash,
            // New fields from payment gateway
            sessionId,
            confirmations,
            paymentStatus
        } = req.body;

        // Security check
        if (!WEBHOOK_SECRET) {
            console.error('WEBHOOK_SECRET is not configured on the server!');
            throw new ApiError(500, 'Webhook security not configured');
        }

        if (secret !== WEBHOOK_SECRET) {
            throw new ApiError(401, 'Unauthorized');
        }

        // Handle payment gateway webhook (with sessionId)
        if (sessionId) {
            return await handlePaymentGatewayWebhook(req, res, {
                sessionId,
                userId,
                amount,
                cryptocurrency,
                transactionHash,
                confirmations,
                paymentStatus
            });
        }

        // Legacy webhook handling (without sessionId)
        if ((!userId && !fromAddress) || !amount || !cryptocurrency) {
            throw new ApiError(400, 'Missing required fields');
        }

        let user;
        if (userId) {
            user = await User.findById(userId);
        } else if (fromAddress) {
            // Find user who has this wallet address saved
            const searchAddress = fromAddress.toLowerCase();
            user = await User.findOne({
                $or: [
                    { "wallets.btc": searchAddress },
                    { "wallets.eth": searchAddress },
                    { "wallets.usdtErc20": searchAddress },
                    { "wallets.tron": searchAddress }
                ]
            });
        }

        if (!user) {
            console.log(`User not found for ${userId || fromAddress}`);
            throw new ApiError(404, 'User not found');
        }

        // Try to find a pending topup request for this user with same amount and crypto
        const pendingRequest = await TopupRequest.findOne({
            userId: user._id,
            amount: Number(amount),
            cryptocurrency,
            status: 'pending'
        });

        if (pendingRequest) {
            pendingRequest.status = 'approved';
            pendingRequest.processedAt = new Date();
            pendingRequest.approvedAmount = Number(amount);
            pendingRequest.notes = `Auto-approved by payment backend (TX: ${transactionHash})`;
            await pendingRequest.save();
        }

        // Update user balance
        user.balance += Number(amount);
        await user.save();

        console.log(`[PaymentWebhook] Payment processed - Chain: ${cryptocurrency}, Amount: ${amount}, User: ${userId}, New balance: ${user.balance}`);

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                newBalance: user.balance,
                requestAutoApproved: !!pendingRequest
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handle webhook from payment gateway (with sessionId)
 * This is called when the payment gateway confirms a payment
 */
async function handlePaymentGatewayWebhook(req, res, data) {
    const { sessionId, userId, amount, cryptocurrency, transactionHash, confirmations, paymentStatus } = data;

    console.log(`[PaymentWebhook] Payment gateway webhook received for session ${sessionId}`);
    console.log(`[PaymentWebhook] Chain: ${cryptocurrency}, Amount: ${amount}, Status: ${paymentStatus}, Confirmations: ${confirmations}`);

    // Find the topup request by sessionId
    let topupRequest = await TopupRequest.findOne({ paymentSessionId: sessionId });

    if (!topupRequest) {
        // If no request found by sessionId, try to find by userId and amount (fallback)
        if (userId) {
            topupRequest = await TopupRequest.findOne({
                userId,
                amount: Number(amount),
                cryptocurrency: cryptocurrency?.toUpperCase(),
                status: 'pending'
            });
        }
    }

    if (!topupRequest) {
        console.error(`No topup request found for session ${sessionId} or user ${userId}`);
        // Return success anyway to prevent retries - the payment was received
        return res.status(200).json({
            success: true,
            message: 'Webhook received but no matching topup request found',
            warning: 'Payment may need manual processing'
        });
    }

    // Get the user
    const user = await User.findById(topupRequest.userId);
    if (!user) {
        console.error(`User ${topupRequest.userId} not found for topup request ${topupRequest._id}`);
        return res.status(200).json({
            success: true,
            message: 'Webhook received but user not found',
            warning: 'Payment may need manual processing'
        });
    }

    // Update the topup request with payment status
    topupRequest.paymentStatus = paymentStatus || 'completed';
    topupRequest.confirmations = confirmations || 0;
    if (transactionHash) {
        topupRequest.txHash = transactionHash;
    }

    // If payment is completed, approve the topup request and update balance
    if (paymentStatus === 'completed') {
        // Only process if not already approved
        if (topupRequest.status !== 'approved') {
            // Always credit the requested amount (USD). Webhook 'amount' may be in crypto (e.g. 0.001 BETH),
            // which would show as $0.00 and short the user. User requested $X and sent the payment → credit $X.
            const paymentAmount = topupRequest.amount;
            
            // Update user balance
            user.balance += paymentAmount;
            await user.save();

            // Update topup request status
            topupRequest.status = 'approved';
            topupRequest.processedAt = new Date();
            topupRequest.approvedAmount = paymentAmount;
            topupRequest.notes = `Auto-approved by payment gateway (TX: ${transactionHash || 'N/A'})`;

            console.log(`[PaymentWebhook] Payment completed - Chain: ${cryptocurrency}, Amount: ${paymentAmount}, User: ${user._id}, New balance: ${user.balance}`);

            // Send approval email
            sendTopupRequestApprovedEmail(
                user.email,
                user.name,
                paymentAmount,
                topupRequest.cryptocurrency,
                user.balance,
                topupRequest._id
            ).catch(err => console.error('Failed to send topup approval email:', err));
        }
    }

    await topupRequest.save();

    res.status(200).json({
        success: true,
        message: 'Payment webhook processed successfully',
        data: {
            requestId: topupRequest._id,
            status: topupRequest.status,
            paymentStatus: topupRequest.paymentStatus,
            newBalance: user.balance
        }
    });
}

export default {
    handlePaymentWebhook
};
