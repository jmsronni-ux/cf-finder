import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Level from '../models/level.model.js';

async function verifyAndFixEdges() {
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

    console.log('🔍 Current Level 1 Edges:');
    level1.edges.forEach(edge => {
      console.log(`   ${edge.id}: ${edge.source} -> ${edge.target} (sourceHandle: ${edge.sourceHandle})`);
    });

    console.log('\n🔧 Fixing edges...');
    let fixedCount = 0;
    
    level1.edges.forEach(edge => {
      if (edge.source === 'center' && !edge.sourceHandle) {
        edge.sourceHandle = edge.target;
        fixedCount++;
        console.log(`   Fixed: ${edge.id} -> sourceHandle: ${edge.sourceHandle}`);
      }
    });

    if (fixedCount > 0) {
      await level1.save();
      console.log(`\n✅ Fixed ${fixedCount} edges and saved to database`);
    } else {
      console.log('\n✅ All edges already have proper sourceHandle values');
    }

    // Verify the fix
    console.log('\n🔍 Verification - Updated Edges:');
    const updatedLevel1 = await Level.findOne({ level: 1 });
    updatedLevel1.edges.forEach(edge => {
      if (edge.source === 'center') {
        console.log(`   ${edge.id}: ${edge.source} -> ${edge.target} (sourceHandle: ${edge.sourceHandle})`);
      }
    });

  } catch (error) {
    console.error('❌ Error verifying and fixing edges:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
verifyAndFixEdges();
