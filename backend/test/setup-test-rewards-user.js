/**
 * Setup script to create or update a test user with network rewards
 * This makes testing easier by providing a known user with known rewards
 * 
 * Usage: node test/setup-test-rewards-user.js
 */

import mongoose from 'mongoose';
import '../config/env.js';
import connectDB from '../database/mongodb.js';
import User from '../models/user.model.js';
import bcrypt from 'bcrypt';

const TEST_USER = {
  email: 'rewards-test@example.com',
  password: 'TestPass123!',
  name: 'Rewards Test User',
  phone: '1234567890',
  tier: 3,
  balance: 5000,
  // Level 1 rewards
  lvl1NetworkRewards: {
    BTC: 0.25,
    ETH: 1.0,
    TRON: 100,
    USDT: 50,
    BNB: 2.5,
    SOL: 5.0
  },
  // Level 2 rewards
  lvl2NetworkRewards: {
    BTC: 0.5,
    ETH: 2.0,
    TRON: 200,
    USDT: 100,
    BNB: 5.0,
    SOL: 10.0
  },
  // Level 3 rewards
  lvl3NetworkRewards: {
    BTC: 1.0,
    ETH: 4.0,
    TRON: 400,
    USDT: 200,
    BNB: 10.0,
    SOL: 20.0
  }
};

async function setupTestUser() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    // Check if user exists
    let user = await User.findOne({ email: TEST_USER.email });

    if (user) {
      console.log(`📝 Updating existing test user: ${TEST_USER.email}`);
      
      // Update user
      user.lvl1NetworkRewards = TEST_USER.lvl1NetworkRewards;
      user.lvl2NetworkRewards = TEST_USER.lvl2NetworkRewards;
      user.lvl3NetworkRewards = TEST_USER.lvl3NetworkRewards;
      user.tier = TEST_USER.tier;
      user.balance = TEST_USER.balance;
      
      await user.save();
      console.log('✅ User updated successfully\n');
    } else {
      console.log(`➕ Creating new test user: ${TEST_USER.email}`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
      
      // Create user
      user = await User.create({
        ...TEST_USER,
        password: hashedPassword
      });
      
      console.log('✅ User created successfully\n');
    }

    // Display user info
    console.log('═══════════════════════════════════════════════');
    console.log('📋 TEST USER CREDENTIALS');
    console.log('═══════════════════════════════════════════════');
    console.log(`Email:    ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log(`User ID:  ${user._id}`);
    console.log(`Tier:     ${user.tier}`);
    console.log(`Balance:  $${user.balance}`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('📊 NETWORK REWARDS PER LEVEL');
    console.log('═══════════════════════════════════════════════');
    
    for (let level = 1; level <= 3; level++) {
      const rewards = user[`lvl${level}NetworkRewards`];
      console.log(`\nLevel ${level}:`);
      console.log(`  BTC:  ${rewards.BTC}`);
      console.log(`  ETH:  ${rewards.ETH}`);
      console.log(`  TRON: ${rewards.TRON}`);
      console.log(`  USDT: ${rewards.USDT}`);
      console.log(`  BNB:  ${rewards.BNB}`);
      console.log(`  SOL:  ${rewards.SOL}`);
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ Setup complete!');
    console.log('═══════════════════════════════════════════════\n');

    console.log('🧪 TEST COMMANDS:');
    console.log('─────────────────────────────────────────────────');
    console.log('1. Test API with this user:');
    console.log(`   curl "http://localhost:5000/api/level?userId=${user._id}"\n`);
    
    console.log('2. Test specific level:');
    console.log(`   curl "http://localhost:5000/api/level/1?userId=${user._id}"\n`);
    
    console.log('3. Login on frontend:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}\n`);
    
    console.log('4. Run automated tests:');
    console.log('   node test/test-dynamic-rewards.js\n');
    
    console.log('─────────────────────────────────────────────────');
    console.log('💡 TIP: Save the User ID above for testing!\n');

  } catch (error) {
    console.error('❌ Error setting up test user:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
  }
}

setupTestUser();

