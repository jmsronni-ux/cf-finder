import mongoose from 'mongoose';
import User from '../models/user.model.js';
import NetworkReward from '../models/network-reward.model.js';
import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';
import { MONGO_URI } from '../config/env.js';

const fixAdminUser = async () => {
  try {
    console.log('🔧 Fixing admin user network rewards...');
    
    // Connect to database
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.error('❌ Admin user not found');
      return;
    }
    
    console.log(`👤 Found admin user: ${adminUser.name} (${adminUser.email})`);
    
    // Check if admin user already has network reward fields
    if (adminUser.lvl1NetworkRewards && adminUser.lvl1NetworkRewards.BTC !== undefined) {
      console.log('✅ Admin user already has network reward fields');
      return;
    }
    
    // Get global rewards
    const globalRewards = await NetworkReward.find({ isActive: true });
    console.log(`📊 Found ${globalRewards.length} global rewards`);
    
    // Process each level (1-5)
    for (let level = 1; level <= 5; level++) {
      const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
      
      // Get global rewards for this level
      const levelGlobalRewards = globalRewards.filter(r => r.level === level);
      
      const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
      const networkRewards = {};
      
      // Use global rewards for each network
      for (const network of networks) {
        const globalReward = levelGlobalRewards.find(r => r.network === network);
        networkRewards[network] = globalReward ? globalReward.rewardAmount : 0;
      }
      
      // Convert to USDT and update user
      const conversionResult = convertRewardsToUSDT(networkRewards);
      const totalUSDT = conversionResult.totalUSDT;
      
      // Update user with network rewards and USDT total
      await User.findByIdAndUpdate(adminUser._id, {
        $set: {
          [levelNetworkRewardsField]: networkRewards,
          [`lvl${level}reward`]: totalUSDT
        }
      });
      
      console.log(`  ✅ Level ${level}: ${Object.entries(networkRewards).filter(([_, amount]) => amount > 0).map(([net, amt]) => `${net}:${amt}`).join(', ')} = ${totalUSDT} USDT`);
    }
    
    console.log('✅ Admin user fixed successfully');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
};

// Run fix if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAdminUser();
}

export default fixAdminUser;
