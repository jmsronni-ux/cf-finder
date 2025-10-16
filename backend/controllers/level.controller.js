import Level from '../models/level.model.js';
import { ApiError } from '../middlewares/error.middleware.js';

// Get all levels
export const getLevels = async (req, res, next) => {
  try {
    const levels = await Level.find({}).sort({ level: 1 });
    
    res.status(200).json({
      success: true,
      message: 'Levels retrieved successfully',
      data: {
        levels,
        count: levels.length
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
    const levelNumber = parseInt(levelId);
    
    if (isNaN(levelNumber)) {
      throw new ApiError(400, 'Invalid level ID');
    }
    
    const level = await Level.findOne({ level: levelNumber });
    
    if (!level) {
      throw new ApiError(404, `Level ${levelNumber} not found`);
    }
    
    res.status(200).json({
      success: true,
      message: `Level ${levelNumber} retrieved successfully`,
      data: { level }
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
