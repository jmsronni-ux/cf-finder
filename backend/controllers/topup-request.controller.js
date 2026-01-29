import mongoose from 'mongoose';
import TopupRequest from '../models/topup-request.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { sendTopupRequestSubmittedEmail, sendTopupRequestApprovedEmail, sendTopupRequestRejectedEmail } from '../services/email.service.js';
import { sendTopupNotification } from '../services/telegram.service.js';
import { paymentGatewayService } from '../services/payment-gateway.service.js';
import { convertFromUSD, getConversionRates } from '../utils/crypto-conversion.js';

// User creates a top-up request
export const createTopupRequest = async (req, res, next) => {
    try {
        const { amount, cryptocurrency } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Invalid amount');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const topupRequest = await TopupRequest.create({
            userId,
            amount,
            cryptocurrency: cryptocurrency || 'BTC'
        });

        // Send confirmation email to user
        sendTopupRequestSubmittedEmail(
            user.email,
            user.name,
            amount,
            cryptocurrency || 'BTC',
            topupRequest._id
        ).catch(err => console.error('Failed to send topup request submitted email:', err));

        // Send Telegram notification to admin
        sendTopupNotification(user, topupRequest).catch(err => console.error('Failed to send Telegram topup notification:', err));

        res.status(201).json({
            success: true,
            message: 'Top-up request created successfully',
            data: topupRequest
        });
    } catch (error) {
        next(error);
    }
};

// Get all top-up requests (admin only)
export const getAllTopupRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
        const search = (req.query.search || '').trim();

        const filter = {};
        if (status) {
            filter.status = status;
        }

        if (req.user.isSubAdmin) {
            const managedUsers = await User.find({ managedBy: req.user._id }).select('_id');
            const managedUserIds = managedUsers.map(u => u._id);

            if (filter.userId && filter.userId.$in) {
                const existingIds = filter.userId.$in;
                filter.userId.$in = existingIds.filter(id => managedUserIds.some(mId => mId.equals(id)));
            } else {
                filter.userId = { $in: managedUserIds };
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const matchedUsers = await User.find({
                $or: [{ name: searchRegex }, { email: searchRegex }]
            }).select('_id');
            const userIds = matchedUsers.map(user => user._id);

            filter.$or = [
                { userId: { $in: userIds } }
            ];

            if (mongoose.Types.ObjectId.isValid(search)) {
                filter.$or.push({ _id: search });
            }
        }

        const total = await TopupRequest.countDocuments(filter);
        const requests = await TopupRequest.find(filter)
            .populate('userId', 'name email balance tier phone')
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get user's own top-up requests
export const getMyTopupRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const requests = await TopupRequest.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Approve top-up request (admin only)
export const approveTopupRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { approvedAmount } = req.body;
        const adminId = req.user._id;

        const topupRequest = await TopupRequest.findById(requestId).populate('userId');

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        if (topupRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${topupRequest.status}`);
        }

        // Determine the amount to add (use approvedAmount if provided, otherwise use original amount)
        const amountToAdd = approvedAmount !== undefined && approvedAmount !== null
            ? Number(approvedAmount)
            : topupRequest.amount;

        // Validate the approved amount
        if (amountToAdd < 0) {
            throw new ApiError(400, 'Approved amount cannot be negative');
        }

        // Update user balance
        const user = await User.findById(topupRequest.userId._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        user.balance += amountToAdd;
        await user.save();

        // Update request status
        topupRequest.status = 'approved';
        topupRequest.processedAt = new Date();
        topupRequest.processedBy = adminId;
        topupRequest.approvedAmount = amountToAdd;
        await topupRequest.save();

        // Send email notification to user
        sendTopupRequestApprovedEmail(
            user.email,
            user.name,
            amountToAdd,
            topupRequest.cryptocurrency,
            user.balance,
            topupRequest._id
        ).catch(err => console.error('Failed to send topup request approved email:', err));

        res.status(200).json({
            success: true,
            message: 'Top-up request approved successfully',
            data: {
                request: topupRequest,
                newBalance: user.balance
            }
        });
    } catch (error) {
        next(error);
    }
};

// Reject top-up request (admin only)
export const rejectTopupRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { notes } = req.body;
        const adminId = req.user._id;

        const topupRequest = await TopupRequest.findById(requestId).populate('userId');

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        if (topupRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${topupRequest.status}`);
        }

        topupRequest.status = 'rejected';
        topupRequest.processedAt = new Date();
        topupRequest.processedBy = adminId;
        if (notes) {
            topupRequest.notes = notes;
        }
        await topupRequest.save();

        // Send email notification to user
        if (topupRequest.userId) {
            const user = await User.findById(topupRequest.userId._id);
            if (user) {
                sendTopupRequestRejectedEmail(
                    user.email,
                    user.name,
                    topupRequest.amount,
                    topupRequest.cryptocurrency,
                    topupRequest._id,
                    notes || ''
                ).catch(err => console.error('Failed to send topup request rejected email:', err));
            }
        }

        res.status(200).json({
            success: true,
            message: 'Top-up request rejected',
            data: topupRequest
        });
    } catch (error) {
        next(error);
    }
};

// Create a top-up request with automated payment (generates payment address)
export const createTopupRequestWithPayment = async (req, res, next) => {
    try {
        const { amount, cryptocurrency, amountType } = req.body;
        const userId = req.user._id;

        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Invalid amount');
        }

        // BTC, ETH, BCY (BlockCypher test), and BETH (BlockCypher Ethereum test) are supported for automated payments
        const crypto = (cryptocurrency || 'BTC').toUpperCase();
        if (!['BTC', 'ETH', 'BCY', 'BETH'].includes(crypto)) {
            throw new ApiError(400, 'Only BTC, ETH, BCY, and BETH are supported for automated payments');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        // Check if payment gateway is available
        const isAvailable = await paymentGatewayService.isAvailable();
        if (!isAvailable) {
            throw new ApiError(503, 'Payment gateway is currently unavailable. Please try again later.');
        }

        // Get current conversion rates
        const conversionRates = await getConversionRates();

        let cryptoAmount;
        let usdAmount;

        // Determine if amount is in USD or crypto based on amountType
        // Default to 'usd' for backward compatibility
        const inputType = (amountType || 'usd').toLowerCase();

        if (inputType === 'crypto') {
            // User provided crypto amount
            cryptoAmount = amount;
            // Convert crypto to USD for record keeping
            const { convertToUSD } = await import('../utils/crypto-conversion.js');
            usdAmount = convertToUSD(cryptoAmount, crypto, conversionRates);
        } else {
            // User provided USD amount (default)
            usdAmount = amount;
            // Convert USD to crypto amount
            cryptoAmount = convertFromUSD(usdAmount, crypto, conversionRates);

            if (!cryptoAmount || cryptoAmount <= 0) {
                throw new ApiError(400, `Unable to convert ${usdAmount} USD to ${crypto}. Please try again later.`);
            }
        }

        // Create payment session with the payment gateway
        console.log(`[TopupRequest] Creating payment session - Chain: ${crypto}, Amount: ${cryptoAmount} ${crypto} ($${usdAmount.toFixed(2)} USD), User: ${userId}`);
        const paymentSession = await paymentGatewayService.createPaymentSession(
            userId.toString(),
            crypto,
            cryptoAmount,  // Send cryptocurrency amount
            {
                userEmail: user.email,
                userName: user.name,
                amountUSD: usdAmount  // USD value at time of request
            }
        );

        if (!paymentSession.success) {
            throw new ApiError(500, paymentSession.error || 'Failed to create payment session');
        }

        // Get required confirmations for this crypto
        const requiredConfirmations = paymentGatewayService.getRequiredConfirmations(crypto);

        // Create the topup request in database with payment session details
        const topupRequest = await TopupRequest.create({
            userId,
            amount: usdAmount,  // Store USD amount for balance calculations
            cryptoAmount: cryptoAmount, // Store the exact crypto amount
            cryptocurrency: crypto,
            paymentSessionId: paymentSession.sessionId,
            paymentAddress: paymentSession.paymentAddress,
            paymentStatus: 'pending',
            requiredConfirmations,
            paymentExpiresAt: paymentSession.expiresAt ? new Date(paymentSession.expiresAt) : null
        });

        console.log(`[TopupRequest] Topup request created with payment - Chain: ${crypto}, CryptoAmount: ${cryptoAmount}, USDAmount: ${usdAmount}, RequestId: ${topupRequest._id}, SessionId: ${paymentSession.sessionId}`);

        // Send confirmation email to user (optional - can be disabled for automated flow)
        sendTopupRequestSubmittedEmail(
            user.email,
            user.name,
            usdAmount,
            crypto,
            topupRequest._id
        ).catch(err => console.error('Failed to send topup request submitted email:', err));

        res.status(201).json({
            success: true,
            message: 'Payment address generated successfully',
            data: {
                requestId: topupRequest._id,
                sessionId: paymentSession.sessionId,
                paymentAddress: paymentSession.paymentAddress,
                cryptocurrency: crypto,
                cryptoAmount: cryptoAmount,
                usdAmount: usdAmount,
                paymentStatus: 'pending',
                requiredConfirmations,
                expiresAt: paymentSession.expiresAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get payment status for a topup request
export const getPaymentStatus = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const topupRequest = await TopupRequest.findOne({
            _id: requestId,
            userId
        });

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        // If there's a payment session, get the latest status from the gateway
        if (topupRequest.paymentSessionId) {
            const sessionStatus = await paymentGatewayService.getSessionStatus(topupRequest.paymentSessionId);

            if (sessionStatus.success && sessionStatus.session) {
                const session = sessionStatus.session;

                // Update local record if status has changed
                if (session.status !== topupRequest.paymentStatus ||
                    session.confirmations !== topupRequest.confirmations) {
                    topupRequest.paymentStatus = session.status;
                    topupRequest.confirmations = session.confirmations || 0;
                    if (session.txHash) {
                        topupRequest.txHash = session.txHash;
                    }
                    await topupRequest.save();
                }

                // Check if payment should be auto-approved:
                // 1. Session status is 'confirmed' or 'completed', OR
                // 2. Confirmations >= required confirmations (regardless of status)
                const sessionConfirmations = session.confirmations || 0;
                const requiredConfirmations = topupRequest.requiredConfirmations || 1;
                const hasEnoughConfirmations = sessionConfirmations >= requiredConfirmations;
                const isConfirmedStatus = ['confirmed', 'completed'].includes(session.status);

                // Auto-approve if confirmed OR has enough confirmations
                if ((isConfirmedStatus || hasEnoughConfirmations) && topupRequest.status !== 'approved') {
                    const user = await User.findById(topupRequest.userId);
                    if (user) {
                        // Use the received amount from payment gateway if available, otherwise use the requested amount
                        // Payment gateway may return receivedAmount, amountReceived, or value in USD
                        const receivedAmountUSD = session.receivedAmountUSD || session.amountUSD || session.valueUSD;
                        const paymentAmount = receivedAmountUSD && receivedAmountUSD > 0
                            ? receivedAmountUSD
                            : topupRequest.amount;

                        console.log(`[TopupRequest] Auto-approval - Requested: $${topupRequest.amount}, Gateway receivedAmountUSD: ${receivedAmountUSD}, Using: $${paymentAmount}`);

                        // Update user balance
                        user.balance += paymentAmount;
                        await user.save();

                        // Update topup request status
                        topupRequest.status = 'approved';
                        topupRequest.processedAt = new Date();
                        topupRequest.approvedAmount = paymentAmount;
                        topupRequest.notes = `Auto-approved by payment gateway (TX: ${session.txHash || topupRequest.txHash || 'N/A'}, Confirmations: ${sessionConfirmations}/${requiredConfirmations}, Amount: $${paymentAmount.toFixed(2)})`;
                        await topupRequest.save();

                        console.log(`[TopupRequest] Payment confirmed - Auto-approved topup request ${topupRequest._id}, User: ${user._id}, Amount: ${paymentAmount}, New balance: ${user.balance}, Confirmations: ${sessionConfirmations}/${requiredConfirmations}`);

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
            }
        }

        // Also check local confirmation count in case payment gateway session wasn't available
        // This handles the case where confirmations were updated but status wasn't
        if (topupRequest.status !== 'approved' && topupRequest.confirmations >= (topupRequest.requiredConfirmations || 1)) {
            const user = await User.findById(topupRequest.userId);
            if (user) {
                const paymentAmount = topupRequest.amount;

                // Update user balance
                user.balance += paymentAmount;
                await user.save();

                // Update topup request status
                topupRequest.status = 'approved';
                topupRequest.processedAt = new Date();
                topupRequest.approvedAmount = paymentAmount;
                topupRequest.notes = `Auto-approved based on confirmation count (TX: ${topupRequest.txHash || 'N/A'}, Confirmations: ${topupRequest.confirmations}/${topupRequest.requiredConfirmations})`;
                await topupRequest.save();

                console.log(`[TopupRequest] Payment confirmed (local check) - Auto-approved topup request ${topupRequest._id}, User: ${user._id}, Amount: ${paymentAmount}, New balance: ${user.balance}`);

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

        // Check for timeout: if 1 hour passed since creation with 0 confirmations, mark as expired
        // This allows admin to manually review the request
        const confirmations = topupRequest.confirmations || 0;
        const createdAt = new Date(topupRequest.createdAt);
        const timeoutAt = new Date(createdAt.getTime() + 60 * 60 * 1000); // 1 hour after creation
        const isTimedOut = new Date() > timeoutAt && confirmations === 0 && topupRequest.paymentStatus === 'pending';

        if (isTimedOut && topupRequest.paymentStatus !== 'expired') {
            topupRequest.paymentStatus = 'expired';
            topupRequest.notes = 'Payment session timed out (1 hour with no confirmations) - awaiting manual review';
            await topupRequest.save();
            console.log(`[TopupRequest] Payment session timed out - Request ${topupRequest._id}, User: ${topupRequest.userId}, Created: ${createdAt.toISOString()}`);
        }

        res.status(200).json({
            success: true,
            data: {
                requestId: topupRequest._id,
                status: topupRequest.status,
                paymentStatus: topupRequest.paymentStatus,
                paymentAddress: topupRequest.paymentAddress,
                cryptocurrency: topupRequest.cryptocurrency,
                amount: topupRequest.amount,
                cryptoAmount: topupRequest.cryptoAmount,
                approvedAmount: topupRequest.approvedAmount,
                confirmations: topupRequest.confirmations || 0,
                requiredConfirmations: topupRequest.requiredConfirmations,
                txHash: topupRequest.txHash,
                createdAt: topupRequest.createdAt,
                expiresAt: topupRequest.paymentExpiresAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// Cancel a payment session (user initiated)
export const cancelPaymentSession = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const topupRequest = await TopupRequest.findOne({
            _id: requestId,
            userId
        });

        if (!topupRequest) {
            throw new ApiError(404, 'Top-up request not found');
        }

        // Can only cancel pending payments
        if (topupRequest.status !== 'pending' ||
            !['pending', 'detected'].includes(topupRequest.paymentStatus)) {
            throw new ApiError(400, 'Cannot cancel this payment - it may already be processing');
        }

        // Cancel the session in the payment gateway
        if (topupRequest.paymentSessionId) {
            await paymentGatewayService.cancelSession(topupRequest.paymentSessionId);
        }

        // Update the topup request
        topupRequest.status = 'rejected';
        topupRequest.paymentStatus = 'expired';
        topupRequest.notes = 'Cancelled by user';
        topupRequest.processedAt = new Date();
        await topupRequest.save();

        res.status(200).json({
            success: true,
            message: 'Payment cancelled successfully'
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createTopupRequest,
    getAllTopupRequests,
    getMyTopupRequests,
    approveTopupRequest,
    rejectTopupRequest,
    createTopupRequestWithPayment,
    getPaymentStatus,
    cancelPaymentSession
};



