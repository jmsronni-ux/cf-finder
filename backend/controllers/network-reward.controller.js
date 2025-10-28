import NetworkReward from '../models/network-reward.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// Get all network rewards
export const getNetworkRewards = async (req, res, next) => {
  try {
    const { level } = req.query;
    
    let query = {};
    if (level) {
      query.level = parseInt(level);
    }
    
    const rewards = await NetworkReward.find(query).sort({ level: 1, network: 1 });
    
    // Group rewards by level for easier frontend consumption
    const rewardsByLevel = rewards.reduce((acc, reward) => {
      if (!acc[reward.level]) {
        acc[reward.level] = {};
      }
      acc[reward.level][reward.network] = reward.rewardAmount;
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      message: 'Network rewards retrieved successfully',
      data: {
        rewards,
        rewardsByLevel,
        count: rewards.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get rewards for a specific level
export const getRewardsByLevel = async (req, res, next) => {
  try {
    const { level } = req.params;
    const levelNumber = parseInt(level);
    
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      throw new ApiError(400, 'Invalid level number. Must be between 1 and 5.');
    }
    
    const rewards = await NetworkReward.find({ level: levelNumber, isActive: true });
    
    // Convert to object format for easier frontend consumption
    const rewardsObj = rewards.reduce((acc, reward) => {
      acc[reward.network] = reward.rewardAmount;
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      message: `Rewards for level ${levelNumber} retrieved successfully`,
      data: {
        level: levelNumber,
        rewards: rewardsObj,
        rawRewards: rewards
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create or update network reward (Admin only)
export const setNetworkReward = async (req, res, next) => {
  try {
    const { level, network, rewardAmount, isActive = true } = req.body;
    const userId = req.user?.id; // From auth middleware
    
    // Validation
    if (!level || !network || rewardAmount === undefined) {
      throw new ApiError(400, 'Level, network, and rewardAmount are required');
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
    
    // Use upsert to create or update
    const reward = await NetworkReward.findOneAndUpdate(
      { level, network },
      {
        level,
        network,
        rewardAmount,
        isActive,
        $set: {
          'metadata.updatedBy': userId
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
      reward.metadata.createdBy = userId;
      await reward.save();
    }
    
    res.status(200).json({
      success: true,
      message: `Reward for ${network} on level ${level} set successfully`,
      data: { reward }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update rewards for a level (Admin only)
export const setLevelRewards = async (req, res, next) => {
  try {
    const { level, rewards } = req.body;
    const userId = req.user?.id;
    
    console.log('[Global Network Rewards] Request received:', {
      level,
      rewards,
      userId,
      body: req.body,
      params: req.params
    });
    
    if (!level || !rewards || typeof rewards !== 'object') {
      throw new ApiError(400, 'Level and rewards object are required');
    }
    
    if (level < 1 || level > 5) {
      throw new ApiError(400, 'Level must be between 1 and 5');
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
    
    // Update each network reward
    for (const [network, rewardAmount] of rewardEntries) {
      console.log(`[Global Network Rewards] Updating ${network} for level ${level} with amount ${rewardAmount}`);
      
      const reward = await NetworkReward.findOneAndUpdate(
        { level, network },
        {
          level,
          network,
          rewardAmount,
          isActive: true,
          $set: {
            'metadata.updatedBy': userId
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
      
      console.log(`[Global Network Rewards] Updated ${network} result:`, reward);
      
      // Set createdBy if it's a new document
      if (!reward.metadata.createdBy) {
        reward.metadata.createdBy = userId;
        await reward.save();
        console.log(`[Global Network Rewards] Set createdBy for ${network}:`, reward.metadata.createdBy);
      }
      
      results.push(reward);
    }
    
    console.log(`[Global Network Rewards] Final results for level ${level}:`, results);
    
    res.status(200).json({
      success: true,
      message: `All rewards for level ${level} updated successfully`,
      data: {
        level,
        rewards: results,
        count: results.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete network reward (Admin only)
export const deleteNetworkReward = async (req, res, next) => {
  try {
    const { level, network } = req.params;
    const levelNumber = parseInt(level);
    
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      throw new ApiError(400, 'Invalid level number. Must be between 1 and 5.');
    }
    
    if (!['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'].includes(network)) {
      throw new ApiError(400, 'Invalid network. Must be one of: BTC, ETH, TRON, USDT, BNB, SOL');
    }
    
    const deletedReward = await NetworkReward.findOneAndDelete({ level: levelNumber, network });
    
    if (!deletedReward) {
      throw new ApiError(404, `Reward for ${network} on level ${levelNumber} not found`);
    }
    
    res.status(200).json({
      success: true,
      message: `Reward for ${network} on level ${levelNumber} deleted successfully`,
      data: { reward: deletedReward }
    });
  } catch (error) {
    next(error);
  }
};

// Get reward summary for all levels
export const getRewardSummary = async (req, res, next) => {
  try {
    const rewards = await NetworkReward.find({ isActive: true }).sort({ level: 1, network: 1 });
    
    // Create summary structure
    const summary = {
      byLevel: {},
      byNetwork: {},
      totalRewards: 0
    };
    
    // Group by level
    rewards.forEach(reward => {
      if (!summary.byLevel[reward.level]) {
        summary.byLevel[reward.level] = {};
      }
      summary.byLevel[reward.level][reward.network] = reward.rewardAmount;
      
      // Group by network
      if (!summary.byNetwork[reward.network]) {
        summary.byNetwork[reward.network] = {};
      }
      summary.byNetwork[reward.network][reward.level] = reward.rewardAmount;
      
      summary.totalRewards += reward.rewardAmount;
    });
    
    res.status(200).json({
      success: true,
      message: 'Reward summary retrieved successfully',
      data: {
        summary,
        rawRewards: rewards,
        count: rewards.length
      }
    });
  } catch (error) {
    next(error);
  }
};
