import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';

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

async function checkUserTier() {
  try {
    await connectDB();
    
    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    console.log('=== User Tier Check ===');
    console.log('User:', user.name, user.email);
    console.log('User ID:', user._id);
    console.log('User tier:', user.tier);
    console.log('User balance:', user.balance);
    console.log('User lvl1anim:', user.lvl1anim);
    console.log('User lvl1NetworkRewards:', user.lvl1NetworkRewards);
    
    // Check tier logic
    const effectiveTier = user.tier || 1;
    const level = 1;
    
    console.log('\n=== Tier Check Logic ===');
    console.log('Effective tier:', effectiveTier);
    console.log('Level requested:', level);
    console.log('Tier >= level?', effectiveTier >= level);
    
    if (effectiveTier < level) {
      console.log('❌ Tier too low for level');
    } else {
      console.log('✅ Tier check passed');
    }
    
  } catch (error) {
    console.error('Error checking user tier:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the check
checkUserTier();
