/**
 * Debug script to see what's happening with reward distribution
 * 
 * Usage: node scripts/debug-distribution.js
 */

import mongoose from 'mongoose';
import '../config/env.js';
import connectDB from '../database/mongodb.js';
import User from '../models/user.model.js';
import Level from '../models/level.model.js';
import { fetchConversionRates } from '../utils/crypto-conversion.js';
import { distributeNetworkRewards, getUserNetworkRewardsForLevel } from '../utils/level-distribution.js';

async function debugDistribution() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Get the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User:', user.name);
    console.log('📧 Email:', user.email);
    console.log('\n📊 USER NETWORK REWARDS:');
    console.log('Level 1:', user.lvl1NetworkRewards);
    console.log('Level 1 Total Reward Field:', user.lvl1reward);

    // Get conversion rates
    console.log('\n💱 FETCHING CONVERSION RATES...');
    const conversionRates = await fetchConversionRates();
    console.log('Conversion Rates:', conversionRates);

    // Get Level 1
    console.log('\n🎮 FETCHING LEVEL 1...');
    const level1 = await Level.findOne({ level: 1 });
    if (!level1) {
      console.log('❌ Level 1 not found');
      return;
    }

    // Count nodes
    const fingerprintNodes = level1.nodes.filter(n => n.type === 'fingerprintNode' && n.data?.transaction);
    const successNodes = fingerprintNodes.filter(n => n.data.transaction.status === 'Success');
    
    console.log(`Total fingerprint nodes: ${fingerprintNodes.length}`);
    console.log(`Success nodes: ${successNodes.length}`);
    console.log(`Fail/Pending nodes: ${fingerprintNodes.length - successNodes.length}`);

    // Group by currency
    const nodesByCurrency = {};
    successNodes.forEach(node => {
      const currency = node.data.transaction.currency === 'TRX' ? 'TRON' : node.data.transaction.currency;
      if (!nodesByCurrency[currency]) {
        nodesByCurrency[currency] = [];
      }
      nodesByCurrency[currency].push(node.id);
    });

    console.log('\n📈 SUCCESS NODES BY CURRENCY:');
    Object.entries(nodesByCurrency).forEach(([currency, nodes]) => {
      console.log(`  ${currency}: ${nodes.length} nodes - ${nodes.join(', ')}`);
    });

    // Get user network rewards
    console.log('\n💰 EXPECTED USD CALCULATION:');
    const userNetworkRewards = getUserNetworkRewardsForLevel(user, 1);
    Object.entries(userNetworkRewards).forEach(([network, cryptoAmount]) => {
      const rate = conversionRates[network] || 1;
      const usdAmount = cryptoAmount * rate;
      const nodeCount = nodesByCurrency[network]?.length || 0;
      const perNode = nodeCount > 0 ? usdAmount / nodeCount : 0;
      
      console.log(`  ${network}:`);
      console.log(`    Crypto: ${cryptoAmount} ${network}`);
      console.log(`    Rate: $${rate}`);
      console.log(`    Total USD: $${usdAmount.toFixed(2)}`);
      console.log(`    Success nodes: ${nodeCount}`);
      console.log(`    ~Average per node: $${perNode.toFixed(2)}`);
    });

    // Apply distribution
    console.log('\n🔄 APPLYING DISTRIBUTION...');
    const levelObj = level1.toObject();
    const distributedLevel = distributeNetworkRewards(levelObj, userNetworkRewards, conversionRates);

    // Show actual distributed amounts
    console.log('\n✅ ACTUAL DISTRIBUTED AMOUNTS:');
    const distributedFingerprints = distributedLevel.nodes.filter(n => 
      n.type === 'fingerprintNode' && 
      n.data?.transaction?.status === 'Success'
    );

    const resultByCurrency = {};
    distributedFingerprints.forEach(node => {
      const currency = node.data.transaction.currency === 'TRX' ? 'TRON' : node.data.transaction.currency;
      if (!resultByCurrency[currency]) {
        resultByCurrency[currency] = [];
      }
      resultByCurrency[currency].push({
        id: node.id,
        amount: node.data.transaction.amount
      });
    });

    Object.entries(resultByCurrency).forEach(([currency, nodes]) => {
      const total = nodes.reduce((sum, n) => sum + n.amount, 0);
      console.log(`\n  ${currency}: Total $${total.toFixed(2)}`);
      nodes.forEach(n => {
        console.log(`    ${n.id}: $${n.amount.toFixed(2)}`);
      });
    });

    // Summary
    const grandTotal = distributedFingerprints.reduce((sum, n) => sum + n.data.transaction.amount, 0);
    console.log(`\n💵 GRAND TOTAL: $${grandTotal.toFixed(2)}`);
    
    const expectedTotal = Object.entries(userNetworkRewards).reduce((sum, [network, amount]) => {
      return sum + (amount * (conversionRates[network] || 1));
    }, 0);
    console.log(`📊 EXPECTED TOTAL: $${expectedTotal.toFixed(2)}`);
    
    if (Math.abs(grandTotal - expectedTotal) < 1) {
      console.log('✅ TOTALS MATCH!');
    } else {
      console.log('❌ TOTALS DO NOT MATCH!');
      console.log(`   Difference: $${(grandTotal - expectedTotal).toFixed(2)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

debugDistribution();


