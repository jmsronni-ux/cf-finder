import mongoose from 'mongoose';
import User from '../models/user.model.js';
import UserNetworkReward from '../models/user-network-reward.model.js';
import NetworkReward from '../models/network-reward.model.js';
import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';
import { MONGO_URI } from '../config/env.js';

const migrateUserNetworkRewards = async () => {
  try {
    console.log('🔄 Starting user network rewards migration...');
    
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');
    
    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);
      
      // Check if user already has network reward fields populated
      if (user.lvl1NetworkRewards && user.lvl1NetworkRewards.BTC !== undefined) {
        console.log('⏭️  User already has network reward fields, skipping...');
        skippedCount++;
        continue;
      }
      
      let userUpdated = false;
      
      // Process each level (1-5)
      for (let level = 1; level <= 5; level++) {
        const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
        
        // Get user's custom network rewards for this level
        const userRewards = await UserNetworkReward.find({ 
          userId: user._id, 
          level, 
          isActive: true 
        });
        
        // Get global rewards for fallback
        const globalRewards = await NetworkReward.find({ 
          level, 
          isActive: true 
        });
        
        const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
        const networkRewards = {};
        let hasRewards = false;
        
        // Calculate rewards using user-specific with global fallback
        for (const network of networks) {
          let rewardAmount = 0;
          
          // Check if user has custom reward for this network
          const userReward = userRewards.find(r => r.network === network);
          if (userReward) {
            rewardAmount = userReward.rewardAmount;
          } else {
            // Fall back to global reward
            const globalReward = globalRewards.find(r => r.network === network);
            if (globalReward) {
              rewardAmount = globalReward.rewardAmount;
            }
          }
          
          networkRewards[network] = rewardAmount;
          if (rewardAmount > 0) hasRewards = true;
        }
        
        // Only update if there are rewards for this level
        if (hasRewards) {
          // Convert to USDT and update user
          const conversionResult = convertRewardsToUSDT(networkRewards);
          const totalUSDT = conversionResult.totalUSDT;
          
          // Update user with network rewards and USDT total
          await User.findByIdAndUpdate(user._id, {
            $set: {
              [levelNetworkRewardsField]: networkRewards,
              [`lvl${level}reward`]: totalUSDT
            }
          });
          
          console.log(`  ✅ Level ${level}: ${Object.entries(networkRewards).filter(([_, amount]) => amount > 0).map(([net, amt]) => `${net}:${amt}`).join(', ')} = ${totalUSDT} USDT`);
          userUpdated = true;
        }
      }
      
      if (userUpdated) {
        migratedCount++;
        console.log(`✅ User ${user.name} migrated successfully`);
      } else {
        console.log(`⏭️  No network rewards found for user ${user.name}`);
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUserNetworkRewards();
}

export default migrateUserNetworkRewards;