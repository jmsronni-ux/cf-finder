import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';

// Connect to MongoDB to get a test token
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  balance: Number,
  tier: Number,
  lvl1anim: Number,
  lvl2anim: Number,
  lvl3anim: Number,
  lvl4anim: Number,
  lvl5anim: Number,
  lvl1NetworkRewards: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    TRON: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    SOL: { type: Number, default: 0 }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function testActualEndpoint() {
  try {
    await connectDB();
    
    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    console.log('=== Testing Actual Backend Endpoint ===');
    console.log('User:', user.name, user.email);
    console.log('Current balance:', user.balance);
    console.log('Level 1 network rewards:', user.lvl1NetworkRewards);
    
    // For this test, we'll simulate the request without actually calling the endpoint
    // since we don't have a proper JWT token setup
    
    console.log('\n=== Simulating Backend Logic ===');
    
    const level = 1;
    const alreadyWatched = user.lvl1anim === 1;
    
    console.log('Level:', level);
    console.log('Already watched:', alreadyWatched);
    
    // Get user's network rewards from user model
    const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
    const userNetworkRewards = user[levelNetworkRewardsField] || {};
    
    console.log('User network rewards for level', level, ':', userNetworkRewards);
    console.log('User current balance:', user.balance);
    
    // Import the conversion function
    const { convertRewardsToUSDT } = await import('../utils/crypto-conversion.js');
    
    // Convert all rewards to USDT equivalent
    const conversionResult = convertRewardsToUSDT(userNetworkRewards);
    const totalRewardUSDT = conversionResult.totalUSDT;
    
    console.log('Conversion result:', conversionResult);
    console.log('Total reward USDT:', totalRewardUSDT);
    
    if (totalRewardUSDT > 0) {
      const newBalance = user.balance + totalRewardUSDT;
      console.log(`Adding level ${level} network rewards: $${totalRewardUSDT} USDT. New balance: $${newBalance}`);
      
      // Update the user's balance
      await User.findByIdAndUpdate(user._id, { balance: newBalance });
      console.log('✅ User balance updated in database');
      
      // Verify the update
      const updatedUser = await User.findById(user._id);
      console.log('Updated balance in DB:', updatedUser.balance);
    } else {
      console.log(`No rewards to add - totalRewardUSDT is ${totalRewardUSDT}`);
    }
    
  } catch (error) {
    console.error('Error testing actual endpoint:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testActualEndpoint();
