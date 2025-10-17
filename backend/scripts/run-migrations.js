import { config } from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = `.env.${process.env.NODE_ENV || "development"}.local`;
if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

import connectDB from '../database/mongodb.js';
import NetworkReward from '../models/network-reward.model.js';
import UserNetworkReward from '../models/user-network-reward.model.js';
import User from '../models/user.model.js';
import migrateUserNetworkRewards from './migrate-user-network-rewards.js';

const runMigrations = async () => {
  try {
    console.log('🚀 Starting automatic migrations...');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Check if global rewards exist
    const globalRewardsCount = await NetworkReward.countDocuments();
    if (globalRewardsCount === 0) {
      console.log('📊 No global rewards found, creating default rewards...');
      
      // Default reward structure
      const defaultNetworkRewards = {
        1: { BTC: 0.001, ETH: 0.02, TRON: 100, USDT: 50, BNB: 0.1, SOL: 2 },
        2: { BTC: 0.002, ETH: 0.04, TRON: 200, USDT: 100, BNB: 0.2, SOL: 4 },
        3: { BTC: 0.005, ETH: 0.1, TRON: 500, USDT: 250, BNB: 0.5, SOL: 10 },
        4: { BTC: 0.01, ETH: 0.2, TRON: 1000, USDT: 500, BNB: 1, SOL: 20 },
        5: { BTC: 0.02, ETH: 0.4, TRON: 2000, USDT: 1000, BNB: 2, SOL: 40 }
      };
      
      // Create global rewards
      for (const [level, networkRewards] of Object.entries(defaultNetworkRewards)) {
        const levelNumber = parseInt(level);
        
        for (const [network, amount] of Object.entries(networkRewards)) {
          await NetworkReward.create({
            level: levelNumber,
            network,
            rewardAmount: amount,
            isActive: true
          });
        }
      }
      
      console.log('✅ Global rewards created successfully');
    } else {
      console.log(`✅ Global rewards already exist (${globalRewardsCount} records)`);
    }
    
    // Check if user rewards exist
    const userRewardsCount = await UserNetworkReward.countDocuments();
    if (userRewardsCount === 0) {
      console.log('👥 No user rewards found, creating individual user rewards...');
      
      // Get all users
      const users = await User.find({}).select('_id name email tier balance');
      console.log(`📊 Found ${users.length} users to process`);
      
      // User type multipliers
      const userRewardMultipliers = {
        vip: { BTC: 2.0, ETH: 2.0, TRON: 2.0, USDT: 2.0, BNB: 2.0, SOL: 2.0 },
        premium: { BTC: 1.5, ETH: 1.5, TRON: 1.5, USDT: 1.5, BNB: 1.5, SOL: 1.5 },
        basic: { BTC: 0.5, ETH: 0.5, TRON: 0.5, USDT: 0.5, BNB: 0.5, SOL: 0.5 }
      };
      
      let createdRewards = 0;
      
      // Process each user
      for (const user of users) {
        const userTier = user.tier || 1;
        
        // Determine user type
        let userType = 'standard';
        if (userTier >= 5 || user.balance >= 10000) {
          userType = 'vip';
        } else if (userTier >= 4 || user.balance >= 5000) {
          userType = 'premium';
        } else if (userTier <= 1 || user.balance < 100) {
          userType = 'basic';
        }
        
        const multipliers = userRewardMultipliers[userType];
        
        // Only create custom rewards if multipliers are different from 1.0
        if (multipliers && multipliers.BTC !== 1.0) {
          // Get global rewards for this user
          const globalRewards = await NetworkReward.find({ isActive: true });
          
          // Create user-specific rewards
          for (const globalReward of globalRewards) {
            const customAmount = globalReward.rewardAmount * multipliers[globalReward.network];
            
            if (customAmount !== globalReward.rewardAmount) {
              await UserNetworkReward.create({
                userId: user._id,
                level: globalReward.level,
                network: globalReward.network,
                rewardAmount: customAmount,
                isActive: true,
                isCustom: true
              });
              
              createdRewards++;
            }
          }
        }
      }
      
      console.log(`✅ Created ${createdRewards} individual user rewards`);
    } else {
      console.log(`✅ User rewards already exist (${userRewardsCount} records)`);
    }
    
    // Run user network rewards migration
    console.log('\n🔄 Running user network rewards migration...');
    await migrateUserNetworkRewards();
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Export for manual use
export { runMigrations };

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
