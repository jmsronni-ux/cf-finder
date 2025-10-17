import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { MONGO_URI } from '../config/env.js';
import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testAnimationCompletion = async () => {
  try {
    await connectDB();
    
    // Find the test user
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.error('Test user not found');
      return;
    }
    
    console.log(`Found test user: ${testUser.name} (${testUser.email})`);
    console.log(`Current balance: ${testUser.balance}`);
    console.log(`Level 1 animation status: ${testUser.lvl1anim}`);
    
    // Simulate the animation completion logic
    const level = 1;
    const userId = testUser._id;
    
    console.log(`\n===== SIMULATING ANIMATION COMPLETION FOR LEVEL ${level} =====`);
    
    // Check if animation was already watched
    const animField = `lvl${level}anim`;
    const alreadyWatched = testUser[animField] === 1;
    
    console.log(`Animation already watched: ${alreadyWatched}`);
    
    // Prepare update object
    const updateObj = {};
    updateObj[animField] = 1;
    
    // Initialize variables for response
    let userNetworkRewards = {};
    let rewardBreakdown = [];
    let totalRewardUSDT = 0;
    let conversionResult = { totalUSDT: 0, breakdown: {} };
    
    // Add network rewards to balance if animation not already watched OR if user has 0 balance
    if (!alreadyWatched || (alreadyWatched && testUser.balance === 0)) {
      if (alreadyWatched && testUser.balance === 0) {
        console.log(`Animation already watched but balance is 0, adding rewards anyway`);
      }
      
      // Get user's network rewards from user model
      const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
      userNetworkRewards = testUser[levelNetworkRewardsField] || {};
      
      console.log(`User network rewards for level ${level}:`, userNetworkRewards);
      console.log(`User current balance:`, testUser.balance);
      
      // Convert all rewards to USDT equivalent
      conversionResult = convertRewardsToUSDT(userNetworkRewards);
      totalRewardUSDT = conversionResult.totalUSDT;
      
      console.log(`Conversion result:`, conversionResult);
      console.log(`Total reward USDT:`, totalRewardUSDT);
      
      Object.entries(conversionResult.breakdown).forEach(([network, data]) => {
        if (data.original > 0) {
          rewardBreakdown.push(`${network}: ${data.original} (${data.usdt} USDT)`);
        }
      });
      
      if (totalRewardUSDT > 0) {
        const newBalance = testUser.balance + totalRewardUSDT;
        updateObj.balance = newBalance;
        console.log(`Adding level ${level} network rewards: $${totalRewardUSDT} USDT. New balance: $${newBalance}`);
        console.log(`Network breakdown:`, rewardBreakdown.join(', '));
      } else {
        console.log(`No rewards to add - totalRewardUSDT is ${totalRewardUSDT}`);
      }
    } else {
      console.log(`Animation already watched, no reward added`);
    }
    
    console.log(`Update object:`, updateObj);
    
    // Apply the update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateObj },
      { new: true, runValidators: false }
    ).select('lvl1anim lvl2anim lvl3anim lvl4anim lvl5anim balance');
    
    console.log(`Database update result:`, {
      userId: updatedUser?._id,
      oldBalance: testUser.balance,
      newBalance: updatedUser?.balance,
      updateApplied: updateObj.balance ? 'YES' : 'NO'
    });
    
    if (!updatedUser) {
      console.error(`Failed to update user: ${userId}`);
      return;
    }
    
    console.log(`Successfully saved animation status for level ${level}`);
    
    // Show final result
    console.log(`\n===== FINAL RESULT =====`);
    console.log(`User balance: ${updatedUser.balance}`);
    console.log(`Level 1 animation: ${updatedUser.lvl1anim}`);
    console.log(`Total reward USDT: ${totalRewardUSDT}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

testAnimationCompletion();
