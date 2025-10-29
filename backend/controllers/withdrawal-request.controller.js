import WithdrawalRequest from '../models/withdrawal-request.model.js';
import WithdrawRequest from '../models/withdraw-request.model.js';
import User from '../models/user.model.js';
import NetworkReward from '../models/network-reward.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// Create withdrawal request
export const createWithdrawalRequest = async (req, res, next) => {
  try {
    const { level, networkRewards, isTierUpgradeRequirement = false, targetTier } = req.body;
    const userId = req.user._id;

    // Validation
    if (!level || level < 1 || level > 5) {
      throw new ApiError(400, 'Invalid level. Must be between 1 and 5.');
    }

    if (!networkRewards || typeof networkRewards !== 'object') {
      throw new ApiError(400, 'Network rewards are required.');
    }

    // Get user's rewards for this level (with fallback to global)
    const globalRewards = await NetworkReward.find({ level, isActive: true });
    
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const availableRewards = {};
    let totalAmount = 0;

    // Get user's network rewards from user model
    const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
    const userNetworkRewards = user[levelNetworkRewardsField] || {};

    // Calculate available rewards
    for (const network of networks) {
      const userRewardAmount = userNetworkRewards[network];
      let rewardAmount = 0;

      if (userRewardAmount !== undefined && userRewardAmount > 0) {
        rewardAmount = userRewardAmount;
      } else {
        const globalReward = globalRewards.find(r => r.network === network);
        if (globalReward) {
          rewardAmount = globalReward.rewardAmount;
        }
      }

      availableRewards[network] = rewardAmount;
      totalAmount += rewardAmount;
    }

    // Validate requested amounts don't exceed available
    const requestedNetworks = [];
    let requestedTotal = 0;

    for (const [network, requestedAmount] of Object.entries(networkRewards)) {
      if (!networks.includes(network)) {
        throw new ApiError(400, `Invalid network: ${network}`);
      }

      if (typeof requestedAmount !== 'number' || requestedAmount < 0) {
        throw new ApiError(400, `Invalid amount for ${network}: ${requestedAmount}`);
      }

      if (requestedAmount > availableRewards[network]) {
        throw new ApiError(400, `Requested amount for ${network} (${requestedAmount}) exceeds available (${availableRewards[network]})`);
      }

      if (requestedAmount > 0) {
        requestedNetworks.push({ network, amount: requestedAmount });
        requestedTotal += requestedAmount;
      }
    }

    if (requestedTotal === 0) {
      throw new ApiError(400, 'At least one network reward must be requested.');
    }

    // Check for existing pending requests for this level
    const existingRequest = await WithdrawalRequest.findOne({
      userId,
      level,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      throw new ApiError(400, `You already have a pending withdrawal request for Level ${level}.`);
    }

    // Create withdrawal request
    const withdrawalRequest = await WithdrawalRequest.create({
      userId,
      level,
      networkRewards: new Map(Object.entries(networkRewards)),
      totalAmount: requestedTotal,
      requestedNetworks,
      isTierUpgradeRequirement,
      targetTier: isTierUpgradeRequirement ? targetTier : undefined,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request created successfully',
      data: { withdrawalRequest }
    });

  } catch (error) {
    next(error);
  }
};

// Get user's withdrawal requests
export const getUserWithdrawalRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, level } = req.query;

    let query = { userId };
    if (status) {
      query.status = status;
    }
    if (level) {
      query.level = parseInt(level);
    }

    const requests = await WithdrawalRequest.find(query)
      .sort({ requestedAt: -1 })
      .populate('processedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Withdrawal requests retrieved successfully',
      data: { requests }
    });

  } catch (error) {
    next(error);
  }
};

// Get all withdrawal requests (Admin)
export const getAllWithdrawalRequests = async (req, res, next) => {
  try {
    const { status, level, userId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (level) query.level = parseInt(level);
    if (userId) query.userId = userId;

    const requests = await WithdrawalRequest.find(query)
      .populate('userId', 'name email tier balance')
      .populate('processedBy', 'name email')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WithdrawalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Withdrawal requests retrieved successfully',
      data: {
        requests,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Process withdrawal request (Admin)
export const processWithdrawalRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, adminNotes, rejectionReason } = req.body;
    const adminId = req.user._id;

    if (!['approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Status must be either "approved" or "rejected".');
    }

    const request = await WithdrawalRequest.findById(requestId)
      .populate('userId', 'name email balance');

    if (!request) {
      throw new ApiError(404, 'Withdrawal request not found.');
    }

    if (request.status !== 'pending') {
      throw new ApiError(400, 'Request has already been processed.');
    }

    // Update request
    request.status = status;
    request.processedAt = new Date();
    request.processedBy = adminId;
    request.adminNotes = adminNotes;

    if (status === 'rejected') {
      request.rejectionReason = rejectionReason;
    }

    await request.save();

    // If approved, mark as completed (in real implementation, you'd process the actual withdrawal here)
    if (status === 'approved') {
      request.status = 'completed';
      await request.save();
    }

    res.status(200).json({
      success: true,
      message: `Withdrawal request ${status} successfully`,
      data: { request }
    });

  } catch (error) {
    next(error);
  }
};

// Check if user can upgrade tier (must have withdrawn all rewards)
export const checkTierUpgradeEligibility = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { targetTier } = req.query;

    if (!targetTier || targetTier < 1 || targetTier > 5) {
      throw new ApiError(400, 'Valid target tier is required.');
    }

    const currentTier = req.user.tier || 1;
    const targetTierNum = parseInt(targetTier);

    if (targetTierNum <= currentTier) {
      return res.status(200).json({
        success: true,
        data: {
          eligible: true,
          reason: 'Target tier is not higher than current tier'
        }
      });
    }

    // Check if user has any completed levels without withdrawal requests
    const completedLevels = [];
    for (let level = 1; level <= currentTier; level++) {
      const animField = `lvl${level}anim`;
      if (req.user[animField] === 1) {
        completedLevels.push(level);
      }
    }

    // Check withdrawal requests for completed levels
    const withdrawalRequests = await WithdrawalRequest.find({
      userId,
      level: { $in: completedLevels },
      status: { $in: ['completed'] }
    });

    const levelsWithWithdrawals = withdrawalRequests.map(req => req.level);
    const levelsWithoutWithdrawals = completedLevels.filter(level => !levelsWithWithdrawals.includes(level));

    const eligible = levelsWithoutWithdrawals.length === 0;

    res.status(200).json({
      success: true,
      data: {
        eligible,
        currentTier,
        targetTier: targetTierNum,
        completedLevels,
        levelsWithoutWithdrawals,
        levelsWithWithdrawals,
        reason: eligible 
          ? 'All completed levels have withdrawal requests' 
          : `Must withdraw rewards from levels: ${levelsWithoutWithdrawals.join(', ')}`
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get user's reward summary for withdrawal
export const getUserRewardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { level } = req.query;

    if (!level || level < 1 || level > 5) {
      throw new ApiError(400, 'Valid level is required.');
    }

    const levelNum = parseInt(level);

    // Get user's rewards for this level
    const globalRewards = await NetworkReward.find({ level: levelNum, isActive: true });
    
    // Get user's network rewards from user model
    const levelNetworkRewardsField = `lvl${levelNum}NetworkRewards`;
    const userNetworkRewards = req.user[levelNetworkRewardsField] || {};

    // Check if level is completed
    const animField = `lvl${levelNum}anim`;
    const isCompleted = req.user[animField] === 1;

    if (!isCompleted) {
      throw new ApiError(400, `Level ${levelNum} is not completed yet.`);
    }

    // Check existing withdrawal request
    const existingRequest = await WithdrawalRequest.findOne({
      userId,
      level: levelNum,
      status: { $in: ['pending', 'approved', 'completed'] }
    });

    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const availableRewards = {};

    // Calculate available rewards
    for (const network of networks) {
      const userRewardAmount = userNetworkRewards[network];
      let rewardAmount = 0;

      if (userRewardAmount !== undefined && userRewardAmount > 0) {
        rewardAmount = userRewardAmount;
      } else {
        const globalReward = globalRewards.find(r => r.network === network);
        if (globalReward) {
          rewardAmount = globalReward.rewardAmount;
        }
      }

      availableRewards[network] = rewardAmount;
    }

    const totalRewards = Object.values(availableRewards).reduce((sum, amount) => sum + amount, 0);

    res.status(200).json({
      success: true,
      message: `Reward summary for Level ${levelNum}`,
      data: {
        level: levelNum,
        isCompleted,
        availableRewards,
        totalRewards,
        hasExistingRequest: !!existingRequest,
        existingRequest: existingRequest ? {
          id: existingRequest._id,
          status: existingRequest.status,
          requestedAt: existingRequest.requestedAt
        } : null
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get withdrawal count for a specific level
export const getWithdrawalCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { level } = req.query;

    if (!level || level < 1 || level > 5) {
      throw new ApiError(400, 'Valid level is required.');
    }

    const levelNum = parseInt(level);

    // Get user's network rewards for this level
    const levelNetworkRewardsField = `lvl${levelNum}NetworkRewards`;
    const userNetworkRewards = req.user[levelNetworkRewardsField] || {};

    // Get global rewards as fallback
    const globalRewards = await NetworkReward.find({ level: levelNum, isActive: true });
    
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    
    // Calculate total available networks (those with non-zero rewards)
    let totalAvailableNetworks = 0;
    const availableNetworks = [];

    for (const network of networks) {
      const userRewardAmount = userNetworkRewards[network];
      let rewardAmount = 0;

      if (userRewardAmount !== undefined && userRewardAmount > 0) {
        rewardAmount = userRewardAmount;
      } else {
        const globalReward = globalRewards.find(r => r.network === network);
        if (globalReward) {
          rewardAmount = globalReward.rewardAmount;
        }
      }

      if (rewardAmount > 0) {
        totalAvailableNetworks++;
        availableNetworks.push(network);
      }
    }

    // Count withdrawn networks for this level using the active WithdrawRequest model (status: approved)
    const approvedRequests = await WithdrawRequest.find({
      userId,
      level: levelNum,
      status: 'approved'
    });

    const withdrawnNetworks = new Set();
    approvedRequests.forEach(request => {
      // Prefer explicit networks array
      if (Array.isArray(request.networks)) {
        request.networks.forEach((n) => withdrawnNetworks.add(String(n).toUpperCase()));
      }
      // Also include keys from networkRewards map if present
      if (request.networkRewards && request.networkRewards instanceof Map) {
        Array.from(request.networkRewards.keys()).forEach((n) => withdrawnNetworks.add(String(n).toUpperCase()));
      } else if (request.networkRewards && typeof request.networkRewards === 'object') {
        Object.keys(request.networkRewards).forEach((n) => withdrawnNetworks.add(String(n).toUpperCase()));
      }
    });

    const withdrawnCount = withdrawnNetworks.size;

    res.status(200).json({
      success: true,
      data: {
        withdrawalCount: withdrawnCount,
        totalAvailableNetworks,
        availableNetworks,
        withdrawnNetworks: Array.from(withdrawnNetworks),
        remainingNetworks: availableNetworks.filter(network => !withdrawnNetworks.has(network))
      }
    });

  } catch (error) {
    next(error);
  }
};
