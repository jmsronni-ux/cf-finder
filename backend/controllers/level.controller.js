import Level from '../models/level.model.js';
import User from '../models/user.model.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { distributeNetworkRewards, getUserNetworkRewardsForLevel } from '../utils/level-distribution.js';
import { fetchConversionRates } from '../utils/crypto-conversion.js';

// Get all levels
export const getLevels = async (req, res, next) => {
  try {
    const { userId } = req.query;
    
    const levels = await Level.find({}).sort({ level: 1 });
    
    // If userId is provided, apply user-specific network reward distribution
    let processedLevels = levels;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Fetch conversion rates from database/cache
        const conversionRates = await fetchConversionRates();
        
        processedLevels = levels.map(level => {
          const userNetworkRewards = getUserNetworkRewardsForLevel(user, level.level);
          const levelObj = level.toObject();
          return distributeNetworkRewards(levelObj, userNetworkRewards, conversionRates);
        });
        
        console.log(`[Level Controller] Applied user-specific USD rewards for user ${userId}`);
      } else {
        console.log(`[Level Controller] User ${userId} not found, returning default levels`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Levels retrieved successfully',
      data: {
        levels: processedLevels,
        count: processedLevels.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get specific level by level number
export const getLevelById = async (req, res, next) => {
  try {
    const { levelId } = req.params;
    const { userId } = req.query;
    const levelNumber = parseInt(levelId);
    
    if (isNaN(levelNumber)) {
      throw new ApiError(400, 'Invalid level ID');
    }
    
    const level = await Level.findOne({ level: levelNumber });
    
    if (!level) {
      throw new ApiError(404, `Level ${levelNumber} not found`);
    }
    
    // If userId is provided, apply user-specific network reward distribution
    let processedLevel = level;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Fetch conversion rates from database/cache
        const conversionRates = await fetchConversionRates();
        
        const userNetworkRewards = getUserNetworkRewardsForLevel(user, levelNumber);
        const levelObj = level.toObject();
        processedLevel = distributeNetworkRewards(levelObj, userNetworkRewards, conversionRates);
        
        console.log(`[Level Controller] Applied user-specific USD rewards for user ${userId}, level ${levelNumber}`);
      } else {
        console.log(`[Level Controller] User ${userId} not found, returning default level`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Level ${levelNumber} retrieved successfully`,
      data: { level: processedLevel }
    });
  } catch (error) {
    next(error);
  }
};

// Create new level (Admin only)
export const createLevel = async (req, res, next) => {
  try {
    const { level, name, description, nodes, edges } = req.body;
    
    // Check if level already exists
    const existingLevel = await Level.findOne({ level });
    if (existingLevel) {
      throw new ApiError(400, `Level ${level} already exists`);
    }
    
    const newLevel = await Level.create({
      level,
      name,
      description,
      nodes,
      edges
    });
    
    res.status(201).json({
      success: true,
      message: `Level ${level} created successfully`,
      data: { level: newLevel }
    });
  } catch (error) {
    next(error);
  }
};

// Update level (Admin only)
export const updateLevel = async (req, res, next) => {
  try {
    const { levelId } = req.params;
    const levelNumber = parseInt(levelId);
    const updateData = req.body;
    
    if (isNaN(levelNumber)) {
      throw new ApiError(400, 'Invalid level ID');
    }
    
    // Remove level from updateData to prevent changing the level number
    delete updateData.level;
    
    const updatedLevel = await Level.findOneAndUpdate(
      { level: levelNumber },
      { 
        ...updateData,
        'metadata.updatedAt': new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedLevel) {
      throw new ApiError(404, `Level ${levelNumber} not found`);
    }
    
    res.status(200).json({
      success: true,
      message: `Level ${levelNumber} updated successfully`,
      data: { level: updatedLevel }
    });
  } catch (error) {
    next(error);
  }
};

// Delete level (Admin only)
export const deleteLevel = async (req, res, next) => {
  try {
    const { levelId } = req.params;
    const levelNumber = parseInt(levelId);
    
    if (isNaN(levelNumber)) {
      throw new ApiError(400, 'Invalid level ID');
    }
    
    const deletedLevel = await Level.findOneAndDelete({ level: levelNumber });
    
    if (!deletedLevel) {
      throw new ApiError(404, `Level ${levelNumber} not found`);
    }
    
    res.status(200).json({
      success: true,
      message: `Level ${levelNumber} deleted successfully`,
      data: { level: deletedLevel }
    });
  } catch (error) {
    next(error);
  }
};
