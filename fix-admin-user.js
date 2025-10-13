// Quick script to fix the admin user
// Run this from the backend directory: node ../fix-admin-user.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function fixAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Remove the incorrect field with a space
    console.log('\nRemoving incorrect "isAdmin " field (with space)...');
    const removeResult = await usersCollection.updateOne(
      { email: 'test@example.com' },
      { $unset: { 'isAdmin ': '' } }
    );
    console.log('Removed field:', removeResult.modifiedCount > 0 ? '✓' : '✗');

    // Add the correct field with boolean value
    console.log('\nAdding correct "isAdmin" field (boolean)...');
    const addResult = await usersCollection.updateOne(
      { email: 'test@example.com' },
      { $set: { isAdmin: true } }
    );
    console.log('Added field:', addResult.modifiedCount > 0 ? '✓' : '✗');

    // Verify the change
    console.log('\nVerifying user document...');
    const user = await usersCollection.findOne({ email: 'test@example.com' });
    console.log('\nUser isAdmin field:', user.isAdmin);
    console.log('Type:', typeof user.isAdmin);
    console.log('Has space field:', 'isAdmin ' in user);

    if (user.isAdmin === true) {
      console.log('\n✅ SUCCESS! Admin field is now correctly set.');
    } else {
      console.log('\n❌ FAILED! Please check manually.');
    }

    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdminUser();



