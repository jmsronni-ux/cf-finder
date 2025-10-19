/**
 * Test script for dynamic network reward distribution
 * 
 * This script tests:
 * 1. Distribution utility functions
 * 2. Level controller with userId parameter
 * 3. Proper amount distribution across fingerprint nodes
 * 
 * Usage: node test/test-dynamic-rewards.js
 */

import mongoose from 'mongoose';
import '../config/env.js';
import connectDB from '../database/mongodb.js';
import User from '../models/user.model.js';
import Level from '../models/level.model.js';
import { distributeNetworkRewards, getUserNetworkRewardsForLevel } from '../utils/level-distribution.js';

const TEST_USER_EMAIL = 'test-rewards@example.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Distribution utility function
function testDistributionUtility() {
  logSection('TEST 1: Distribution Utility Function');
  
  // Mock level data with fingerprint nodes
  const mockLevelData = {
    level: 1,
    name: 'Test Level',
    nodes: [
      {
        id: 'center',
        type: 'accountNode',
        data: { label: 'Account' }
      },
      {
        id: 'btc-fp1',
        type: 'fingerprintNode',
        data: {
          label: 'FP1',
          transaction: {
            id: 'tx_001',
            currency: 'BTC',
            amount: 0.025,
            status: 'Success'
          }
        }
      },
      {
        id: 'btc-fp2',
        type: 'fingerprintNode',
        data: {
          label: 'FP2',
          transaction: {
            id: 'tx_002',
            currency: 'BTC',
            amount: 0.030,
            status: 'Fail'
          }
        }
      },
      {
        id: 'eth-fp1',
        type: 'fingerprintNode',
        data: {
          label: 'FP3',
          transaction: {
            id: 'tx_003',
            currency: 'ETH',
            amount: 1.0,
            status: 'Success'
          }
        }
      },
      {
        id: 'eth-fp2',
        type: 'fingerprintNode',
        data: {
          label: 'FP4',
          transaction: {
            id: 'tx_004',
            currency: 'ETH',
            amount: 1.5,
            status: 'Pending'
          }
        }
      }
    ]
  };
  
  // Test rewards
  const testRewards = {
    BTC: 0.5,
    ETH: 2.0,
    USDT: 100
  };
  
  logInfo('Distributing rewards:');
  console.log('  BTC: 0.5 across 2 fingerprints');
  console.log('  ETH: 2.0 across 2 fingerprints');
  console.log('  USDT: 100 across 0 fingerprints (should be ignored)\n');
  
  const result = distributeNetworkRewards(mockLevelData, testRewards);
  
  // Verify BTC distribution
  const btcNodes = result.nodes.filter(n => 
    n.type === 'fingerprintNode' && n.data.transaction?.currency === 'BTC'
  );
  const btcTotal = btcNodes.reduce((sum, n) => sum + n.data.transaction.amount, 0);
  
  logInfo(`BTC fingerprints found: ${btcNodes.length}`);
  btcNodes.forEach((node, i) => {
    console.log(`  ${node.id}: ${node.data.transaction.amount.toFixed(4)} BTC`);
  });
  console.log(`  Total: ${btcTotal.toFixed(4)} BTC`);
  
  if (Math.abs(btcTotal - 0.5) < 0.01) {
    logSuccess('BTC distribution total matches expected (0.5)');
  } else {
    logError(`BTC distribution total mismatch: expected 0.5, got ${btcTotal.toFixed(4)}`);
  }
  
  // Verify ETH distribution
  const ethNodes = result.nodes.filter(n => 
    n.type === 'fingerprintNode' && n.data.transaction?.currency === 'ETH'
  );
  const ethTotal = ethNodes.reduce((sum, n) => sum + n.data.transaction.amount, 0);
  
  console.log();
  logInfo(`ETH fingerprints found: ${ethNodes.length}`);
  ethNodes.forEach((node, i) => {
    console.log(`  ${node.id}: ${node.data.transaction.amount.toFixed(4)} ETH`);
  });
  console.log(`  Total: ${ethTotal.toFixed(4)} ETH`);
  
  if (Math.abs(ethTotal - 2.0) < 0.01) {
    logSuccess('ETH distribution total matches expected (2.0)');
  } else {
    logError(`ETH distribution total mismatch: expected 2.0, got ${ethTotal.toFixed(4)}`);
  }
  
  // Verify amounts are different (random distribution)
  if (btcNodes[0].data.transaction.amount !== btcNodes[1].data.transaction.amount) {
    logSuccess('BTC amounts are randomly distributed (not equal)');
  } else {
    logWarning('BTC amounts are equal (might be coincidence, but should be rare)');
  }
  
  return {
    success: Math.abs(btcTotal - 0.5) < 0.01 && Math.abs(ethTotal - 2.0) < 0.01,
    btcTotal,
    ethTotal
  };
}

// Test 2: Get user network rewards for level
async function testGetUserRewards() {
  logSection('TEST 2: Get User Network Rewards for Level');
  
  // Find or create test user
  let testUser = await User.findOne({ email: TEST_USER_EMAIL });
  
  if (!testUser) {
    logInfo('Creating test user...');
    testUser = await User.create({
      name: 'Test Rewards User',
      email: TEST_USER_EMAIL,
      password: 'testpassword123',
      phone: '1234567890',
      tier: 1,
      lvl1NetworkRewards: {
        BTC: 0.15,
        ETH: 1.5,
        TRON: 150,
        USDT: 75,
        BNB: 3,
        SOL: 7.5
      }
    });
    logSuccess(`Created test user: ${testUser.email}`);
  } else {
    logInfo(`Using existing test user: ${testUser.email}`);
  }
  
  const level1Rewards = getUserNetworkRewardsForLevel(testUser, 1);
  
  logInfo('Level 1 Network Rewards:');
  Object.entries(level1Rewards).forEach(([network, amount]) => {
    if (amount > 0) {
      console.log(`  ${network}: ${amount}`);
    }
  });
  
  if (level1Rewards.BTC === 0.15 && level1Rewards.ETH === 1.5) {
    logSuccess('Successfully extracted user network rewards');
  } else {
    logError('Failed to extract correct network rewards');
  }
  
  return {
    success: level1Rewards.BTC === 0.15,
    testUser
  };
}

// Test 3: Full integration with actual level data
async function testFullIntegration(testUser) {
  logSection('TEST 3: Full Integration with Database Level');
  
  const level1 = await Level.findOne({ level: 1 });
  
  if (!level1) {
    logError('Level 1 not found in database');
    return { success: false };
  }
  
  logInfo(`Found Level 1 with ${level1.nodes.length} nodes`);
  
  // Count fingerprint nodes by currency
  const fingerprintCounts = {};
  level1.nodes.forEach(node => {
    if (node.type === 'fingerprintNode' && node.data.transaction) {
      const currency = node.data.transaction.currency;
      fingerprintCounts[currency] = (fingerprintCounts[currency] || 0) + 1;
    }
  });
  
  logInfo('Fingerprint nodes per currency:');
  Object.entries(fingerprintCounts).forEach(([currency, count]) => {
    console.log(`  ${currency}: ${count} nodes`);
  });
  
  // Get user rewards
  const userRewards = getUserNetworkRewardsForLevel(testUser, 1);
  
  console.log();
  logInfo('Applying user rewards to Level 1...');
  
  // Apply distribution
  const levelObj = level1.toObject();
  const distributedLevel = distributeNetworkRewards(levelObj, userRewards);
  
  // Verify distribution for each currency
  let allSuccess = true;
  
  for (const [currency, expectedTotal] of Object.entries(userRewards)) {
    if (expectedTotal === 0) continue;
    
    const currencyNodes = distributedLevel.nodes.filter(n => 
      n.type === 'fingerprintNode' && 
      n.data.transaction?.currency === currency
    );
    
    if (currencyNodes.length === 0) {
      logWarning(`No ${currency} fingerprint nodes found (skipping)`);
      continue;
    }
    
    const actualTotal = currencyNodes.reduce((sum, n) => 
      sum + n.data.transaction.amount, 0
    );
    
    const difference = Math.abs(actualTotal - expectedTotal);
    const tolerance = expectedTotal * 0.01; // 1% tolerance for rounding
    
    console.log();
    logInfo(`${currency} Distribution:`);
    console.log(`  Expected total: ${expectedTotal}`);
    console.log(`  Actual total: ${actualTotal.toFixed(4)}`);
    console.log(`  Nodes: ${currencyNodes.length}`);
    console.log(`  Individual amounts:`);
    currencyNodes.forEach(node => {
      console.log(`    ${node.id}: ${node.data.transaction.amount}`);
    });
    
    if (difference <= tolerance) {
      logSuccess(`${currency} distribution correct (difference: ${difference.toFixed(6)})`);
    } else {
      logError(`${currency} distribution incorrect (difference: ${difference.toFixed(6)})`);
      allSuccess = false;
    }
  }
  
  return { success: allSuccess };
}

// Main test runner
async function runTests() {
  try {
    log('\n🚀 Starting Dynamic Network Reward Tests\n', 'bright');
    
    await connectDB();
    logSuccess('Connected to database\n');
    
    // Run tests
    const test1Result = testDistributionUtility();
    const test2Result = await testGetUserRewards();
    const test3Result = await testFullIntegration(test2Result.testUser);
    
    // Summary
    logSection('TEST SUMMARY');
    
    const results = [
      { name: 'Distribution Utility', passed: test1Result.success },
      { name: 'Get User Rewards', passed: test2Result.success },
      { name: 'Full Integration', passed: test3Result.success }
    ];
    
    results.forEach(result => {
      if (result.passed) {
        logSuccess(`${result.name}: PASSED`);
      } else {
        logError(`${result.name}: FAILED`);
      }
    });
    
    const allPassed = results.every(r => r.passed);
    
    console.log();
    if (allPassed) {
      log('🎉 ALL TESTS PASSED! System is ready for production.', 'green');
    } else {
      log('⚠️  SOME TESTS FAILED. Please review the errors above.', 'red');
    }
    
    console.log();
    logInfo('Next steps:');
    console.log('1. Test the frontend by logging in with different users');
    console.log('2. Set custom rewards via admin panel');
    console.log('3. Verify amounts appear correctly in animations');
    console.log('4. Check browser console for any errors');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('\nDatabase connection closed', 'blue');
  }
}

// Run tests
runTests();

