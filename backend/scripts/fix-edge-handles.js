import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Level from '../models/level.model.js';

async function fixEdgeHandles() {
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

      // Update edges from center to crypto nodes
      level.edges.forEach(edge => {
        if (edge.source === 'center') {
          // Set the sourceHandle to match the target network ID
          edge.sourceHandle = edge.target;
          console.log(`   Fixed edge: ${edge.id} -> sourceHandle: ${edge.sourceHandle}`);
        }
      });

      // Save the updated level
      await level.save();
      console.log(`✅ Level ${level.level} edges updated successfully`);
    }

    console.log('\n🎉 All edge handles fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing edge handles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixEdgeHandles();
