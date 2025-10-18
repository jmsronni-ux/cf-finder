import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Level from '../models/level.model.js';

async function fixUSDTPosition() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all levels
    const levels = await Level.find({}).sort({ level: 1 });
    console.log(`📖 Found ${levels.length} levels to update`);

    for (const level of levels) {
      console.log(`\n🔄 Processing Level ${level.level}...`);
      
      // Find the center node
      const centerNode = level.nodes.find(node => node.id === 'center');
      if (!centerNode) {
        console.log(`⚠️  No center node found in Level ${level.level}, skipping...`);
        continue;
      }

      // Update the socket distribution - move USDT from right to left
      const newSocketDistribution = {
        'top': ['btc', 'eth'],      // 2 networks on top
        'left': ['usdt'],           // 1 network on left (USDT moved here)
        'right': ['sol'],           // 1 network on right (only SOL now)
        'bottom': ['bnb', 'trx']    // 2 networks on bottom
      };

      // Update the center node's handles
      const newSources = [];
      
      // Add networks to their assigned sockets
      Object.entries(newSocketDistribution).forEach(([position, networks]) => {
        networks.forEach(networkId => {
          newSources.push({
            id: networkId,
            position: position
          });
        });
      });

      // Update the center node
      centerNode.data.handles.sources = newSources;

      // Update USDT node position to be on the left side
      const usdtNode = level.nodes.find(node => node.id === 'usdt');
      if (usdtNode) {
        usdtNode.position = { x: 100, y: 400 }; // Left side of user node
        console.log(`   Moved USDT to left side: x=100, y=400`);
      }

      // Update SOL node position to be centered on the right side
      const solNode = level.nodes.find(node => node.id === 'sol');
      if (solNode) {
        solNode.position = { x: 500, y: 400 }; // Right side of user node
        console.log(`   Centered SOL on right side: x=500, y=400`);
      }

      // Update edges to use the correct sourceHandle
      level.edges.forEach(edge => {
        if (edge.source === 'center') {
          // Find which socket this target network is assigned to
          const socketEntry = Object.entries(newSocketDistribution).find(([pos, networks]) => 
            networks.includes(edge.target)
          );
          
          if (socketEntry) {
            edge.sourceHandle = edge.target; // Keep the network ID as sourceHandle
          }
        }
      });

      // Save the updated level
      await level.save();
      console.log(`✅ Level ${level.level} updated successfully`);
      console.log(`   New socket distribution:`);
      Object.entries(newSocketDistribution).forEach(([position, networks]) => {
        if (networks.length > 0) {
          console.log(`     ${position}: ${networks.join(', ')}`);
        }
      });
    }

    console.log('\n🎉 All levels updated successfully!');

  } catch (error) {
    console.error('❌ Error updating USDT position:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixUSDTPosition();
