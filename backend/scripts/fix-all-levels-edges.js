import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import Level from '../models/level.model.js';

async function fixAllLevelsEdges() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all levels
    const levels = await Level.find({}).sort({ level: 1 });
    console.log(`📖 Found ${levels.length} levels to update`);

    for (const level of levels) {
      console.log(`\n🔄 Processing Level ${level.level}...`);
      
      let fixedCount = 0;
      
      level.edges.forEach(edge => {
        if (edge.source === 'center' && !edge.sourceHandle) {
          edge.sourceHandle = edge.target;
          fixedCount++;
          console.log(`   Fixed: ${edge.id} -> sourceHandle: ${edge.sourceHandle}`);
        }
      });

      if (fixedCount > 0) {
        await level.save();
        console.log(`✅ Level ${level.level}: Fixed ${fixedCount} edges`);
      } else {
        console.log(`✅ Level ${level.level}: All edges already have proper sourceHandle values`);
      }
    }

    console.log('\n🎉 All levels processed successfully!');

  } catch (error) {
    console.error('❌ Error fixing all levels edges:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixAllLevelsEdges();
