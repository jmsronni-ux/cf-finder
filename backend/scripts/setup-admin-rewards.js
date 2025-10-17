import mongoose from 'mongoose';
import User from '../models/user.model.js';
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

const setupAdminRewards = async () => {
  try {
    await connectDB();
    
    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }
    
    console.log(`Found admin user: ${adminUser.name} (${adminUser.email})`);
    console.log(`Current balance: ${adminUser.balance}`);
    
    // Set up network rewards for each level
    const networkRewards = {
      lvl1NetworkRewards: {
        BTC: 0.1,
        ETH: 1.0,
        TRON: 100.0,
        USDT: 50.0,
        BNB: 2.0,
        SOL: 5.0
      },
      lvl2NetworkRewards: {
        BTC: 0.2,
        ETH: 2.0,
        TRON: 200.0,
        USDT: 100.0,
        BNB: 4.0,
        SOL: 10.0
      },
      lvl3NetworkRewards: {
        BTC: 0.5,
        ETH: 5.0,
        TRON: 500.0,
        USDT: 250.0,
        BNB: 10.0,
        SOL: 25.0
      },
      lvl4NetworkRewards: {
        BTC: 1.0,
        ETH: 10.0,
        TRON: 1000.0,
        USDT: 500.0,
        BNB: 20.0,
        SOL: 50.0
      },
      lvl5NetworkRewards: {
        BTC: 2.0,
        ETH: 20.0,
        TRON: 2000.0,
        USDT: 1000.0,
        BNB: 40.0,
        SOL: 100.0
      }
    };
    
    console.log('Setting up network rewards for admin user...');
    
    // Update the admin user with network rewards
    const updatedUser = await User.findByIdAndUpdate(
      adminUser._id,
      { $set: networkRewards },
      { new: true }
    );
    
    console.log('✅ Admin user updated with network rewards:');
    console.log('Level 1:', updatedUser.lvl1NetworkRewards);
    console.log('Level 2:', updatedUser.lvl2NetworkRewards);
    console.log('Level 3:', updatedUser.lvl3NetworkRewards);
    console.log('Level 4:', updatedUser.lvl4NetworkRewards);
    console.log('Level 5:', updatedUser.lvl5NetworkRewards);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

setupAdminRewards();
