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

async function resetUserForTesting() {
  try {
    await connectDB();
    
    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    console.log('=== Resetting User for Testing ===');
    console.log('User before reset:', {
      name: user.name,
      email: user.email,
      balance: user.balance,
      tier: user.tier,
      lvl1anim: user.lvl1anim,
      lvl2anim: user.lvl2anim,
      lvl3anim: user.lvl3anim,
      lvl4anim: user.lvl4anim,
      lvl5anim: user.lvl5anim,
      lvl1NetworkRewards: user.lvl1NetworkRewards
    });
    
    // Reset user to initial state
    const resetData = {
      balance: 0,
      tier: 0,
      lvl1anim: 0,
      lvl2anim: 0,
      lvl3anim: 0,
      lvl4anim: 0,
      lvl5anim: 0,
      // Keep network rewards as they are
      lvl1NetworkRewards: {
        BTC: 0.1,
        ETH: 1,
        TRON: 1,
        USDT: 11,
        BNB: 1,
        SOL: 1
      }
    };
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: resetData },
      { new: true, runValidators: false }
    );
    
    console.log('\n=== User After Reset ===');
    console.log('User after reset:', {
      name: updatedUser.name,
      email: updatedUser.email,
      balance: updatedUser.balance,
      tier: updatedUser.tier,
      lvl1anim: updatedUser.lvl1anim,
      lvl2anim: updatedUser.lvl2anim,
      lvl3anim: updatedUser.lvl3anim,
      lvl4anim: updatedUser.lvl4anim,
      lvl5anim: updatedUser.lvl5anim,
      lvl1NetworkRewards: updatedUser.lvl1NetworkRewards
    });
    
    console.log('\n✅ User reset successfully!');
    console.log('Now you can:');
    console.log('1. Go to the frontend');
    console.log('2. Start the level 1 animation');
    console.log('3. Complete the animation');
    console.log('4. Check if balance updates to 7911.1 USDT');
    
  } catch (error) {
    console.error('Error resetting user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the reset
resetUserForTesting();
