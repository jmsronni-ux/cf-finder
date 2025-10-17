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

async function testBackendCall() {
  try {
    await connectDB();
    
    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    console.log('=== Testing Backend Animation Completion ===');
    console.log('User:', user.name, user.email);
    console.log('Current balance:', user.balance);
    console.log('Level 1 animation status:', user.lvl1anim);
    console.log('Level 1 network rewards:', user.lvl1NetworkRewards);
    
    const level = 1;
    const alreadyWatched = user.lvl1anim === 1;
    
    console.log('\n=== Processing Animation Completion ===');
    console.log('Level:', level);
    console.log('Already watched:', alreadyWatched);
    
    // Get user's network rewards from user model
    const levelNetworkRewardsField = `lvl${level}NetworkRewards`;
    const userNetworkRewards = user[levelNetworkRewardsField] || {};
    
    console.log('User network rewards for level', level, ':', userNetworkRewards);
    console.log('User current balance:', user.balance);
    
    // Convert all rewards to USDT equivalent
    const conversionResult = convertRewardsToUSDT(userNetworkRewards);
    const totalRewardUSDT = conversionResult.totalUSDT;
    
    console.log('Conversion result:', conversionResult);
    console.log('Total reward USDT:', totalRewardUSDT);
    
    // Create response data
    const responseData = {
      success: true,
      message: `Animation marked as watched for level ${level}. Reward added to balance!`,
      data: {
        lvl1anim: user.lvl1anim,
        lvl2anim: user.lvl2anim,
        lvl3anim: user.lvl3anim,
        lvl4anim: user.lvl4anim,
        lvl5anim: user.lvl5anim,
        balance: user.balance,
        rewardAdded: true,
        networkRewards: userNetworkRewards,
        rewardBreakdown: [],
        totalRewardUSDT: totalRewardUSDT,
        conversionBreakdown: conversionResult.breakdown
      }
    };
    
    console.log('\n=== Backend Response ===');
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    console.log('totalRewardUSDT in response:', responseData.data.totalRewardUSDT);
    
  } catch (error) {
    console.error('Error testing backend call:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testBackendCall();
