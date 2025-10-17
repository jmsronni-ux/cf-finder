import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { MONGO_URI } from '../config/env.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

// Connect to MongoDB to get a test token
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// User schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  balance: Number,
  tier: Number,
  lvl1anim: Number,
  lvl2anim: Number,
  lvl3anim: Number,
  lvl4anim: Number,
  lvl5anim: Number,
  lvl1NetworkRewards: {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
    TRON: { type: Number, default: 0 },
    USDT: { type: Number, default: 0 },
    BNB: { type: Number, default: 0 },
    SOL: { type: Number, default: 0 }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function testActualEndpointCall() {
  try {
    await connectDB();
    
    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    
    console.log('=== Testing Actual Endpoint Call ===');
    console.log('User:', user.name, user.email);
    console.log('User ID:', user._id);
    
    // Create a JWT token for the user
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('Generated token:', token.substring(0, 50) + '...');
    
    // Test the endpoint locally
    const response = await fetch('http://localhost:3000/user/mark-animation-watched', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ level: 1 })
    });
    
    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
  } catch (error) {
    console.error('Error testing actual endpoint call:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testActualEndpointCall();
