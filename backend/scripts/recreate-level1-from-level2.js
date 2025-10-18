import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';

// Import the Level model
const LevelSchema = new mongoose.Schema({
  level: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  nodes: [{
    id: String,
    type: String,
    data: mongoose.Schema.Types.Mixed,
    position: {
      x: Number,
      y: Number
    }
  }],
  edges: [{
    id: String,
    source: String,
    target: String,
    animated: Boolean,
    style: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    version: String,
    createdAt: Date,
    updatedAt: Date
  }
});

const Level = mongoose.model('Level', LevelSchema);

async function recreateLevel1FromLevel2() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get Level 2 data
    console.log('📖 Fetching Level 2 data...');
    const level2 = await Level.findOne({ level: 2 });
    
    if (!level2) {
      console.error('❌ Level 2 not found in database');
      return;
    }

    console.log('✅ Level 2 data found');
    console.log('🔍 Level 2 structure:');
    console.log(`   Level: ${level2.level}`);
    console.log(`   Name: ${level2.name}`);
    console.log(`   Keys: ${Object.keys(level2.toObject())}`);
    
    // Check if nodes exist in the document
    const level2Obj = level2.toObject();
    console.log(`   Has nodes field: ${level2Obj.hasOwnProperty('nodes')}`);
    console.log(`   Nodes type: ${typeof level2Obj.nodes}`);
    console.log(`   Nodes length: ${level2Obj.nodes ? level2Obj.nodes.length : 'undefined'}`);
    console.log(`   Edges length: ${level2Obj.edges ? level2Obj.edges.length : 'undefined'}`);

    if (!level2Obj.nodes || !Array.isArray(level2Obj.nodes)) {
      console.error('❌ Level 2 nodes field is missing or not an array');
      console.log('Available fields:', Object.keys(level2Obj));
      return;
    }

    // Create Level 1 data based on Level 2
    const level1Data = {
      level: 1,
      name: "Basic",
      description: "Animation level 1 - Basic",
      nodes: level2Obj.nodes.map(node => {
        return {
          ...node,
          _id: new mongoose.Types.ObjectId(), // Generate new ObjectId
          data: {
            ...node.data,
            // Reset fingerprint levels to 1 for Level 1
            ...(node.data.level && { level: 1 })
          }
        };
      }),
      edges: level2Obj.edges.map(edge => {
        return {
          ...edge,
          _id: new mongoose.Types.ObjectId() // Generate new ObjectId
        };
      }),
      metadata: {
        version: "1.0.0",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    // Check if Level 1 already exists
    const existingLevel1 = await Level.findOne({ level: 1 });
    
    if (existingLevel1) {
      console.log('⚠️  Level 1 already exists. Updating it...');
      await Level.findOneAndUpdate({ level: 1 }, level1Data, { new: true });
      console.log('✅ Level 1 updated successfully');
    } else {
      console.log('📝 Creating new Level 1...');
      const newLevel1 = new Level(level1Data);
      await newLevel1.save();
      console.log('✅ Level 1 created successfully');
    }

    // Verify the creation
    const createdLevel1 = await Level.findOne({ level: 1 });
    console.log('🔍 Verification:');
    console.log(`   Level: ${createdLevel1.level}`);
    console.log(`   Name: ${createdLevel1.name}`);
    console.log(`   Description: ${createdLevel1.description}`);
    console.log(`   Nodes count: ${createdLevel1.nodes.length}`);
    console.log(`   Edges count: ${createdLevel1.edges.length}`);
    console.log(`   Created at: ${createdLevel1.metadata.createdAt}`);

    console.log('🎉 Level 1 recreation completed successfully!');

  } catch (error) {
    console.error('❌ Error recreating Level 1:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
recreateLevel1FromLevel2();
