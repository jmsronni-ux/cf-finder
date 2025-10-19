/**
 * Script to ensure each network has at least one Success node in each level
 * This is required for testing the new USD distribution functionality
 * 
 * Usage: node scripts/ensure-success-nodes.js
 */

import mongoose from 'mongoose';
import '../config/env.js';
import connectDB from '../database/mongodb.js';
import Level from '../models/level.model.js';

const NETWORKS = ['BTC', 'ETH', 'TRON', 'USDT', 'BNB', 'SOL'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function ensureSuccessNodes() {
  try {
    await connectDB();
    log('\n✅ Connected to database\n', 'green');

    const levels = await Level.find({}).sort({ level: 1 });
    
    if (levels.length === 0) {
      log('❌ No levels found in database', 'red');
      return;
    }

    log(`Found ${levels.length} levels\n`, 'blue');

    let totalUpdates = 0;

    for (const level of levels) {
      log(`\n${'='.repeat(60)}`, 'blue');
      log(`Processing Level ${level.level} - ${level.name}`, 'blue');
      log('='.repeat(60), 'blue');

      let levelUpdated = false;

      // Group fingerprint nodes by network
      const nodesByNetwork = {};
      level.nodes.forEach((node, index) => {
        if (node.type === 'fingerprintNode' && node.data && node.data.transaction) {
          const currency = node.data.transaction.currency;
          const normalizedCurrency = currency === 'TRX' ? 'TRON' : currency;
          
          if (!nodesByNetwork[normalizedCurrency]) {
            nodesByNetwork[normalizedCurrency] = [];
          }
          
          nodesByNetwork[normalizedCurrency].push({
            index,
            id: node.id,
            status: node.data.transaction.status,
            amount: node.data.transaction.amount
          });
        }
      });

      log('\nCurrent fingerprint nodes per network:', 'yellow');
      Object.entries(nodesByNetwork).forEach(([network, nodes]) => {
        const successCount = nodes.filter(n => n.status === 'Success').length;
        const failCount = nodes.filter(n => n.status === 'Fail').length;
        const pendingCount = nodes.filter(n => n.status === 'Pending').length;
        
        console.log(`  ${network}: ${nodes.length} total (${successCount} Success, ${failCount} Fail, ${pendingCount} Pending)`);
      });

      // Check each network and ensure at least one Success node
      for (const network of NETWORKS) {
        const nodes = nodesByNetwork[network] || [];
        const successNodes = nodes.filter(n => n.status === 'Success');

        if (nodes.length === 0) {
          log(`\n  ⚠️  ${network}: No fingerprint nodes found (skipping)`, 'yellow');
          continue;
        }

        if (successNodes.length === 0) {
          log(`\n  🔧 ${network}: No Success nodes, converting first node...`, 'yellow');
          
          // Find first node to convert (prefer Fail over Pending)
          const failNodes = nodes.filter(n => n.status === 'Fail');
          const nodeToConvert = failNodes.length > 0 ? failNodes[0] : nodes[0];
          
          // Update the node status to Success
          level.nodes[nodeToConvert.index].data.transaction.status = 'Success';
          
          log(`    ✅ Converted ${nodeToConvert.id} (${nodeToConvert.status} → Success)`, 'green');
          levelUpdated = true;
          totalUpdates++;
        } else {
          log(`\n  ✅ ${network}: Already has ${successNodes.length} Success node(s)`, 'green');
        }
      }

      // Save the level if updated
      if (levelUpdated) {
        level.metadata.updatedAt = new Date();
        await level.save();
        log(`\n  💾 Level ${level.level} saved with updates`, 'green');
      } else {
        log(`\n  ℹ️  Level ${level.level} already has Success nodes for all networks`, 'blue');
      }
    }

    log('\n' + '='.repeat(60), 'blue');
    log('SUMMARY', 'blue');
    log('='.repeat(60), 'blue');
    log(`Total nodes converted to Success: ${totalUpdates}`, totalUpdates > 0 ? 'green' : 'blue');
    
    if (totalUpdates > 0) {
      log('\n✅ Database updated successfully!', 'green');
      log('All levels now have at least one Success node per network.', 'green');
    } else {
      log('\n✅ Database already has Success nodes for all networks!', 'green');
    }

    // Display final state
    log('\n' + '='.repeat(60), 'blue');
    log('FINAL STATE - SUCCESS NODES PER NETWORK', 'blue');
    log('='.repeat(60) + '\n', 'blue');

    const finalLevels = await Level.find({}).sort({ level: 1 });
    for (const level of finalLevels) {
      console.log(`Level ${level.level}:`);
      
      const nodesByNetwork = {};
      level.nodes.forEach((node) => {
        if (node.type === 'fingerprintNode' && node.data && node.data.transaction) {
          const currency = node.data.transaction.currency === 'TRX' ? 'TRON' : node.data.transaction.currency;
          if (!nodesByNetwork[currency]) {
            nodesByNetwork[currency] = { success: 0, fail: 0, pending: 0 };
          }
          const status = node.data.transaction.status.toLowerCase();
          nodesByNetwork[currency][status] = (nodesByNetwork[currency][status] || 0) + 1;
        }
      });

      NETWORKS.forEach(network => {
        const counts = nodesByNetwork[network] || { success: 0, fail: 0, pending: 0 };
        const hasSuccess = counts.success > 0;
        const symbol = hasSuccess ? '✅' : '❌';
        console.log(`  ${symbol} ${network}: ${counts.success} Success, ${counts.fail} Fail, ${counts.pending} Pending`);
      });
      console.log();
    }

  } catch (error) {
    log('\n❌ Error:', 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('Database connection closed\n', 'blue');
  }
}

// Run the script
ensureSuccessNodes();


