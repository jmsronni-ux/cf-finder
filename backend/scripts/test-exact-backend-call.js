import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import { convertRewardsToUSDT } from '../utils/crypto-conversion.js';

// Connect to MongoDB
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

async function testExactBackendCall() {
  try {
    await connectDB();
    
    // Find the test user - simulate the exact backend query
    const userId = '68ee230a6a15098aadd84738';
    const currentUser = await User.findById(userId);
    
    if (!currentUser) {
      console.log('Test user not found');
      return;
    }
    
    console.log('=== Testing Exact Backend Call ===');
    console.log('User found:', currentUser.name, currentUser.email);
    console.log('User balance:', currentUser.balance);
    console.log('User lvl1anim:', currentUser.lvl1anim);
    
    // Simulate the exact backend logic
    const level = 1;
    const alreadyWatched = currentUser.lvl1anim === 1;
    
    console.log('\n=== Backend Logic Simulation ===');
    console.log('Level:', level);
    console.log('Already watched:', alreadyWatched);
    
    // Get user's network rewards from user model - EXACT same logic as backend
    const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
    const userNetworkRewards = currentUser[levelNetworkRewardsField] || {};
    
    console.log('Network rewards field:', levelNetworkRewardsField);
    console.log('Raw network rewards from user:', currentUser[levelNetworkRewardsField]);
    console.log('User network rewards for level', level, ':', userNetworkRewards);
    console.log('User current balance:', currentUser.balance);
    
    // Convert all rewards to USDT equivalent - EXACT same logic as backend
    console.log('Calling convertRewardsToUSDT with:', userNetworkRewards);
    const conversionResult = convertRewardsToUSDT(userNetworkRewards);
    const totalRewardUSDT = conversionResult.totalUSDT;
    console.log('Conversion function result:', conversionResult);
    
    console.log('Conversion result:', conversionResult);
    console.log('Total reward USDT:', totalRewardUSDT);
    
    if (totalRewardUSDT > 0) {
      const newBalance = currentUser.balance + totalRewardUSDT;
      console.log(`Adding level ${level} network rewards: $${totalRewardUSDT} USDT. New balance: $${newBalance}`);
      
      // Update the user's balance
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { balance: newBalance } },
        { new: true, runValidators: false }
      );
      
      console.log('✅ User balance updated in database');
      console.log('Updated balance in DB:', updatedUser.balance);
    } else {
      console.log(`No rewards to add - totalRewardUSDT is ${totalRewardUSDT}`);
    }
    
  } catch (error) {
    console.error('Error testing exact backend call:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testExactBackendCall();
