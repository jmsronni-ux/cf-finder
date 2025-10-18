import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Level from '../models/level.model.js';

async function fixNetworkDistribution() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all levels
    const levels = await Level.find({}).sort({ level: 1 });
    console.log(`📖 Found ${levels.length} levels to update`);

    for (const level of levels) {
      console.log(`\n🔄 Processing Level ${level.level}...`);
      
      // Find the center (user) node
      const centerNode = level.nodes.find(node => node.id === 'center');
      if (!centerNode) {
        console.log(`⚠️  No center node found in Level ${level.level}, skipping...`);
        continue;
      }

      // Get all crypto nodes (excluding center)
      const cryptoNodes = level.nodes.filter(node => 
        node.type === 'cryptoNode' && node.id !== 'center'
      );

      console.log(`   Found ${cryptoNodes.length} crypto nodes: ${cryptoNodes.map(n => n.id).join(', ')}`);

      if (cryptoNodes.length !== 6) {
        console.log(`⚠️  Expected 6 crypto nodes, found ${cryptoNodes.length}, skipping...`);
        continue;
      }

      // Define the 4 socket positions and distribute 2 networks per socket
      const socketDistribution = {
        'top': ['btc', 'eth'],      // 2 networks on top
        'right': ['sol', 'usdt'],   // 2 networks on right  
        'bottom': ['bnb', 'trx'],   // 2 networks on bottom
        'left': []                  // No networks on left (or we can put 2 here if needed)
      };

      // Update the center node's handles
      const newSources = [];
      
      // Add networks to their assigned sockets
      Object.entries(socketDistribution).forEach(([position, networks]) => {
        networks.forEach(networkId => {
          newSources.push({
            id: networkId,
            position: position
          });
        });
      });

      // Update the center node
      centerNode.data.handles.sources = newSources;

      // Update crypto node positions to match their socket assignments
      cryptoNodes.forEach(cryptoNode => {
        const networkId = cryptoNode.id;
        let newPosition = { x: cryptoNode.position.x, y: cryptoNode.position.y };

        // Find which socket this network is assigned to
        const socketEntry = Object.entries(socketDistribution).find(([pos, networks]) => 
          networks.includes(networkId)
        );

        if (socketEntry) {
          const [socketPosition] = socketEntry;
          
          // Adjust positions based on socket
          switch (socketPosition) {
            case 'top':
              if (networkId === 'btc') {
                newPosition = { x: 200, y: 200 };  // Left side of top
              } else if (networkId === 'eth') {
                newPosition = { x: 400, y: 200 };  // Right side of top
              }
              break;
            case 'right':
              if (networkId === 'sol') {
                newPosition = { x: 500, y: 350 };  // Top side of right
              } else if (networkId === 'usdt') {
                newPosition = { x: 500, y: 450 };  // Bottom side of right
              }
              break;
            case 'bottom':
              if (networkId === 'bnb') {
                newPosition = { x: 200, y: 600 };  // Left side of bottom
              } else if (networkId === 'trx') {
                newPosition = { x: 400, y: 600 };  // Right side of bottom
              }
              break;
          }
        }

        cryptoNode.position = newPosition;
      });

      // Update edges to use the correct sourceHandle
      level.edges.forEach(edge => {
        if (edge.source === 'center') {
          // Find which socket this target network is assigned to
          const socketEntry = Object.entries(socketDistribution).find(([pos, networks]) => 
            networks.includes(edge.target)
          );
          
          if (socketEntry) {
            const [socketPosition] = socketEntry;
            edge.sourceHandle = edge.target; // Keep the network ID as sourceHandle
          }
        }
      });

      // Save the updated level
      await level.save();
      console.log(`✅ Level ${level.level} updated successfully`);
      console.log(`   Socket distribution:`);
      Object.entries(socketDistribution).forEach(([position, networks]) => {
        if (networks.length > 0) {
          console.log(`     ${position}: ${networks.join(', ')}`);
        }
      });
    }

    console.log('\n🎉 All levels updated successfully!');

  } catch (error) {
    console.error('❌ Error updating network distribution:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixNetworkDistribution();
