import connectDB from '../database/mongodb.js';
import User from '../models/user.model.js';
import UserNetworkReward from '../models/user-network-reward.model.js';
import NetworkReward from '../models/network-reward.model.js';

// Default reward multipliers for different user types
const userRewardMultipliers = {
  // VIP users get 2x rewards
  vip: {
    BTC: 2.0,
    ETH: 2.0,
    TRON: 2.0,
    USDT: 2.0,
    BNB: 2.0,
    SOL: 2.0
  },
  // Premium users get 1.5x rewards
  premium: {
    BTC: 1.5,
    ETH: 1.5,
    TRON: 1.5,
    USDT: 1.5,
    BNB: 1.5,
    SOL: 1.5
  },
  // Standard users get 1x rewards (use global)
  standard: {
    BTC: 1.0,
    ETH: 1.0,
    TRON: 1.0,
    USDT: 1.0,
    BNB: 1.0,
    SOL: 1.0
  },
  // Basic users get 0.5x rewards
  basic: {
    BTC: 0.5,
    ETH: 0.5,
    TRON: 0.5,
    USDT: 0.5,
    BNB: 0.5,
    SOL: 0.5
  }
};

const migrateUserRewards = async () => {
  try {
    console.log('🚀 Starting migration of user-specific network rewards...');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Get all users
    const users = await User.find({}).select('_id name email tier balance');
    console.log(`📊 Found ${users.length} users to process`);
    
    // Get global rewards
    const globalRewards = await NetworkReward.find({ isActive: true }).sort({ level: 1, network: 1 });
    console.log(`📊 Found ${globalRewards.length} global rewards`);
    
    if (globalRewards.length === 0) {
      console.log('⚠️  No global rewards found. Please run the network rewards migration first.');
      return;
    }
    
    // Clear existing user rewards (optional - remove this if you want to keep existing data)
    await UserNetworkReward.deleteMany({});
    console.log('🗑️  Cleared existing user network rewards');
    
    let processedUsers = 0;
    let createdRewards = 0;
    
    // Process each user
    for (const user of users) {
      const userTier = user.tier || 1;
      
      // Determine user type based on tier or balance
      let userType = 'standard';
      if (userTier >= 5 || user.balance >= 10000) {
        userType = 'vip';
      } else if (userTier >= 4 || user.balance >= 5000) {
        userType = 'premium';
      } else if (userTier <= 1 || user.balance < 100) {
        userType = 'basic';
      }
      
      const multipliers = userRewardMultipliers[userType];
      
      // Only create custom rewards if multipliers are different from 1.0
      if (multipliers.BTC !== 1.0) {
        console.log(`👤 Processing ${user.name} (${user.email}) - Type: ${userType}, Tier: ${userTier}, Balance: $${user.balance}`);
        
        // Create user-specific rewards for each level and network
        for (const globalReward of globalRewards) {
          const customAmount = globalReward.rewardAmount * multipliers[globalReward.network];
          
          if (customAmount !== globalReward.rewardAmount) {
            const userReward = await UserNetworkReward.create({
              userId: user._id,
              level: globalReward.level,
              network: globalReward.network,
              rewardAmount: customAmount,
              isActive: true,
              isCustom: true
            });
            
            createdRewards++;
            console.log(`  ✅ Created custom ${globalReward.network} reward for Level ${globalReward.level}: ${globalReward.rewardAmount} → ${customAmount} (${multipliers[globalReward.network]}x)`);
          }
        }
      } else {
        console.log(`👤 Skipping ${user.name} - using global rewards (standard user)`);
      }
      
      processedUsers++;
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Processed ${processedUsers} users`);
    console.log(`📊 Created ${createdRewards} custom user rewards`);
    
    // Show summary by user type
    console.log('\n📋 Summary by User Type:');
    for (const [type, multipliers] of Object.entries(userRewardMultipliers)) {
      const usersOfType = await UserNetworkReward.distinct('userId', { 
        rewardAmount: { $exists: true }
      });
      console.log(`${type}: ${multipliers.BTC}x multiplier - ${usersOfType.length} users with custom rewards`);
    }
    
    // Show sample rewards
    console.log('\n📋 Sample Custom Rewards:');
    const sampleRewards = await UserNetworkReward.find({}).limit(5).populate('userId', 'name email');
    for (const reward of sampleRewards) {
      console.log(`  ${reward.userId.name}: Level ${reward.level} ${reward.network} = ${reward.rewardAmount}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
};

// Run migration
migrateUserRewards();
