import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Level from '../models/level.model.js';

async function recreateLevel1FromJSON() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Read the level-one.json file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const jsonPath = path.join(__dirname, '../../frontend/src/data/level-one.json');
    
    console.log('📖 Reading level-one.json file...');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('✅ JSON file read successfully');
    console.log(`   Nodes: ${jsonData.nodes.length}`);
    console.log(`   Edges: ${jsonData.edges.length}`);

    // Transform the JSON data to match database schema
    const level1Data = {
      level: 1,
      name: "Basic",
      description: "Animation level 1 - Basic",
      nodes: jsonData.nodes.map(node => ({
        id: node.id,
        type: node.type,
        data: {
          label: node.data.label,
          logo: node.data.logo,
          handles: node.data.handles,
          transaction: node.data.transaction || undefined,
          pending: node.data.pending || 0,
          level: node.data.level || 1, // Ensure all fingerprint nodes are level 1
          // Add any additional fields that might be needed
          selected: node.selected || false,
          isVisible: node.isVisible !== undefined ? node.isVisible : true,
          hasStarted: node.hasStarted || false
        },
        position: {
          x: node.position.x,
          y: node.position.y
        },
        style: node.style || {
          width: 64,
          height: 64
        }
      })),
      edges: jsonData.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.animated,
        style: edge.style
      })),
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

    // Show some sample nodes
    console.log('🔍 Sample nodes:');
    createdLevel1.nodes.slice(0, 3).forEach((node, index) => {
      console.log(`   Node ${index + 1}: ${node.id} (${node.type}) - Level: ${node.data.level}`);
    });

    console.log('🎉 Level 1 recreation completed successfully!');

  } catch (error) {
    console.error('❌ Error recreating Level 1:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
recreateLevel1FromJSON();
