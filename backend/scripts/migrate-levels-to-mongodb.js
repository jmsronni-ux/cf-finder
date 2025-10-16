import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../database/mongodb.js';
import Level from '../models/level.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Level names mapping
const levelNames = {
  1: 'Basic',
  2: 'Standard', 
  3: 'Professional',
  4: 'Enterprise',
  5: 'Premium'
};

const migrateLevels = async () => {
  try {
    console.log('🚀 Starting migration of level data to MongoDB...');
    
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Clear existing levels (optional - remove this if you want to keep existing data)
    await Level.deleteMany({});
    console.log('🗑️  Cleared existing level data');
    
    // Migrate each level
    for (let i = 1; i <= 5; i++) {
      const levelFile = path.join(__dirname, '../../frontend/src/data', `level-${i === 1 ? 'one' : i === 2 ? 'two' : i === 3 ? 'three' : i === 4 ? 'four' : 'five'}.json`);
      
      if (fs.existsSync(levelFile)) {
        console.log(`📄 Reading level ${i} data from ${levelFile}`);
        
        const levelData = JSON.parse(fs.readFileSync(levelFile, 'utf8'));
        
        // Transform the data to match our schema
        const levelDoc = {
          level: i,
          name: levelNames[i] || `Level ${i}`,
          description: `Animation level ${i} - ${levelNames[i] || `Level ${i}`}`,
          nodes: levelData.nodes || [],
          edges: levelData.edges || []
        };
        
        // Save to MongoDB
        const savedLevel = await Level.create(levelDoc);
        console.log(`✅ Level ${i} (${savedLevel.name}) saved to MongoDB with ${savedLevel.nodes.length} nodes and ${savedLevel.edges.length} edges`);
      } else {
        console.log(`⚠️  Level ${i} file not found: ${levelFile}`);
      }
    }
    
    // Verify migration
    const totalLevels = await Level.countDocuments();
    console.log(`\n🎉 Migration completed! Total levels in database: ${totalLevels}`);
    
    // List all levels
    const levels = await Level.find({}).select('level name nodes edges.metadata.createdAt');
    console.log('\n📋 Levels in database:');
    levels.forEach(level => {
      console.log(`  - Level ${level.level}: ${level.name} (${level.nodes.length} nodes, ${level.edges.length} edges)`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
};

// Run migration
migrateLevels();
