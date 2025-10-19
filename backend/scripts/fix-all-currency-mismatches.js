/**
 * Script to fix all node ID / currency mismatches in Level data
 * This will update transaction.currency to match the node ID prefix
 * 
 * Usage: node scripts/fix-all-currency-mismatches.js
 */

import mongoose from 'mongoose';
import '../config/env.js';
import connectDB from '../database/mongodb.js';
import Level from '../models/level.model.js';

// Map node ID prefix to correct currency
function getCurrencyFromNodeId(nodeId) {
  if (nodeId.startsWith('btc-')) return 'BTC';
  if (nodeId.startsWith('eth-')) return 'ETH';
  if (nodeId.startsWith('usdt-')) return 'USDT';
  if (nodeId.startsWith('sol-')) return 'SOL';
  if (nodeId.startsWith('bnb-')) return 'BNB';
  if (nodeId.startsWith('trx-') || nodeId.startsWith('trx') || nodeId === 'trx-child1') return 'TRX';
  
  // For generic node IDs (fp11, fp12, etc.), we can't determine currency
  // Return null to skip these
  return null;
}

async function fixAllCurrencies() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    const levels = await Level.find({}).sort({ level: 1 });
    
    console.log('🔧 FIXING CURRENCY MISMATCHES\n');
    console.log('='.repeat(80) + '\n');

    let totalFixed = 0;

    for (const level of levels) {
      console.log(`\n📊 Level ${level.level} - ${level.name}`);
      console.log('-'.repeat(80));

      let levelFixed = 0;
      let levelSkipped = 0;

      level.nodes.forEach((node, index) => {
        if (node.type === 'fingerprintNode' && node.data?.transaction) {
          const nodeId = node.id;
          const currentCurrency = node.data.transaction.currency;
          const expectedCurrency = getCurrencyFromNodeId(nodeId);

          if (expectedCurrency === null) {
            console.log(`  ⚠️  Skipped ${nodeId} (generic ID, can't determine currency)`);
            levelSkipped++;
            return;
          }

          // Normalize TRX/TRON
          const normalizedCurrent = currentCurrency === 'TRON' ? 'TRX' : currentCurrency;
          const normalizedExpected = expectedCurrency === 'TRON' ? 'TRX' : expectedCurrency;

          if (normalizedCurrent !== normalizedExpected) {
            console.log(`  🔧 Fixing ${nodeId}: ${currentCurrency} → ${expectedCurrency} (${node.data.transaction.status})`);
            level.nodes[index].data.transaction.currency = expectedCurrency;
            levelFixed++;
            totalFixed++;
          } else {
            console.log(`  ✅ ${nodeId}: ${currentCurrency} (already correct)`);
          }
        }
      });

      if (levelFixed > 0) {
        level.metadata.updatedAt = new Date();
        await level.save();
        console.log(`\n  💾 Saved Level ${level.level} - Fixed ${levelFixed} nodes`);
      } else {
        console.log(`\n  ℹ️  Level ${level.level} - No fixes needed`);
      }

      if (levelSkipped > 0) {
        console.log(`  ℹ️  Skipped ${levelSkipped} generic nodes`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total currencies fixed: ${totalFixed}`);
    
    if (totalFixed > 0) {
      console.log('\n✅ Database updated successfully!');
      console.log('All node currencies now match their IDs.\n');
      
      console.log('🎯 NEXT STEPS:');
      console.log('1. Restart your backend server');
      console.log('2. Hard refresh your browser (Ctrl+Shift+R)');
      console.log('3. Check the animation - amounts should now be correct!\n');
      
      console.log('💡 EXPECTED RESULT:');
      console.log('- btc-fp1, btc-fp2 → Will show BTC rewards in USD');
      console.log('- eth-fp1, eth-fp2 → Will show ETH rewards in USD');
      console.log('- usdt-fp1, usdt-fp2 → Will show USDT rewards in USD');
      console.log('- And so on for all networks...\n');
    } else {
      console.log('\n✅ All currencies already correct!\n');
    }

    // Display final verification
    console.log('='.repeat(80));
    console.log('🔍 VERIFICATION - Currency Distribution by Node ID\n');
    
    const finalLevels = await Level.find({}).sort({ level: 1 });
    for (const level of finalLevels) {
      console.log(`Level ${level.level}:`);
      
      const fingerprints = level.nodes.filter(n => 
        n.type === 'fingerprintNode' && n.data?.transaction
      );

      const byCurrency = {};
      fingerprints.forEach(n => {
        const currency = n.data.transaction.currency;
        if (!byCurrency[currency]) byCurrency[currency] = [];
        byCurrency[currency].push(`${n.id} (${n.data.transaction.status})`);
      });

      Object.entries(byCurrency).sort().forEach(([currency, nodes]) => {
        const allMatch = nodes.every(nodeStr => {
          const nodeId = nodeStr.split(' ')[0];
          const prefix = nodeId.split('-')[0];
          return (
            (currency === 'BTC' && prefix === 'btc') ||
            (currency === 'ETH' && prefix === 'eth') ||
            (currency === 'USDT' && prefix === 'usdt') ||
            (currency === 'SOL' && prefix === 'sol') ||
            (currency === 'BNB' && prefix === 'bnb') ||
            (currency === 'TRX' && (prefix === 'trx' || prefix === 'bnb')) ||
            prefix.startsWith('fp') // Generic nodes
          );
        });
        
        const symbol = allMatch ? '✅' : '❌';
        console.log(`  ${symbol} ${currency}: ${nodes.join(', ')}`);
      });
      console.log();
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
  }
}

fixAllCurrencies();


