import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { MONGO_URI } from '../config/env.js';

const checkUserRewards = async () => {
  try {
    console.log('🔍 Checking user network rewards...');
    
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');
    
    // Find a normal user (not admin)
    const normalUser = await User.findOne({ isAdmin: { $ne: true } });
    if (!normalUser) {
      console.error('❌ No normal user found');
      return;
    }
    
    console.log(`👤 Found normal user: ${normalUser.name} (${normalUser.email})`);
    console.log(`💰 Current balance: ${normalUser.balance}`);
    
    // Check network rewards for each level
    for (let level = 1; level <= 5; level++) {
      const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
      const levelAnimField = `lvl${level}anim`;
      const levelRewardField = `lvl${level}reward`;
      
      const networkRewards = normalUser[levelNetworkRewardsField] || {};
      const hasWatched = normalUser[levelAnimField] === 1;
      const levelReward = normalUser[levelRewardField] || 0;
      
      console.log(`\n📊 Level ${level}:`);
      console.log(`  🎬 Watched: ${hasWatched}`);
      console.log(`  💰 Level Reward: ${levelReward}`);
      console.log(`  🌐 Network Rewards:`, networkRewards);
      
      // Check if network rewards are empty or all zeros
      const hasRewards = Object.values(networkRewards).some(amount => amount > 0);
      if (!hasRewards) {
        console.log(`  ⚠️  No network rewards set for level ${level}!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
};

// Run check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkUserRewards();
}

export default checkUserRewards;
