import connectDB from '../database/mongodb.js';
import NetworkReward from '../models/network-reward.model.js';

// Default reward structure based on typical crypto rewards
const defaultNetworkRewards = {
  1: { // Basic Tier
    BTC: 0.001,   // ~$50
    ETH: 0.02,    // ~$50
    TRON: 100,    // ~$10
    USDT: 50,     // $50
    BNB: 0.1,     // ~$50
    SOL: 2        // ~$50
  },
  2: { // Standard Tier
    BTC: 0.002,   // ~$100
    ETH: 0.04,    // ~$100
    TRON: 200,    // ~$20
    USDT: 100,    // $100
    BNB: 0.2,     // ~$100
    SOL: 4        // ~$100
  },
  3: { // Professional Tier
    BTC: 0.005,   // ~$250
    ETH: 0.1,     // ~$250
    TRON: 500,    // ~$50
    USDT: 250,    // $250
    BNB: 0.5,     // ~$250
    SOL: 10       // ~$250
  },
  4: { // Enterprise Tier
    BTC: 0.01,    // ~$500
    ETH: 0.2,     // ~$500
    TRON: 1000,   // ~$100
    USDT: 500,    // $500
    BNB: 1,       // ~$500
    SOL: 20       // ~$500
  },
  5: { // Premium Tier
    BTC: 0.02,    // ~$1000
    ETH: 0.4,     // ~$1000
    TRON: 2000,   // ~$200
    USDT: 1000,   // $1000
    BNB: 2,       // ~$1000
    SOL: 40       // ~$1000
  }
};

const migrateRewards = async () => {
  try {
    console.log('🚀 Starting migration of network rewards...');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Clear existing rewards (optional - remove this if you want to keep existing data)
    await NetworkReward.deleteMany({});
    console.log('🗑️  Cleared existing network rewards');
    
    // Create rewards for each level and network
    const createdRewards = [];
    
    for (const [level, networkRewards] of Object.entries(defaultNetworkRewards)) {
      const levelNumber = parseInt(level);
      
      for (const [network, amount] of Object.entries(networkRewards)) {
        const reward = await NetworkReward.create({
          level: levelNumber,
          network,
          rewardAmount: amount,
          isActive: true
        });
        
        createdRewards.push(reward);
        console.log(`✅ Created reward: Level ${levelNumber} - ${network}: ${amount}`);
      }
    }
    
    console.log(`\n🎉 Migration completed! Created ${createdRewards.length} network rewards`);
    
    // Verify migration
    const totalRewards = await NetworkReward.countDocuments();
    console.log(`📊 Total rewards in database: ${totalRewards}`);
    
    // Show summary
    console.log('\n📋 Reward Summary by Level:');
    for (let level = 1; level <= 5; level++) {
      const levelRewards = await NetworkReward.find({ level }).sort({ network: 1 });
      console.log(`\nLevel ${level}:`);
      levelRewards.forEach(reward => {
        console.log(`  - ${reward.network}: ${reward.rewardAmount}`);
      });
    }
    
    console.log('\n📋 Reward Summary by Network:');
    const networks = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];
    for (const network of networks) {
      const networkRewards = await NetworkReward.find({ network }).sort({ level: 1 });
      console.log(`\n${network}:`);
      networkRewards.forEach(reward => {
        console.log(`  - Level ${reward.level}: ${reward.rewardAmount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
};

// Run migration
migrateRewards();
