import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Level from '../models/level.model.js';

async function checkLevelStructure() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get Level 1
    const level1 = await Level.findOne({ level: 1 });
    
    if (!level1) {
      console.log('❌ Level 1 not found');
      return;
    }

    console.log('🔍 Level 1 Structure:');
    console.log(`   Level: ${level1.level}`);
    console.log(`   Name: ${level1.name}`);
    
    // Check center node
    const centerNode = level1.nodes.find(node => node.id === 'center');
    if (centerNode) {
      console.log('\n📍 Center Node Handles:');
      console.log('   Sources:', JSON.stringify(centerNode.data.handles.sources, null, 2));
    }

    // Check crypto nodes positions
    console.log('\n🪙 Crypto Nodes Positions:');
    const cryptoNodes = level1.nodes.filter(node => node.type === 'cryptoNode' && node.id !== 'center');
    cryptoNodes.forEach(node => {
      console.log(`   ${node.id}: x=${node.position.x}, y=${node.position.y}`);
    });

    // Check edges
    console.log('\n🔗 Edges from Center:');
    const centerEdges = level1.edges.filter(edge => edge.source === 'center');
    centerEdges.forEach(edge => {
      console.log(`   ${edge.id}: ${edge.source} -> ${edge.target} (handle: ${edge.sourceHandle})`);
    });

  } catch (error) {
    console.error('❌ Error checking level structure:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
checkLevelStructure();
