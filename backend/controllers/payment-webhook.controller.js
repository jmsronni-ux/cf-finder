import User from "../models/user.model.js";
import TopupRequest from "../models/topup-request.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { WEBHOOK_SECRET } from "../config/env.js";

export const handlePaymentWebhook = async (req, res, next) => {
    try {
        const { secret, userId, fromAddress, amount, cryptocurrency, transactionHash } = req.body;

        // Security check
        if (!WEBHOOK_SECRET) {
            console.error('WEBHOOK_SECRET is not configured on the server!');
            throw new ApiError(500, 'Webhook security not configured');
        }

        if (secret !== WEBHOOK_SECRET) {
            throw new ApiError(401, 'Unauthorized');
        }

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

        console.log(`Payment processed for user ${userId}: ${amount} ${cryptocurrency}. New balance: ${user.balance}`);

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

export default {
    handlePaymentWebhook
};
