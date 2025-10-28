import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.development.local');
if (envPath) {
  dotenv.config({ path: envPath });
}

import connectDB from '../database/mongodb.js';
import NetworkReward from '../models/network-reward.model.js';
import User from '../models/user.model.js';

const runMigrations = async () => {
  try {
    console.log('🚀 Starting automatic migrations...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');
    
    // Check if global rewards exist
    const globalRewardsCount = await NetworkReward.countDocuments();
    if (globalRewardsCount === 0) {
      console.log('🌐 No global rewards found, creating default global rewards...');
      
      // Create default global rewards for all levels
      const defaultRewards = [
        // Level 1
        { level: 1, network: 'BTC', rewardAmount: 0.001, isActive: true },
        { level: 1, network: 'ETH', rewardAmount: 0.01, isActive: true },
        { level: 1, network: 'TRON', rewardAmount: 100, isActive: true },
        { level: 1, network: 'USDT', rewardAmount: 10, isActive: true },
        { level: 1, network: 'BNB', rewardAmount: 0.05, isActive: true },
        { level: 1, network: 'SOL', rewardAmount: 0.1, isActive: true },
        
        // Level 2
        { level: 2, network: 'BTC', rewardAmount: 0.002, isActive: true },
        { level: 2, network: 'ETH', rewardAmount: 0.02, isActive: true },
        { level: 2, network: 'TRON', rewardAmount: 200, isActive: true },
        { level: 2, network: 'USDT', rewardAmount: 20, isActive: true },
        { level: 2, network: 'BNB', rewardAmount: 0.1, isActive: true },
        { level: 2, network: 'SOL', rewardAmount: 0.2, isActive: true },
        
        // Level 3
        { level: 3, network: 'BTC', rewardAmount: 0.005, isActive: true },
        { level: 3, network: 'ETH', rewardAmount: 0.05, isActive: true },
        { level: 3, network: 'TRON', rewardAmount: 500, isActive: true },
        { level: 3, network: 'USDT', rewardAmount: 50, isActive: true },
        { level: 3, network: 'BNB', rewardAmount: 0.25, isActive: true },
        { level: 3, network: 'SOL', rewardAmount: 0.5, isActive: true },
        
        // Level 4
        { level: 4, network: 'BTC', rewardAmount: 0.01, isActive: true },
        { level: 4, network: 'ETH', rewardAmount: 0.1, isActive: true },
        { level: 4, network: 'TRON', rewardAmount: 1000, isActive: true },
        { level: 4, network: 'USDT', rewardAmount: 100, isActive: true },
        { level: 4, network: 'BNB', rewardAmount: 0.5, isActive: true },
        { level: 4, network: 'SOL', rewardAmount: 1, isActive: true },
        
        // Level 5
        { level: 5, network: 'BTC', rewardAmount: 0.02, isActive: true },
        { level: 5, network: 'ETH', rewardAmount: 0.2, isActive: true },
        { level: 5, network: 'TRON', rewardAmount: 2000, isActive: true },
        { level: 5, network: 'USDT', rewardAmount: 200, isActive: true },
        { level: 5, network: 'BNB', rewardAmount: 1, isActive: true },
        { level: 5, network: 'SOL', rewardAmount: 2, isActive: true }
      ];
      
      await NetworkReward.insertMany(defaultRewards);
      console.log('✅ Global rewards created successfully');
    } else {
      console.log(`✅ Global rewards already exist (${globalRewardsCount} records)`);
    }
    
    // User rewards are now stored directly in User model
    console.log('✅ User rewards are now stored directly in User model - no separate migration needed');
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => {
    console.log('Migration process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
}

export default runMigrations;