import mongoose from 'mongoose';
import User from '../models/user.model.js';
import NetworkReward from '../models/network-reward.model.js';
import { MONGO_URI } from '../config/env.js';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkAndSetupUserRewards = async () => {
  try {
    await connectDB();
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    // Get global network rewards
    const globalRewards = await NetworkReward.find({}).sort({ level: 1, network: 1 });
    console.log(`Found ${globalRewards.length} global network rewards`);
    
    // Create a map of global rewards by level and network
    const globalRewardsMap = {};
    globalRewards.forEach(reward => {
      if (!globalRewardsMap[reward.level]) {
        globalRewardsMap[reward.level] = {};
      }
      globalRewardsMap[reward.level][reward.network] = reward.amount;
    });
    
    console.log('Global rewards map:', globalRewardsMap);
    
    // Check each user
    for (const user of users) {
      console.log(`\nChecking user: ${user.name} (${user.email})`);
      console.log(`User ID: ${user._id}`);
      console.log(`Current balance: ${user.balance}`);
      
      let needsUpdate = false;
      const updateObj = {};
      
      // Check each level
      for (let level = 1; level <= 5; level++) {
        const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
        const userNetworkRewards = user[levelNetworkRewardsField] || {};
        
        console.log(`  Level ${level} network rewards:`, userNetworkRewards);
        
        // Check if user has network rewards for this level
        const hasRewards = Object.values(userNetworkRewards).some(amount => amount > 0);
        
        if (!hasRewards && globalRewardsMap[level]) {
          console.log(`  Setting up network rewards for level ${level} from global rewards`);
          updateObj[levelNetworkRewardsField] = globalRewardsMap[level];
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        console.log(`  Updating user with:`, updateObj);
        await User.findByIdAndUpdate(user._id, { $set: updateObj });
        console.log(`  ✅ Updated user ${user.name}`);
      } else {
        console.log(`  ✅ User ${user.name} already has network rewards set up`);
      }
    }
    
    console.log('\n✅ All users checked and updated');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

checkAndSetupUserRewards();
