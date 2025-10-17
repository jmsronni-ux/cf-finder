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

const fixUserBalance = async () => {
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
    
    // Check if user has completed level 1 but balance is 0
    if (testUser.lvl1anim === 1 && testUser.balance === 0) {
      console.log('User has completed level 1 but balance is 0. Adding network rewards...');
      
      // Get level 1 network rewards
      const level1NetworkRewards = testUser.lvl1NetworkRewards || {};
      console.log('Level 1 network rewards:', level1NetworkRewards);
      
      // Convert to USDT
      const conversionResult = convertRewardsToUSDT(level1NetworkRewards);
      const totalRewardUSDT = conversionResult.totalUSDT;
      
      console.log('Conversion result:', conversionResult);
      console.log('Total reward USDT:', totalRewardUSDT);
      
      if (totalRewardUSDT > 0) {
        // Update user balance
        const newBalance = testUser.balance + totalRewardUSDT;
        await User.findByIdAndUpdate(testUser._id, { balance: newBalance });
        
        console.log(`✅ Updated user balance from ${testUser.balance} to ${newBalance}`);
        console.log(`Added ${totalRewardUSDT} USDT to balance`);
      } else {
        console.log('No rewards to add - totalRewardUSDT is 0');
      }
    } else if (testUser.lvl1anim === 0) {
      console.log('User has not completed level 1 yet');
    } else {
      console.log('User already has balance > 0');
    }
    
    // Show final user state
    const updatedUser = await User.findById(testUser._id);
    console.log('\nFinal user state:');
    console.log(`Balance: ${updatedUser.balance}`);
    console.log(`Level 1 animation: ${updatedUser.lvl1anim}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixUserBalance();
