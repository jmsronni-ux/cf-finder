import mongoose from 'mongoose';
import WithdrawRequest from '../models/withdraw-request.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';
import {
    sendWithdrawalRequestCreatedEmail,
    sendWithdrawalRequestApprovedEmail,
    sendWithdrawalRequestRejectedEmail
} from '../services/email.service.js';
import { sendWithdrawNotification } from '../services/telegram.service.js';

// User creates a withdraw request
export const createWithdrawRequest = async (req, res, next) => {
    try {
        const { amount, wallet, networks, networkRewards, withdrawAll, isDirectBalanceWithdraw, addToBalance } = req.body;
        const userId = req.user._id;

        console.log('[Withdraw Request] Creating request:', {
            userId,
            amount,
            wallet: wallet?.substring(0, 20) + '...',
            networks,
            networkRewards,
            withdrawAll,
            isDirectBalanceWithdraw,
            addToBalance
        });

        if (!amount || amount <= 0) {
            throw new ApiError(400, 'Invalid amount');
        }

        // Wallet is only required for direct balance withdrawal, not for network rewards to balance
        if (!isDirectBalanceWithdraw && !addToBalance && (!wallet || !wallet.trim())) {
            throw new ApiError(400, 'Wallet address is required');
        }

        // Check if user has sufficient balance
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        // Handle direct balance withdrawal (no commission)
        if (isDirectBalanceWithdraw) {
            if (user.balance < amount) {
                throw new ApiError(400, `Insufficient balance. Required: $${amount}, Available: $${user.balance}`);
            }

            // Create withdrawal request for admin approval (don't deduct balance yet)
            const withdrawRequest = await WithdrawRequest.create({
                userId,
                amount,
                walletAddress: wallet.trim(),
                networks: [],
                networkRewards: {},
                withdrawAll: false,
                commissionPaid: 0,
                isDirectBalanceWithdraw: true
            });

            console.log('[Direct Balance Withdraw] Request created for admin approval:', withdrawRequest._id);

            // Send email notification to user
            sendWithdrawalRequestCreatedEmail(
                user.email,
                user.name,
                amount,
                wallet.trim(),
                withdrawRequest._id
            ).catch(err => console.error('Failed to send withdrawal request created email:', err));

            // Send Telegram notification to admin
            sendWithdrawNotification(user, withdrawRequest).catch(err => console.error('Failed to send Telegram withdraw notification:', err));

            res.status(201).json({
                success: true,
                message: 'Direct balance withdrawal request created successfully. Awaiting admin approval.',
                data: withdrawRequest
            });
            return;
        }

        // Import conversion utility to calculate USDT value of selected networks
        const { convertToUSDT, fetchConversionRates } = await import('../utils/crypto-conversion.js');

        // Fetch conversion rates from database to ensure accurate conversion (same as frontend)
        const conversionRates = await fetchConversionRates();
        console.log(`[Withdraw Request] Using conversion rates from database:`, conversionRates);

        // Calculate total commission based on selected networks being withdrawn
        let totalCommission = 0;
        let withdrawalValueUSDT = 0;
        const levelsToWithdraw = [1, 2, 3, 4, 5];

        console.log(`[Withdraw Request] Networks being withdrawn:`, networks);
        console.log(`[Withdraw Request] Network rewards being withdrawn:`, networkRewards);
        console.log(`[Withdraw Request] Withdraw all:`, withdrawAll);

        // Calculate the total USDT value of networks being withdrawn using database rates
        if (networkRewards && Object.keys(networkRewards).length > 0) {
            for (const [network, amount] of Object.entries(networkRewards)) {
                const usdtValue = convertToUSDT(amount, network, conversionRates);
                withdrawalValueUSDT += usdtValue;
                console.log(`[Withdraw Request] ${network}: ${amount} (using rate ${conversionRates[network]}) = ${usdtValue} USDT`);
            }
        }

        console.log(`[Withdraw Request] Total withdrawal value: $${withdrawalValueUSDT} USDT`);

        // Calculate commission strictly from selected networks and user's current tier commission percent
        const currentTier = user.tier || 1;
        const commissionPercent = user[`lvl${currentTier}Commission`] || 0;
        totalCommission = (withdrawalValueUSDT * commissionPercent) / 100;
        console.log(`[Withdraw Request] Commission: ${commissionPercent}% of $${withdrawalValueUSDT} = $${totalCommission}`);
        console.log(`[Withdraw Request] User balance: $${user.balance}`);

        // Check if user has enough balance to pay commission
        if (user.balance < totalCommission) {
            throw new ApiError(400, `Insufficient balance to pay commission. Required: $${totalCommission}, Available: $${user.balance}`);
        }

        // Deduct commission from user balance
        user.balance -= totalCommission;

        // If addToBalance is true, add network rewards to user balance instead of direct withdrawal
        if (addToBalance) {
            user.balance += withdrawalValueUSDT;
            console.log(`[Withdraw Request] Network rewards added to balance: $${withdrawalValueUSDT}`);

            // Note: We no longer reset network rewards in user model
            // Withdrawn networks are tracked via WithdrawRequest model only
            console.log(`[Withdraw Request] Withdrawn networks tracked via WithdrawRequest model: ${networks.join(', ')}`);
        }

        await user.save();

        console.log(`[Withdraw Request] Commission deducted: $${totalCommission}`);
        console.log(`[Withdraw Request] New balance: $${user.balance}`);

        const withdrawRequest = await WithdrawRequest.create({
            userId,
            amount: addToBalance ? withdrawalValueUSDT : amount, // Store the actual withdrawal value
            walletAddress: addToBalance ? '' : (wallet?.trim() || ''), // If adding to balance, no wallet needed
            networks: networks || [],
            level: user.tier || 1, // Track which level this withdrawal is from
            networkRewards: networkRewards || {},
            withdrawAll: withdrawAll || false,
            commissionPaid: totalCommission,
            addToBalance: addToBalance || false,
            networkRewardsAddedToBalance: addToBalance ? withdrawalValueUSDT : 0,
            status: addToBalance ? 'approved' : 'pending' // Auto-approve when adding to balance
        });

        console.log('[Withdraw Request] Created successfully:', withdrawRequest._id);

        // Send email notification to user (only if not adding to balance, as those are auto-approved)
        if (!addToBalance) {
            sendWithdrawalRequestCreatedEmail(
                user.email,
                user.name,
                addToBalance ? withdrawalValueUSDT : amount,
                wallet?.trim() || '',
                withdrawRequest._id
            ).catch(err => console.error('Failed to send withdrawal request created email:', err));

            // Send Telegram notification to admin
            sendWithdrawNotification(user, withdrawRequest).catch(err => console.error('Failed to send Telegram withdraw notification:', err));
        }

        res.status(201).json({
            success: true,
            message: 'Withdraw request created successfully',
            data: withdrawRequest
        });
    } catch (error) {
        console.error('[Withdraw Request] Error creating request:', error);
        next(error);
    }
};

// Get all withdraw requests (admin only)
export const getAllWithdrawRequests = async (req, res, next) => {
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

            filter.$or.push({ walletAddress: { $regex: searchRegex } });
        }

        const total = await WithdrawRequest.countDocuments(filter);
        const requests = await WithdrawRequest.find(filter)
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
        console.error('[Admin] Error fetching withdraw requests:', error);
        console.error('[Admin] Error stack:', error.stack);
        next(error);
    }
};

// Get user's own withdraw requests
export const getMyWithdrawRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const requests = await WithdrawRequest.find({ userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        next(error);
    }
};

// Get specific withdraw request by ID
export const getWithdrawRequestById = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;
        const isAdmin = req.user.isAdmin;

        const request = await WithdrawRequest.findById(requestId)
            .populate('userId', 'name email balance tier phone')
            .populate('processedBy', 'name email');

        if (!request) {
            throw new ApiError(404, 'Withdraw request not found');
        }

        // Check if user can access this request (either owner or admin)
        if (!isAdmin && request.userId._id.toString() !== userId.toString()) {
            throw new ApiError(403, 'Access denied');
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        next(error);
    }
};

// Approve withdraw request (admin only)
// Admin provides their wallet address and amount for user to send TO
export const approveWithdrawRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { confirmedWallet, confirmedAmount } = req.body;
        const adminId = req.user._id;

        // Validate admin inputs - these are admin's receiving wallet and amount
        if (!confirmedWallet || !confirmedWallet.trim()) {
            throw new ApiError(400, 'Admin receiving wallet address is required');
        }

        if (!confirmedAmount || confirmedAmount <= 0) {
            throw new ApiError(400, 'Amount for user to send must be greater than 0');
        }

        const withdrawRequest = await WithdrawRequest.findById(requestId).populate('userId');

        if (!withdrawRequest) {
            throw new ApiError(404, 'Withdraw request not found');
        }

        if (withdrawRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${withdrawRequest.status}`);
        }

        // Skip balance deduction for addToBalance requests (they're auto-approved and already processed)
        if (withdrawRequest.addToBalance) {
            throw new ApiError(400, 'This request is for adding to balance and is already auto-approved. Cannot manually approve.');
        }

        // Fetch user data to verify they have sufficient balance for when they complete the payment
        const user = await User.findById(withdrawRequest.userId._id);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        // Check balance against the ORIGINAL withdrawal amount (what will be deducted from user)
        const currentBalance = Number(user.balance) || 0;
        const originalWithdrawalAmount = Number(withdrawRequest.amount) || 0;
        const balanceBefore = currentBalance;

        console.log(`[Approve Withdraw] User ${user._id} balance: $${currentBalance}`);
        console.log(`[Approve Withdraw] Original withdrawal amount (will be deducted): $${originalWithdrawalAmount}`);
        console.log(`[Approve Withdraw] Admin confirmed amount (admin receives): $${confirmedAmount}`);

        if (currentBalance < originalWithdrawalAmount) {
            throw new ApiError(400, `User has insufficient balance for withdrawal. Available: $${currentBalance}, Required: $${originalWithdrawalAmount}`);
        }

        // Deduct the ORIGINAL withdrawal amount from user's balance
        const balanceAfter = Math.max(0, currentBalance - originalWithdrawalAmount);
        user.balance = balanceAfter;
        await user.save();

        console.log(`[Approve Withdraw] Balance deducted: $${originalWithdrawalAmount}`);
        console.log(`[Approve Withdraw] Balance after: $${balanceAfter}`);

        // Verify the balance was actually saved
        const verifyUser = await User.findById(user._id);
        const actualBalance = Number(verifyUser.balance) || 0;
        if (Math.abs(actualBalance - balanceAfter) > 0.01) {
            console.error(`[Approve Withdraw] Balance mismatch! Expected: $${balanceAfter}, Actual: $${actualBalance}`);
            verifyUser.balance = balanceAfter;
            await verifyUser.save();
            console.log(`[Approve Withdraw] Balance corrected and saved again`);
        } else {
            console.log(`[Approve Withdraw] Balance verified: $${actualBalance}`);
        }

        // Update request status with admin-confirmed values
        withdrawRequest.status = 'approved';
        withdrawRequest.confirmedWallet = confirmedWallet.trim();
        withdrawRequest.confirmedAmount = confirmedAmount;
        withdrawRequest.processedAt = new Date();
        withdrawRequest.processedBy = adminId;
        await withdrawRequest.save();

        console.log(`[Approve Withdraw] Request ${requestId} approved and balance deducted.`);

        // Send email notification to user
        sendWithdrawalRequestApprovedEmail(
            user.email,
            user.name,
            confirmedAmount,
            confirmedWallet.trim(),
            withdrawRequest._id
        ).catch(err => console.error('Failed to send withdrawal request approved email:', err));

        res.status(200).json({
            success: true,
            message: 'Withdraw request approved successfully. Balance has been deducted.',
            data: {
                request: withdrawRequest,
                newBalance: balanceAfter,
                balanceBefore,
                balanceAfter,
                amountDeducted: originalWithdrawalAmount,
                adminReceives: confirmedAmount
            }
        });
    } catch (error) {
        console.error('[Approve Withdraw] Error:', error);
        next(error);
    }
};

// Reject withdraw request (admin only)
export const rejectWithdrawRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { notes } = req.body;
        const adminId = req.user._id;

        const withdrawRequest = await WithdrawRequest.findById(requestId).populate('userId');

        if (!withdrawRequest) {
            throw new ApiError(404, 'Withdraw request not found');
        }

        if (withdrawRequest.status !== 'pending') {
            throw new ApiError(400, `Request already ${withdrawRequest.status}`);
        }

        withdrawRequest.status = 'rejected';
        withdrawRequest.processedAt = new Date();
        withdrawRequest.processedBy = adminId;
        if (notes) {
            withdrawRequest.notes = notes;
        }
        await withdrawRequest.save();

        // Send email notification to user
        const user = await User.findById(withdrawRequest.userId._id);
        if (user) {
            sendWithdrawalRequestRejectedEmail(
                user.email,
                user.name,
                withdrawRequest.amount,
                withdrawRequest._id,
                notes || ''
            ).catch(err => console.error('Failed to send withdrawal request rejected email:', err));
        }

        res.status(200).json({
            success: true,
            message: 'Withdraw request rejected',
            data: withdrawRequest
        });
    } catch (error) {
        next(error);
    }
};

// Complete withdraw request (user confirms payment sent)
export const completeWithdrawRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id;

        const withdrawRequest = await WithdrawRequest.findById(requestId).populate('userId');

        if (!withdrawRequest) {
            throw new ApiError(404, 'Withdraw request not found');
        }

        // Verify this is the user's own request
        if (withdrawRequest.userId._id.toString() !== userId.toString()) {
            throw new ApiError(403, 'You can only complete your own withdrawal requests');
        }

        if (withdrawRequest.status !== 'approved') {
            throw new ApiError(400, `Cannot complete request with status: ${withdrawRequest.status}. Request must be approved first.`);
        }

        // Fetch fresh user data to ensure we have the latest balance
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        // Deduct the ORIGINAL amount that user requested to withdraw, not the admin's confirmed amount
        const currentBalance = Number(user.balance) || 0;
        const amountToDeduct = Number(withdrawRequest.amount) || 0;
        const balanceBefore = currentBalance;

        console.log(`[Complete Withdraw] User ${user._id} balance before: $${balanceBefore}, deducting original withdrawal amount: $${amountToDeduct}`);
        console.log(`[Complete Withdraw] Admin confirmed amount: $${withdrawRequest.confirmedAmount} (this is what admin receives, not what we deduct)`);

        if (currentBalance < amountToDeduct) {
            throw new ApiError(400, `Insufficient balance. Available: $${currentBalance}, Required: $${amountToDeduct}`);
        }

        // Update user balance (deduct the original withdrawal amount)
        const balanceAfter = Math.max(0, currentBalance - amountToDeduct); // Prevent negative balance

        user.balance = balanceAfter;

        // Save user with balance deduction
        await user.save();
        console.log(`[Complete Withdraw] User ${user._id} balance after: $${balanceAfter}`);

        // Verify the balance was actually saved
        const verifyUser = await User.findById(user._id);
        const actualBalance = Number(verifyUser.balance) || 0;
        if (Math.abs(actualBalance - balanceAfter) > 0.01) {
            console.error(`[Complete Withdraw] Balance mismatch! Expected: $${balanceAfter}, Actual: $${actualBalance}`);
            // Retry the save with explicit balance update
            verifyUser.balance = balanceAfter;
            await verifyUser.save();
            console.log(`[Complete Withdraw] Balance corrected and saved again`);
        } else {
            console.log(`[Complete Withdraw] Balance verified: $${actualBalance}`);
        }

        // Update request status to completed
        withdrawRequest.status = 'completed';
        await withdrawRequest.save();

        // Get final verified balance
        const finalUser = await User.findById(user._id);
        const finalBalance = Number(finalUser.balance) || 0;

        console.log(`[Complete Withdraw] Request ${requestId} completed. Balance deducted: $${amountToDeduct}`);
        console.log(`[Complete Withdraw] Final balance: $${finalBalance}`);

        res.status(200).json({
            success: true,
            message: 'Withdrawal completed successfully. Balance has been deducted.',
            data: {
                request: withdrawRequest,
                newBalance: finalBalance,
                balanceBefore,
                balanceAfter,
                amountDeducted: amountToDeduct
            }
        });
    } catch (error) {
        console.error('[Complete Withdraw] Error:', error);
        next(error);
    }
};


export default {
    createWithdrawRequest,
    getAllWithdrawRequests,
    getMyWithdrawRequests,
    approveWithdrawRequest,
    completeWithdrawRequest,
    rejectWithdrawRequest
};
