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
  },
  lvl2NetworkRewards: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    TRON: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    SOL: { type: Number, default: 0 }
  },
  lvl3NetworkRewards: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    TRON: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    SOL: { type: Number, default: 0 }
  },
  lvl4NetworkRewards: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    TRON: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    SOL: { type: Number, default: 0 }
  },
  lvl5NetworkRewards: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    TRON: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    SOL: { type: Number, default: 0 }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function checkUserRewards() {
  try {
    await connectDB();
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      console.log(`\n=== User: ${user.name} (${user.email}) ===`);
      console.log(`Balance: ${user.balance}`);
      console.log(`Tier: ${user.tier}`);
      console.log(`Animation status: lvl1=${user.lvl1anim}, lvl2=${user.lvl2anim}, lvl3=${user.lvl3anim}, lvl4=${user.lvl4anim}, lvl5=${user.lvl5anim}`);
      
      // Check level 1 network rewards
      console.log(`Level 1 Network Rewards:`, user.lvl1NetworkRewards);
      
      // Calculate total for level 1
      if (user.lvl1NetworkRewards) {
        const total = Object.values(user.lvl1NetworkRewards).reduce((sum, val) => sum + (val || 0), 0);
        console.log(`Level 1 Total Rewards: ${total}`);
        
        if (total === 0) {
          console.log(`❌ User has no level 1 network rewards!`);
          
          // Set default rewards for level 1
          const defaultRewards = {
            BTC: 0.1,
            ETH: 1,
            TRON: 1,
            USDT: 1,
            BNB: 1,
            SOL: 1
          };
          
          await User.findByIdAndUpdate(user._id, {
            lvl1NetworkRewards: defaultRewards
          });
          
          console.log(`✅ Set default level 1 rewards:`, defaultRewards);
        } else {
          console.log(`✅ User has level 1 network rewards`);
        }
      } else {
        console.log(`❌ User has no lvl1NetworkRewards field!`);
        
        // Set default rewards for level 1
        const defaultRewards = {
          BTC: 0.1,
          ETH: 1,
          TRON: 1,
          USDT: 1,
          BNB: 1,
          SOL: 1
        };
        
        await User.findByIdAndUpdate(user._id, {
          lvl1NetworkRewards: defaultRewards
        });
        
        console.log(`✅ Added lvl1NetworkRewards field with default values:`, defaultRewards);
      }
    }
    
    console.log('\n✅ User rewards check completed!');
    
  } catch (error) {
    console.error('Error checking user rewards:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the check
checkUserRewards();
