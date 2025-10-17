import UserNetworkReward from '../models/user-network-reward.model.js';
import NetworkReward from '../models/network-reward.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// Get user's network rewards (with fallback to global rewards)
export const getUserNetworkRewards = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { level } = req.query;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    let query = { userId };
    if (level) {
      query.level = parseInt(level);
    }
    
    // Get user's custom rewards
    const userRewards = await UserNetworkReward.find(query).sort({ level: 1, network: 1 });
    
    // Get global rewards for fallback
    let globalQuery = {};
    if (level) {
      globalQuery.level = parseInt(level);
    }
    const globalRewards = await NetworkReward.find(globalQuery).sort({ level: 1, network: 1 });
    
    // Combine user rewards with global fallbacks
    const combinedRewards = {};
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const levels = level ? [parseInt(level)] : [1, 2, 3, 4, 5];
    
    for (const levelNum of levels) {
      combinedRewards[levelNum] = {};
      
      for (const network of networks) {
        // Check if user has custom reward for this level/network
        const userReward = userRewards.find(r => r.level === levelNum && r.network === network);
        
        if (userReward && userReward.isActive) {
          // Use user's custom reward
          combinedRewards[levelNum][network] = {
            amount: userReward.rewardAmount,
            isCustom: true,
            source: 'user'
          };
        } else {
          // Fall back to global reward
          const globalReward = globalRewards.find(r => r.level === levelNum && r.network === network);
          if (globalReward && globalReward.isActive) {
            combinedRewards[levelNum][network] = {
              amount: globalReward.rewardAmount,
              isCustom: false,
              source: 'global'
            };
          } else {
            combinedRewards[levelNum][network] = {
              amount: 0,
              isCustom: false,
              source: 'none'
            };
          }
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'User network rewards retrieved successfully',
      data: {
        userId,
        rewards: combinedRewards,
        rawUserRewards: userRewards,
        rawGlobalRewards: globalRewards
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get rewards for a specific user and level
export const getUserLevelRewards = async (req, res, next) => {
  try {
    const { userId, level } = req.params;
    const levelNumber = parseInt(level);
    
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      throw new ApiError(400, 'Invalid level number. Must be between 1 and 5.');
    }
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Get user's custom rewards for this level
    const userRewards = await UserNetworkReward.find({ userId, level: levelNumber, isActive: true });
    
    // Get global rewards for fallback
    const globalRewards = await NetworkReward.find({ level: levelNumber, isActive: true });
    
    // Combine with fallback logic
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const finalRewards = {};
    
    for (const network of networks) {
      const userReward = userRewards.find(r => r.network === network);
      
      if (userReward) {
        finalRewards[network] = {
          amount: userReward.rewardAmount,
          isCustom: true,
          source: 'user'
        };
      } else {
        const globalReward = globalRewards.find(r => r.network === network);
        if (globalReward) {
          finalRewards[network] = {
            amount: globalReward.rewardAmount,
            isCustom: false,
            source: 'global'
          };
        } else {
          finalRewards[network] = {
            amount: 0,
            isCustom: false,
            source: 'none'
          };
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Network rewards for user ${userId} level ${levelNumber} retrieved successfully`,
      data: {
        userId,
        level: levelNumber,
        rewards: finalRewards,
        rawUserRewards: userRewards,
        rawGlobalRewards: globalRewards
      }
    });
  } catch (error) {
    next(error);
  }
};

// Set user's custom network reward (Admin only)
export const setUserNetworkReward = async (req, res, next) => {
  try {
    const { userId, level, network, rewardAmount, isActive = true } = req.body;
    const adminId = req.user?.id;
    
    // Validation
    if (!userId || !level || !network || rewardAmount === undefined) {
      throw new ApiError(400, 'userId, level, network, and rewardAmount are required');
    }
    
    if (level < 1 || level > 5) {
      throw new ApiError(400, 'Level must be between 1 and 5');
    }
    
    if (!['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'].includes(network)) {
      throw new ApiError(400, 'Invalid network. Must be one of: BTC, ETH, TRON, USDT, BNB, SOL');
    }
    
    if (rewardAmount < 0) {
      throw new ApiError(400, 'Reward amount must be non-negative');
    }
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Use upsert to create or update user's custom reward
    const reward = await UserNetworkReward.findOneAndUpdate(
      { userId, level, network },
      {
        userId,
        level,
        network,
        rewardAmount,
        isActive,
        isCustom: true,
        $set: {
          'metadata.updatedBy': adminId
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    
    // If it's a new document, set the createdBy field
    if (!reward.metadata.createdBy) {
      reward.metadata.createdBy = adminId;
      await reward.save();
    }
    
    res.status(200).json({
      success: true,
      message: `Custom reward for ${network} on level ${level} set for user successfully`,
      data: { reward }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update user's level rewards (Admin only)
export const setUserLevelRewards = async (req, res, next) => {
  try {
    const { userId, level, rewards } = req.body;
    const adminId = req.user?.id;
    
    if (!userId || !level || !rewards || typeof rewards !== 'object') {
      throw new ApiError(400, 'userId, level, and rewards object are required');
    }
    
    if (level < 1 || level > 5) {
      throw new ApiError(400, 'Level must be between 1 and 5');
    }
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const validNetworks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const rewardEntries = Object.entries(rewards);
    
    if (rewardEntries.length === 0) {
      throw new ApiError(400, 'At least one network reward must be provided');
    }
    
    // Validate all networks and amounts
    for (const [network, amount] of rewardEntries) {
      if (!validNetworks.includes(network)) {
        throw new ApiError(400, `Invalid network: ${network}. Must be one of: ${validNetworks.join(', ')}`);
      }
      if (typeof amount !== 'number' || amount < 0) {
        throw new ApiError(400, `Invalid reward amount for ${network}: ${amount}. Must be a non-negative number.`);
      }
    }
    
    const results = [];
    
    // Update each network reward for this user
    for (const [network, rewardAmount] of rewardEntries) {
      const reward = await UserNetworkReward.findOneAndUpdate(
        { userId, level, network },
        {
          userId,
          level,
          network,
          rewardAmount,
          isActive: true,
          isCustom: true,
          $set: {
            'metadata.updatedBy': adminId
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
      
      // Set createdBy if it's a new document
      if (!reward.metadata.createdBy) {
        reward.metadata.createdBy = adminId;
        await reward.save();
      }
      
      results.push(reward);
    }
    
    res.status(200).json({
      success: true,
      message: `All custom rewards for level ${level} updated for user successfully`,
      data: {
        userId,
        level,
        rewards: results,
        count: results.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user's custom network reward (Admin only)
export const deleteUserNetworkReward = async (req, res, next) => {
  try {
    const { userId, level, network } = req.params;
    const levelNumber = parseInt(level);
    
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      throw new ApiError(400, 'Invalid level number. Must be between 1 and 5.');
    }
    
    if (!['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'].includes(network)) {
      throw new ApiError(400, 'Invalid network. Must be one of: BTC, ETH, TRON, USDT, BNB, SOL');
    }
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const deletedReward = await UserNetworkReward.findOneAndDelete({ 
      userId, 
      level: levelNumber, 
      network 
    });
    
    if (!deletedReward) {
      throw new ApiError(404, `Custom reward for ${network} on level ${levelNumber} not found for this user`);
    }
    
    res.status(200).json({
      success: true,
      message: `Custom reward for ${network} on level ${levelNumber} deleted for user successfully`,
      data: { reward: deletedReward }
    });
  } catch (error) {
    next(error);
  }
};

// Get all users with their network rewards summary
export const getAllUsersNetworkRewards = async (req, res, next) => {
  try {
    const { level, hasCustomRewards } = req.query;
    
    // Build aggregation pipeline
    const pipeline = [];
    
    // Match users
    pipeline.push({ $match: {} });
    
    // Lookup user network rewards
    let rewardMatch = {};
    if (level) {
      rewardMatch.level = parseInt(level);
    }
    if (hasCustomRewards === 'true') {
      rewardMatch.isCustom = true;
    }
    
    pipeline.push({
      $lookup: {
        from: 'usernetworkrewards',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', '$$userId'] },
                  ...Object.keys(rewardMatch).map(key => ({ $eq: [`$${key}`, rewardMatch[key]] }))
                ]
              }
            }
          }
        ],
        as: 'networkRewards'
      }
    });
    
    // Add computed fields
    pipeline.push({
      $addFields: {
        customRewardsCount: {
          $size: {
            $filter: {
              input: '$networkRewards',
              cond: { $eq: ['$$this.isCustom', true] }
            }
          }
        },
        totalRewardsCount: { $size: '$networkRewards' }
      }
    });
    
    // Project fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        tier: 1,
        balance: 1,
        customRewardsCount: 1,
        totalRewardsCount: 1,
        networkRewards: 1
      }
    });
    
    // Sort by name
    pipeline.push({ $sort: { name: 1 } });
    
    const users = await User.aggregate(pipeline);
    
    res.status(200).json({
      success: true,
      message: 'Users with network rewards retrieved successfully',
      data: {
        users,
        count: users.length,
        filters: { level, hasCustomRewards }
      }
    });
  } catch (error) {
    next(error);
  }
};
