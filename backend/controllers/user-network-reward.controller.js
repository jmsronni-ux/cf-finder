import UserNetworkReward from '../models/user-network-reward.model.js';
import NetworkReward from '../models/network-reward.model.js';
import User from '../models/user.model.js';
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
    
    // Recalculate total level reward and update user model
    const userRewards = await UserNetworkReward.find({ userId, level, isActive: true });
    const globalRewards = await NetworkReward.find({ level, isActive: true });
    
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    let totalLevelReward = 0;
    
    // Calculate total reward using user-specific rewards with global fallback
    for (const networkName of networks) {
      let rewardAmount = 0;
      
      // Check if user has custom reward for this network
      const userReward = userRewards.find(r => r.network === networkName);
      if (userReward) {
        rewardAmount = userReward.rewardAmount;
      } else {
        // Fall back to global reward
        const globalReward = globalRewards.find(r => r.network === networkName);
        if (globalReward) {
          rewardAmount = globalReward.rewardAmount;
        }
      }
      
      totalLevelReward += rewardAmount;
    }
    
    const levelRewardField = `lvl${level}reward`;
    const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
    
    // Prepare network rewards object for user model and convert to USDT
    const networkRewardsUpdate = {};
    const allRewards = {};
    for (const networkName of networks) {
      let rewardAmount = 0;
      
      // Check if user has custom reward for this network
      const userReward = userRewards.find(r => r.network === networkName);
      if (userReward) {
        rewardAmount = userReward.rewardAmount;
      } else {
        // Fall back to global reward
        const globalReward = globalRewards.find(r => r.network === networkName);
        if (globalReward) {
          rewardAmount = globalReward.rewardAmount;
        }
      }
      
      networkRewardsUpdate[`${levelNetworkRewardsField}.${networkName}`] = rewardAmount;
      allRewards[networkName] = rewardAmount;
    }
    
    // Convert all rewards to USDT equivalent
    const conversionResult = convertRewardsToUSDT(allRewards);
    const totalLevelRewardUSDT = conversionResult.totalUSDT;
    
    // Update the user's level reward field (in USDT) and individual network rewards
    await User.findByIdAndUpdate(
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
    
    console.log(`[User Network Rewards] Updated user ${userId} ${levelRewardField} to ${totalLevelRewardUSDT} USDT after ${network} update`);
    console.log(`[User Network Rewards] Updated user ${userId} ${levelNetworkRewardsField}:`, networkRewardsUpdate);
    console.log(`[User Network Rewards] Conversion breakdown:`, conversionResult.breakdown);
    
    res.status(200).json({
      success: true,
      message: `Custom reward for ${network} on level ${level} set for user successfully`,
      data: { 
        reward,
        totalLevelRewardUSDT,
        updatedUserField: levelRewardField,
        networkRewards: networkRewardsUpdate,
        updatedNetworkRewardsField: levelNetworkRewardsField,
        conversionBreakdown: conversionResult.breakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update user's level rewards (Admin only)
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
    
    if (!userId || !level || !rewards || typeof rewards !== 'object') {
      console.log('[User Network Rewards] Validation failed:', {
        userId: !!userId,
        level: !!level,
        rewards: !!rewards,
        rewardsType: typeof rewards
      });
      throw new ApiError(400, 'userId, level, and rewards object are required');
    }
    
    const levelNumber = parseInt(level);
    if (levelNumber < 1 || levelNumber > 5) {
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
      console.log(`[User Network Rewards] Updating ${network} for user ${userId} level ${levelNumber} with amount ${rewardAmount}`);
      
      const reward = await UserNetworkReward.findOneAndUpdate(
        { userId, level: levelNumber, network },
        {
          userId,
          level: levelNumber,
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
      
      console.log(`[User Network Rewards] Updated ${network} result:`, reward);
      
      // Set createdBy if it's a new document
      if (!reward.metadata.createdBy) {
        reward.metadata.createdBy = adminId;
        await reward.save();
        console.log(`[User Network Rewards] Set createdBy for ${network}:`, reward.metadata.createdBy);
      }
      
      results.push(reward);
    }
    
    // Convert all rewards to USDT equivalent and calculate total
    const conversionResult = convertRewardsToUSDT(rewards);
    const totalLevelRewardUSDT = conversionResult.totalUSDT;
    const levelRewardField = `lvl${levelNumber}reward`;
    const levelNetworkRewardsField = `lvl${levelNumber}NetworkRewards`;
    
    // Prepare network rewards object for user model
    const networkRewardsUpdate = {};
    Object.entries(rewards).forEach(([network, amount]) => {
      networkRewardsUpdate[`${levelNetworkRewardsField}.${network}`] = amount;
    });
    
    // Update the user's level reward field (in USDT) and individual network rewards
    await User.findByIdAndUpdate(
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
    console.log(`[User Network Rewards] Updated user ${userId} ${levelNetworkRewardsField}:`, rewards);
    console.log(`[User Network Rewards] Conversion breakdown:`, conversionResult.breakdown);
    console.log(`[User Network Rewards] Final results:`, results);
    
    res.status(200).json({
      success: true,
      message: `All custom rewards for level ${level} updated for user successfully`,
      data: {
        userId,
        level,
        rewards: results,
        count: results.length,
        totalLevelRewardUSDT,
        updatedUserField: levelRewardField,
        networkRewards: rewards,
        updatedNetworkRewardsField: levelNetworkRewardsField,
        conversionBreakdown: conversionResult.breakdown
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

// Get user's total network rewards across all levels
export const getUserTotalNetworkRewards = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    const totalRewards = {};
    
    // Initialize total rewards for each network
    networks.forEach(network => {
      totalRewards[network] = 0;
    });
    
    // Sum up rewards from all levels
    for (let level = 1; level <= 5; level++) {
      const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
      const userNetworkRewards = user[levelNetworkRewardsField] || {};
      
      // Check if user has watched this level
      const hasWatchedLevel = user[`lvl${level}anim`] === 1;
      
      if (hasWatchedLevel) {
        networks.forEach(network => {
          const rewardAmount = userNetworkRewards[network] || 0;
          totalRewards[network] += rewardAmount;
        });
      }
    }
    
    // Convert to USDT equivalent
    const conversionResult = convertRewardsToUSDT(totalRewards);
    
    res.status(200).json({
      success: true,
      message: 'User total network rewards retrieved successfully',
      data: {
        userId,
        totalRewards,
        totalUSDT: conversionResult.totalUSDT,
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
    const { networks: selectedNetworks, withdrawAll } = req.body;
    
    if (!selectedNetworks || !Array.isArray(selectedNetworks)) {
      throw new ApiError(400, 'networks array is required');
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    const allNetworks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    let totalCommission = 0;
    const commissionBreakdown = [];
    
    // Get the networks to withdraw
    const networksToWithdraw = withdrawAll ? allNetworks : selectedNetworks;
    
    // Calculate commission for each level
    for (let level = 1; level <= 5; level++) {
      const networkRewardsField = `lvl${level}NetworkRewards`;
      const commissionField = `lvl${level}Commission`;
      const animField = `lvl${level}anim`;
      
      const userNetworkRewards = user[networkRewardsField] || {};
      const levelCommissionPercent = user[commissionField] || 0;
      const levelCompleted = user[animField] === 1;
      
      // Only calculate commission for completed levels
      if (!levelCompleted) {
        continue;
      }
      
      // Calculate the USDT value of selected networks for this level
      let levelWithdrawalValueUSDT = 0;
      const levelNetworkBreakdown = {};
      
      for (const network of networksToWithdraw) {
        // Check if this network has rewards in this level
        if (userNetworkRewards[network] && userNetworkRewards[network] > 0) {
          const withdrawalAmount = userNetworkRewards[network];
          
          // Convert to USDT using conversion rates
          const networkRewards = { [network]: withdrawalAmount };
          const conversionResult = convertRewardsToUSDT(networkRewards);
          const usdtValue = conversionResult.totalUSDT;
          
          levelWithdrawalValueUSDT += usdtValue;
          levelNetworkBreakdown[network] = {
            amount: withdrawalAmount,
            usdtValue
          };
        }
      }
      
      // Calculate commission as percentage of withdrawal value
      if (levelWithdrawalValueUSDT > 0) {
        const levelCommission = (levelWithdrawalValueUSDT * levelCommissionPercent) / 100;
        totalCommission += levelCommission;
        
        commissionBreakdown.push({
          level,
          commissionPercent: levelCommissionPercent,
          withdrawalValueUSDT: levelWithdrawalValueUSDT,
          commissionAmount: levelCommission,
          networks: levelNetworkBreakdown
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Commission calculated successfully',
      data: {
        userId,
        totalCommission,
        commissionBreakdown,
        selectedNetworks: networksToWithdraw
      }
    });
  } catch (error) {
    next(error);
  }
};
