import NetworkReward from '../models/network-reward.model.js';
import User from '../models/user.model.js';
import ConversionRate from '../models/conversion-rate.model.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';

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
      
      // Get user's network rewards from user model
      const levelNetworkRewardsField = `lvl${levelNum}NetworkRewards`;
      const userNetworkRewards = user[levelNetworkRewardsField] || {};
      
      for (const network of networks) {
        // Check if user has network reward in user model
        const userRewardAmount = userNetworkRewards[network];
        
        if (userRewardAmount !== undefined && userRewardAmount > 0) {
          // Use user's network reward from user model
          combinedRewards[levelNum][network] = {
            amount: userRewardAmount,
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
    
    console.log(`[getUserNetworkRewards] User ${userId} network rewards:`, {
      lvl1NetworkRewards: user.lvl1NetworkRewards,
      lvl2NetworkRewards: user.lvl2NetworkRewards,
      lvl3NetworkRewards: user.lvl3NetworkRewards,
      lvl4NetworkRewards: user.lvl4NetworkRewards,
      lvl5NetworkRewards: user.lvl5NetworkRewards
    });
    
    console.log(`[getUserNetworkRewards] Combined rewards for user ${userId}:`, combinedRewards);
    
    res.status(200).json({
      success: true,
      message: 'User network rewards retrieved successfully',
      data: {
        userId,
        rewards: combinedRewards,
        userNetworkRewards: {
          lvl1NetworkRewards: user.lvl1NetworkRewards,
          lvl2NetworkRewards: user.lvl2NetworkRewards,
          lvl3NetworkRewards: user.lvl3NetworkRewards,
          lvl4NetworkRewards: user.lvl4NetworkRewards,
          lvl5NetworkRewards: user.lvl5NetworkRewards
        },
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
    
    // Get global rewards for fallback
    const globalRewards = await NetworkReward.find({ level: levelNumber, isActive: true });
    
    // Get user's network rewards from user model
    const levelNetworkRewardsField = `lvl${levelNumber}NetworkRewards`;
    const userNetworkRewards = user[levelNetworkRewardsField] || {};
    
    // Combine with fallback logic
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const finalRewards = {};
    
    for (const network of networks) {
      const userRewardAmount = userNetworkRewards[network];
      
      if (userRewardAmount !== undefined && userRewardAmount > 0) {
        // Use user's network reward from user model
        finalRewards[network] = {
          amount: userRewardAmount,
          isCustom: true,
          source: 'user'
        };
      } else {
        // Fall back to global reward
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
        rawUserRewards: userNetworkRewards,
        rawGlobalRewards: globalRewards
      }
    });
  } catch (error) {
    next(error);
  }
};

// Set user's level rewards (Admin only) - Updates User model directly
export const setUserLevelRewards = async (req, res, next) => {
  try {
    const { userId, level } = req.params;
    const { rewards } = req.body;
    const adminId = req.user?.id;
    
    console.log('[User Network Rewards] Request received:', {
      userId,
      level,
      rewards,
      adminId,
      body: req.body,
      params: req.params,
      headers: req.headers
    });
    
    // Validation
    if (!userId || !level || !rewards) {
      throw new ApiError(400, 'userId, level, and rewards are required');
    }
    
    const levelNumber = parseInt(level);
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 5) {
      throw new ApiError(400, 'Level must be between 1 and 5');
    }
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    // Validate rewards object
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const rewardEntries = Object.entries(rewards);
    
    if (rewardEntries.length === 0) {
      throw new ApiError(400, 'At least one network reward must be provided');
    }
    
    for (const [network, amount] of rewardEntries) {
      if (!networks.includes(network)) {
        throw new ApiError(400, `Invalid network: ${network}. Must be one of: ${networks.join(', ')}`);
      }
      if (typeof amount !== 'number' || amount < 0) {
        throw new ApiError(400, `Invalid reward amount for ${network}: ${amount}. Must be a non-negative number.`);
      }
    }
    
    // Prepare network rewards object for user model
    const networkRewardsUpdate = {};
    Object.entries(rewards).forEach(([network, amount]) => {
      networkRewardsUpdate[`lvl${levelNumber}NetworkRewards.${network}`] = amount;
    });
    
    console.log(`[User Network Rewards] Updating user ${userId} level ${levelNumber} with rewards:`, networkRewardsUpdate);
    
    // Convert all rewards to USDT equivalent and calculate total
    const conversionResult = convertRewardsToUSDT(rewards);
    const totalLevelRewardUSDT = conversionResult.totalUSDT;
    const levelRewardField = `lvl${levelNumber}reward`;
    
    // Update the user's level reward field (in USDT) and individual network rewards
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          [levelRewardField]: totalLevelRewardUSDT,
          ...networkRewardsUpdate,
          updatedAt: new Date()
        } 
      },
      { new: true }
    );
    
    console.log(`[User Network Rewards] Updated user ${userId} ${levelRewardField} to ${totalLevelRewardUSDT} USDT`);
    console.log(`[User Network Rewards] Updated user ${userId} level ${levelNumber} network rewards:`, networkRewardsUpdate);
    console.log(`[User Network Rewards] Conversion breakdown:`, conversionResult.breakdown);
    
    res.status(200).json({
      success: true,
      message: `All custom rewards for level ${level} updated for user successfully`,
      data: {
        userId,
        level,
        rewards: networkRewardsUpdate,
        totalLevelRewardUSDT,
        updatedUserField: levelRewardField,
        conversionBreakdown: conversionResult.breakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

// Calculate commission for selected networks
export const calculateNetworkCommission = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { networks } = req.body;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    if (!networks || !Array.isArray(networks)) {
      throw new ApiError(400, 'Networks array is required');
    }
    
    // Get user's stored commission percentage for their current level
    const levelCommissionField = `lvl${user.tier || 1}Commission`;
    const userLevelCommissionPercent = user[levelCommissionField] || 0;
    
    // Get user's network rewards for their current level
    const levelNetworkRewardsField = `lvl${user.tier || 1}NetworkRewards`;
    const userNetworkRewards = user[levelNetworkRewardsField] || {};
    
    // Get conversion rates to calculate USD values
    const conversionRates = await ConversionRate.find({});
    const conversionRatesMap = {};
    conversionRates.forEach(rate => {
      conversionRatesMap[rate.network] = rate.rateToUSD;
    });
    
    // Calculate commission for each selected network
    const commissionBreakdown = {};
    let totalCommissionUSD = 0;
    
    for (const network of networks) {
      const rewardAmount = userNetworkRewards[network] || 0;
      const conversionRate = conversionRatesMap[network] || 1;
      const rewardUSD = rewardAmount * conversionRate;
      const commissionUSD = rewardUSD * (userLevelCommissionPercent / 100);
      
      commissionBreakdown[network] = {
        rewardAmount,
        rewardUSD,
        commissionPercent: userLevelCommissionPercent,
        commissionUSD
      };
      
      totalCommissionUSD += commissionUSD;
    }
    
    res.status(200).json({
      success: true,
      message: 'Commission calculated successfully',
      data: {
        userId,
        networks,
        commissionPercent: userLevelCommissionPercent,
        commissionBreakdown,
        totalCommission: Math.round(totalCommissionUSD * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};