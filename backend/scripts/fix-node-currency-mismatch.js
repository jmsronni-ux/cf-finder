/**
 * Script to identify and report node ID / currency mismatches in Level data
 * This will help you understand which nodes have wrong IDs
 * 
 * Usage: node scripts/fix-node-currency-mismatch.js
 */

import mongoose from 'mongoose';
import '../config/env.js';
import connectDB from '../database/mongodb.js';
import Level from '../models/level.model.js';

async function analyzeNodeMismatches() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    const levels = await Level.find({}).sort({ level: 1 });
    
    console.log('🔍 ANALYZING NODE ID vs CURRENCY MISMATCHES\n');
    console.log('='.repeat(80) + '\n');

    for (const level of levels) {
      console.log(`\n📊 Level ${level.level} - ${level.name}`);
      console.log('-'.repeat(80));

      const fingerprints = level.nodes.filter(n => 
        n.type === 'fingerprintNode' && n.data?.transaction
      );

      let mismatchCount = 0;
      const mismatches = [];

      fingerprints.forEach(node => {
        const nodeId = node.id;
        const currency = node.data.transaction.currency;
        const status = node.data.transaction.status;
        
        // Expected prefix based on currency
        let expectedPrefix = currency.toLowerCase();
        if (currency === 'TRON') expectedPrefix = 'trx';
        
        const actualPrefix = nodeId.split('-')[0];
        
        const isMatch = actualPrefix === expectedPrefix || 
                       (currency === 'BTC' && actualPrefix === 'btc') ||
                       (currency === 'ETH' && actualPrefix === 'eth') ||
                       (currency === 'USDT' && actualPrefix === 'usdt') ||
                       (currency === 'TRON' && actualPrefix === 'trx') ||
                       (currency === 'BNB' && actualPrefix === 'bnb') ||
                       (currency === 'SOL' && actualPrefix === 'sol');
        
        if (!isMatch) {
          mismatchCount++;
          mismatches.push({
            nodeId,
            actualCurrency: currency,
            status,
            amount: node.data.transaction.amount
          });
        }
      });

      if (mismatchCount > 0) {
        console.log(`\n❌ Found ${mismatchCount} mismatches:`);
        mismatches.forEach(m => {
          console.log(`  ${m.nodeId} → Currency: ${m.actualCurrency} (${m.status}) - $${m.amount}`);
        });
      } else {
        console.log('\n✅ All node IDs match their currencies!');
      }

      console.log(`\nFingerprint nodes by actual currency:`);
      const byCurrency = {};
      fingerprints.forEach(n => {
        const curr = n.data.transaction.currency;
        if (!byCurrency[curr]) byCurrency[curr] = [];
        byCurrency[curr].push(`${n.id} (${n.data.transaction.status})`);
      });
      Object.entries(byCurrency).forEach(([curr, nodes]) => {
        console.log(`  ${curr}: ${nodes.join(', ')}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 RECOMMENDATION:');
    console.log('The node IDs are just labels and don\'t affect functionality.');
    console.log('The system correctly uses transaction.currency for distribution.');
    console.log('\nHowever, for clarity, you may want to:');
    console.log('1. Keep the current setup (works fine, just confusing visually)');
    console.log('2. Or manually update node IDs in MongoDB Compass to match currencies\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
  }
}

analyzeNodeMismatches();


